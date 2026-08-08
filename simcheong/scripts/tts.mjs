#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../audio.config.mjs';
import { NARRATION } from '../src/data/narration.ts';

/**
 * 나레이션 음성 생성.
 *
 * 이 사이트는 GitHub Pages 정적 호스팅이라 서버가 없다. 브라우저에서 TTS API를
 * 부르면 키가 번들에 들어가고, 공개 저장소이므로 그 키는 그대로 공개된다.
 * 그래서 음성은 **로컬에서 미리 만들어 커밋한다.** 키는 이 스크립트를 돌리는
 * 사람의 기계에만 있고, CI에도 브라우저에도 가지 않는다.
 *
 *   node --experimental-strip-types scripts/tts.mjs          # 바뀐 것만
 *   node --experimental-strip-types scripts/tts.mjs --force  # 전부 다시
 *   node --experimental-strip-types scripts/tts.mjs --dry    # 호출 없이 계획만
 *   node --experimental-strip-types scripts/tts.mjs --check  # 최신인지만 확인 (키 불필요)
 *
 * 자막은 `src/data/narration.ts`가 단일 출처다. Node가 그 파일을 직접 읽으므로
 * 자막과 음성이 어긋날 수 없다 — 대사를 고치면 해시가 바뀌고 그 줄만 다시 만든다.
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const outDir = join(projectDir, 'public', 'audio');
const manifestPath = join(outDir, 'manifest.json');

const ENDPOINT = 'https://api.fish.audio/v1/tts';
/** 동시 호출 수. 올려도 빨라지지 않고 429만 는다. */
const CONCURRENCY = 3;
const MAX_RETRIES = 4;

const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry');
const checkOnly = process.argv.includes('--check');

// ---------------------------------------------------------------- 키 ------

/**
 * 키는 환경변수나 gitignore된 로컬 파일에서만 읽는다. 이 스크립트는 키를
 * 출력하지 않으며, 실패 메시지에도 값을 담지 않는다.
 *
 * Windows 사용자 환경변수로 저장한 경우 주의점이 하나 있다. 프로세스는 부모의
 * 환경을 물려받으므로, **이미 떠 있던 터미널이나 그 자식 프로세스는 새로 설정한
 * 사용자 변수를 보지 못한다.** 레지스트리를 다시 읽지 않기 때문이다. 새 창을
 * 열거나, 다음처럼 그 자리에서 끌어와 넘긴다.
 *
 *   $env:FISH_API_KEY = [Environment]::GetEnvironmentVariable('FISH_API_KEY','User')
 *   npm run audio:generate
 */
const KEY_ENV_VARS = ['FISH_API_KEY', 'FISH_AUDIO_API_KEY'];

function readApiKey() {
  for (const name of KEY_ENV_VARS) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }

  const keyFile = join(projectDir, '.fish-audio-key');
  if (existsSync(keyFile)) {
    const fromFile = readFileSync(keyFile, 'utf8').trim();
    if (fromFile) return fromFile;
  }
  return null;
}

// ------------------------------------------------------------ 클립 목록 ----

/**
 * 자막을 클립으로 편다.
 *
 * `id`는 `<actId>:<at>`이다. 재생 쪽이 자막을 순회하며 같은 키로 클립을 찾으므로,
 * 이 규약이 어긋나면 소리가 조용히 사라진다 — 그래서 양쪽 다 이 한 줄에서만
 * 만들어진다.
 */
function collectClips() {
  const clips = [];
  for (const [actId, captions] of Object.entries(NARRATION)) {
    captions.forEach((caption, index) => {
      const style = caption.style ?? 'aniri';
      const voice = config.voices[style];
      if (!voice) throw new Error(`no voice configured for style "${style}"`);

      // 자막은 화면 줄바꿈용으로 \n을 쓴다. 읽을 때는 숨을 한 번 쉬는 자리이지
      // 문장의 끝이 아니므로 마침표가 아니라 공백으로 잇는다.
      const text = caption.text.replace(/\n/g, ' ').trim();

      // 내용 주소화: 대사나 그 목소리 설정이 바뀌면 해시가 바뀌고 그 줄만
      // 다시 만든다. 자막 한 줄 고치자고 67줄을 다시 생성할 이유가 없다.
      const hash = createHash('sha256')
        .update(JSON.stringify([text, style, voice, config.model, config.format, config.mp3Bitrate]))
        .digest('hex')
        .slice(0, 12);

      // 웹 UI에서 손으로 받은 클립은 어떤 API 파라미터로 만들어졌는지 알 수
      // 없다. 그쪽 매니페스트(`audio-manifest.mjs`)는 대사 자체를 해시해 두므로,
      // 비교할 때도 같은 값을 써야 한다. 안 그러면 손으로 만든 67줄이 매번
      // "낡았다"고 잡혀 게이트가 의미를 잃는다.
      const textHash = createHash('sha256').update(caption.text).digest('hex').slice(0, 12);

      clips.push({
        id: `${actId}:${caption.at}`,
        actId,
        style,
        text,
        hash,
        textHash,
        file: `${actId}-${String(index).padStart(2, '0')}.${config.format}`,
      });
    });
  }
  return clips;
}

