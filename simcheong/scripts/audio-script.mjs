#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NARRATION } from '../src/data/narration.ts';
import TAGS from '../audio.tags.mjs';

/**
 * 붙여넣기용 녹음 대본을 만든다.
 *
 * 크레딧 없이 fish.audio 웹 UI에서 한 줄씩 생성할 때 쓴다. 대사·감정 태그·저장할
 * 파일 이름을 한 화면에 묶어 두므로, 창을 오가며 이름을 세지 않아도 된다.
 *
 *   node --experimental-strip-types scripts/audio-script.mjs
 *
 * 파일 이름은 `narration.ts`에서 만들어진다 — `tts.mjs`, `audio-manifest.mjs`와
 * 같은 규약이다. 손으로 적으면 어긋나고, 어긋나면 그 대목만 조용히 소리를 잃는다.
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');

/**
 * `--bare` 는 설명·표·머리말을 전부 빼고 저장할 파일 이름과 태그 붙은 대사만
 * 남긴다. 웹 UI에 한 줄씩 붙여넣을 때는 나머지가 전부 방해물이다.
 */
const bare = process.argv.includes('--bare');
const outPath = join(projectDir, 'docs', bare ? 'audio-script-bare.md' : 'audio-script.md');

const ACT_TITLES = {
  farewell: '제1막 · 곽씨부인 세상을 뜨다',
  growing: '제2막 · 동냥젖으로 자란 청이',
  vow: '제3막 · 공양미 삼백 석',
  merchants: '제4막 · 몸을 팔아 삼백 석',
  indangsu: '제5막 · 인당수에 몸을 던지다',
  dragonPalace: '제6막 · 수정궁, 어머니를 만나다',
  lotus: '제7막 · 연꽃으로 돌아오다',
  feast: '제8막 · 맹인잔치, 눈을 뜨다',
};

const REGISTER = {
  aniri: { label: '아니리', note: '말로 하는 대목. 눌러서 읽는다.' },
  changgeuk: { label: '창', note: '소리로 하는 대목. 감정을 싣는다.' },
  chuimsae: { label: '추임새', note: '고수가 던지는 짧은 받침.' },
};

const missing = [];
const lines = [];
let total = 0;

if (!bare) {
  lines.push('# 심청전 나레이션 녹음 대본');
  lines.push('');
  lines.push('> 이 문서는 `npm run audio:script`가 `src/data/narration.ts`와');
  lines.push('> `audio.tags.mjs`에서 생성한다. 직접 고치지 말고 원본을 고친 뒤 다시 돌린다.');
  lines.push('');
  lines.push('## 쓰는 법');
  lines.push('');
  lines.push('1. https://fish.audio 에서 모델을 **S2**로 고른다. 대괄호 태그는 S2 문법이다.');
  lines.push('   (S1을 골라야 한다면 웹 UI가 `[]`를 `()`로 알아서 바꿔 준다.)');
  lines.push('2. 아래 블록의 텍스트를 **태그까지 통째로** 붙여넣는다.');
  lines.push('3. 생성된 mp3를 적힌 이름 그대로 `simcheong/public/audio/` 에 저장한다.');
  lines.push('4. 다 되면 `npm run audio:manifest` — 파일을 훑어 재생용 매니페스트를 만든다.');
  lines.push('   일부만 있어도 된다. 없는 줄은 그 대목에서 소리 없이 지나간다.');
  lines.push('');
  lines.push('## 목소리');
  lines.push('');
  lines.push('세 register를 서로 다른 음성 모델로 받으면 판소리 구조가 귀로도 들린다.');
  lines.push('한 목소리로 전부 받으면 말과 소리의 낙차가 사라진다.');
  lines.push('');
  lines.push('| register | 줄 수 | 어떤 목소리 |');
  lines.push('|---|---|---|');

  const counts = {};
  for (const captions of Object.values(NARRATION)) {
    for (const caption of captions) {
      const style = caption.style ?? 'aniri';
      counts[style] = (counts[style] ?? 0) + 1;
    }
  }
  lines.push(`| 아니리 | ${counts.aniri ?? 0} | 이야기를 끌고 가는 담담한 낭독 |`);
  lines.push(`| 창 | ${counts.changgeuk ?? 0} | 감정이 실리는 대목. 우는 자리 |`);
  lines.push(`| 추임새 | ${counts.chuimsae ?? 0} | 고수가 툭 던지는 짧은 받침 |`);
  lines.push('');
  lines.push('---');
  lines.push('');
}

for (const [actId, captions] of Object.entries(NARRATION)) {
  if (!bare) {
    lines.push(`## ${ACT_TITLES[actId] ?? actId}`);
    lines.push('');
  }

  captions.forEach((caption, index) => {
    const style = caption.style ?? 'aniri';
    const file = `${actId}-${String(index).padStart(2, '0')}.mp3`;
    const key = `${actId}:${index}`;
    const tag = TAGS[key];
    total += 1;

    if (!tag) {
      missing.push(key);
      return;
    }

    // 자막의 \n은 화면 줄바꿈이다. 읽을 때는 숨을 한 번 쉬는 자리이지 문장의
    // 끝이 아니므로 공백으로 잇는다 — `tts.mjs`와 같은 처리다.
    const text = caption.text.replace(/\n/g, ' ').trim();
    const register = REGISTER[style] ?? REGISTER.aniri;

    if (bare) {
      lines.push(file);
      lines.push(`${tag} ${text}`);
      lines.push('');
      return;
    }

    lines.push(`### ${file}`);
    lines.push('');
    lines.push(`**${register.label}** — ${register.note}`);
    lines.push('');
    lines.push('```');
    lines.push(`${tag} ${text}`);
    lines.push('```');
    lines.push('');
  });
}

if (!bare) {
  lines.push('---');
  lines.push('');
  lines.push('## 다 받은 뒤');
  lines.push('');
  lines.push('```bash');
  lines.push('cd simcheong');
  lines.push('npm run audio:manifest   # 파일을 훑어 매니페스트 생성');
  lines.push('npm run dev              # 들어본다. M 키로 음소거 토글');
  lines.push('```');
  lines.push('');
}

if (missing.length > 0) {
  console.error(`감정 태그가 없는 자막 ${missing.length}줄: ${missing.join(', ')}`);
  console.error('audio.tags.mjs 에 채운 뒤 다시 돌린다.');
  process.exit(1);
}

const extra = Object.keys(TAGS).filter((key) => {
  const [actId, index] = key.split(':');
  return !NARRATION[actId]?.[Number(index)];
});
if (extra.length > 0) {
  console.error(`자막에 없는 태그 ${extra.length}개: ${extra.join(', ')}`);
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`대본 ${total}줄을 docs/${basename(outPath)} 에 썼다.`);
