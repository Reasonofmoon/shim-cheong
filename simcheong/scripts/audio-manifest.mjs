#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NARRATION } from '../src/data/narration.ts';

/**
 * 손으로 만든 음성 파일에서 매니페스트를 세운다.
 *
 * 크레딧 없이 fish.audio 웹 UI에 대사를 하나씩 붙여넣어 받은 mp3를
 * `public/audio/`에 규약대로 저장했을 때, 재생기가 읽을 매니페스트를 만든다.
 * API를 부르지 않으므로 키가 필요 없다.
 *
 *   node --experimental-strip-types scripts/audio-manifest.mjs
 *
 * 파일명 규약은 `scripts/tts.mjs`와 같다: `<actId>-<두 자리 인덱스>.mp3`.
 * 자막 데이터에서 이름을 만들기 때문에 손으로 셀 필요가 없다 —
 * `npm run audio:script`가 뽑아 주는 문서에 저장할 이름이 줄마다 적혀 있다.
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const outDir = join(projectDir, 'public', 'audio');
const manifestPath = join(outDir, 'manifest.json');

const expected = [];
for (const [actId, captions] of Object.entries(NARRATION)) {
  captions.forEach((caption, index) => {
    expected.push({
      id: `${actId}:${caption.at}`,
      actId,
      style: caption.style ?? 'aniri',
      file: `${actId}-${String(index).padStart(2, '0')}.mp3`,
      // 손으로 만든 클립은 어떤 API 파라미터로 만들어졌는지 알 수 없다. 대신
      // **대사 자체**를 해시해 둔다. 자막을 고치면 이 값이 바뀌므로,
      // `audio:check`가 "자막은 고쳤는데 음성은 옛것" 상태를 잡을 수 있다.
      hash: createHash('sha256').update(caption.text).digest('hex').slice(0, 12),
    });
  });
}

mkdirSync(outDir, { recursive: true });

const present = new Set(readdirSync(outDir).filter((f) => f.endsWith('.mp3')));
const manifest = {
  version: 1,
  source: 'manual',
  generatedAt: new Date().toISOString(),
  clips: {},
};

const missing = [];
let bytes = 0;

for (const clip of expected) {
  if (!present.has(clip.file)) {
    missing.push(clip);
    continue;
  }
  const size = statSync(join(outDir, clip.file)).size;
  if (size < 1024) {
    // 1 KB도 안 되는 mp3는 소리가 아니라 사고다. 매니페스트에 넣으면 그
    // 대목만 조용히 침묵하는데, 화면만 봐서는 알 수 없다.
    missing.push({ ...clip, note: `${size} B — 너무 작다` });
    continue;
  }
  bytes += size;
  manifest.clips[clip.id] = {
    file: clip.file,
    style: clip.style,
    hash: clip.hash,
    source: 'manual',
  };
}

const orphans = [...present].filter(
  (file) => !expected.some((clip) => clip.file === file),
);

const written = Object.keys(manifest.clips).length;
console.log(`자막 ${expected.length}줄 / 음성 있음 ${written}줄`);
console.log(`합계 ${(bytes / 1024 / 1024).toFixed(2)} MB`);

if (orphans.length > 0) {
  console.log(`\n자막에 없는 파일 ${orphans.length}개 (매니페스트에 넣지 않음):`);
  for (const file of orphans) console.log(`  ${file}`);
}

if (missing.length > 0) {
  console.log(`\n아직 없는 음성 ${missing.length}줄:`);
  for (const clip of missing) {
    console.log(`  ${clip.file}  [${clip.style}]${clip.note ? `  ${clip.note}` : ''}`);
  }
}

if (written === 0) {
  console.error('\n음성 파일이 하나도 없다. 매니페스트를 쓰지 않는다.');
  process.exit(1);
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`\n매니페스트를 썼다: public/audio/manifest.json`);

// 일부만 있어도 매니페스트는 쓴다 — 있는 대목은 들리고 없는 대목은 조용히
// 넘어간다. 다만 종료 코드로는 미완성임을 알린다.
if (missing.length > 0) {
  console.log('빠진 줄은 그 대목에서 소리 없이 지나간다. 채운 뒤 다시 돌리면 된다.');
  process.exit(existsSync(manifestPath) ? 0 : 1);
}