// --------------------------------------------------------------- 생성 ------

async function synthesize(clip, apiKey) {
  const voice = config.voices[clip.style];

  const body = {
    text: clip.text,
    format: config.format,
    mp3_bitrate: config.mp3Bitrate,
    temperature: voice.temperature,
    top_p: voice.topP,
    prosody: { speed: voice.speed, volume: voice.volume },
    // 한 줄이 52자를 넘지 않으므로 청크가 갈릴 일이 없다. 그래도 명시해 둔다 —
    // 청크가 갈리면 이어붙는 자리에서 억양이 튄다.
    chunk_length: 300,
    normalize: true,
    ...(voice.referenceId ? { reference_id: voice.referenceId } : {}),
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: config.model,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    // 401/403은 재시도해봐야 같다. 키 문제이므로 즉시 멈춘다.
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `인증 실패 (${response.status}). FISH_AUDIO_API_KEY 또는 .fish-audio-key를 확인한다.`,
      );
    }
    // 402는 크레딧 소진. 이것도 재시도가 의미 없다.
    if (response.status === 402) {
      throw new Error('크레딧 부족 (402). fish.audio에서 잔액을 확인한다.');
    }

    const retriable = response.status === 429 || response.status >= 500;
    if (!retriable || attempt === MAX_RETRIES) {
      const detail = await response.text().catch(() => '');
      throw new Error(`${response.status} ${response.statusText} ${detail.slice(0, 200)}`);
    }

    const wait = 2 ** attempt * 500;
    console.log(`    ${response.status} — ${wait}ms 후 재시도 (${attempt}/${MAX_RETRIES - 1})`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error('unreachable');
}

/** 고정 폭 워커 풀. Promise.all에 67개를 한 번에 던지면 전부 429가 난다. */
async function pool(items, width, worker) {
  const queue = [...items];
  const failures = [];
  await Promise.all(
    Array.from({ length: Math.min(width, queue.length) }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          await worker(item);
        } catch (error) {
          failures.push({ item, error });
        }
      }
    }),
  );
  return failures;
}

// ---------------------------------------------------------------- main ----

const clips = collectClips();
const previous = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { clips: {} };

const stale = clips.filter((clip) => {
  if (force) return true;
  const known = previous.clips?.[clip.id];
  if (!known) return true;
  if (!existsSync(join(outDir, clip.file))) return true;
  // 손으로 받은 클립은 대사 해시로, API로 만든 클립은 파라미터까지 포함한
  // 해시로 비교한다.
  const expected = known.source === 'manual' ? clip.textHash : clip.hash;
  return known.hash !== expected;
});

console.log(`자막 ${clips.length}줄 / 생성 대상 ${stale.length}줄`);
const byStyle = clips.reduce((acc, c) => ({ ...acc, [c.style]: (acc[c.style] ?? 0) + 1 }), {});
console.log(`스타일 분포: ${JSON.stringify(byStyle)}`);

for (const [style, voice] of Object.entries(config.voices)) {
  if (!voice.referenceId) {
    console.log(
      `  주의: "${style}"에 referenceId가 없다 — 기본 음성이 쓰이므로 세 목소리가 같아진다.`,
    );
  }
}

// --check 는 CI용이다. 키가 없어도 돌고, 자막을 고치고 음성 재생성을 잊었을 때
// 조용히 배포되는 것을 막는다 — 그 경우 사이트는 그 대목에서 말을 잃거나
// 옛 대사를 읽는데, 둘 다 화면만 봐서는 알 수 없다.
if (checkOnly) {
  // 매니페스트가 아예 없으면 아직 음성을 안 쓰는 것이다. 그건 드리프트가 아니라
  // 선택이므로 통과시킨다 — 이 게이트가 막을 것은 "자막은 고쳤는데 음성은
  // 옛것인" 상태이지 "음성이 없는" 상태가 아니다.
  if (!existsSync(manifestPath)) {
    console.log('음성 매니페스트가 없다 — 나레이션 음성을 쓰지 않는 상태다.');
    process.exit(0);
  }

  // 같은 이유로 "아직 녹음하지 않은 줄"도 실패가 아니다. 웹 UI에서 한 줄씩
  // 받는 동안 매니페스트는 계속 부분 상태이고, 재생기는 없는 줄을 조용히
  // 넘어간다. 잡아야 할 것은 **매니페스트에 있는데 대사가 그 뒤로 바뀐** 줄뿐이다.
  const drifted = stale.filter((clip) => previous.clips?.[clip.id]);
  const unrecorded = stale.length - drifted.length;

  if (unrecorded > 0) {
    console.log(`아직 녹음하지 않은 줄 ${unrecorded}개 — 그 대목은 소리 없이 지나간다.`);
  }
  if (drifted.length === 0) {
    console.log('녹음된 음성은 모두 자막과 일치한다.');
    process.exit(0);
  }

  console.error(`\n자막이 바뀌었는데 음성이 옛것인 줄 ${drifted.length}개:`);
  for (const clip of drifted) console.error(`  ${clip.file}  "${clip.text}"`);
  console.error('\n해당 줄을 다시 받아 저장한 뒤 npm run audio:manifest 를 돌린다.');
  console.error('(API 크레딧이 있다면 npm run audio:generate 로 한 번에 처리된다.)');
  process.exit(1);
}

if (dryRun) {
  for (const clip of stale) console.log(`  [dry] ${clip.file}  ${clip.style}  "${clip.text}"`);
  process.exit(0);
}

if (stale.length === 0) {
  console.log('모두 최신 상태다.');
  process.exit(0);
}

const apiKey = readApiKey();
if (!apiKey) {
  console.error(
    [
      'Fish Audio API 키를 찾지 못했다. 확인한 곳:',
      `  - 환경변수 ${KEY_ENV_VARS.join(', ')}`,
      '  - simcheong/.fish-audio-key',
      '',
      '사용자 환경변수에 저장해 뒀는데도 이 메시지가 나온다면, 이 프로세스가',
      '변수를 설정하기 전의 환경을 물려받은 것이다. 그 자리에서 끌어와 넘긴다:',
      '',
      "  $env:FISH_API_KEY = [Environment]::GetEnvironmentVariable('FISH_API_KEY','User')",
      '  npm run audio:generate',
      '',
      '아직 키가 없다면 https://fish.audio/go-api 에서 만든다.',
    ].join('\n'),
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

let done = 0;
const failures = await pool(stale, CONCURRENCY, async (clip) => {
  const audio = await synthesize(clip, apiKey);
  writeFileSync(join(outDir, clip.file), audio);
  done += 1;
  const kb = (audio.byteLength / 1024).toFixed(0);
  console.log(`  [${done}/${stale.length}] ${clip.file}  ${clip.style}  ${kb} KB`);
});

// 매니페스트는 성공한 것만 담는다. 실패한 줄이 최신인 척하면 다음 실행이
// 그 줄을 건너뛰고, 사이트는 그 대목에서 조용히 말을 잃는다.
const manifest = {
  version: 1,
  model: config.model,
  format: config.format,
  generatedAt: new Date().toISOString(),
  clips: {},
};
for (const clip of clips) {
  const wrote = !failures.some((f) => f.item.id === clip.id);
  const carried = previous.clips?.[clip.id];
  if (stale.includes(clip)) {
    if (wrote) manifest.clips[clip.id] = { file: clip.file, style: clip.style, hash: clip.hash };
    else if (carried) manifest.clips[clip.id] = carried;
  } else if (carried) {
    manifest.clips[clip.id] = carried;
  }
}

// 자막에서 사라진 대사의 음성 파일은 지운다. 안 그러면 저장소가 유령 mp3로 찬다.
const live = new Set(Object.values(manifest.clips).map((c) => c.file));
for (const file of readdirSync(outDir)) {
  if (file.endsWith(`.${config.format}`) && !live.has(file)) {
    unlinkSync(join(outDir, file));
    console.log(`  삭제(자막에 없음): ${file}`);
  }
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`\n생성 ${done}줄, 매니페스트 ${Object.keys(manifest.clips).length}줄`);
if (failures.length > 0) {
  console.error(`실패 ${failures.length}줄:`);
  for (const { item, error } of failures) console.error(`  ${item.file}: ${error.message}`);
  process.exit(1);
}
