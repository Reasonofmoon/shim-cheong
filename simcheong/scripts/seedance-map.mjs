#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NARRATION } from '../src/data/narration.ts';

/**
 * Seedance 클립과 판소리 사설을 잇는 편집 지도를 만든다.
 *
 *   node --experimental-strip-types scripts/seedance-map.mjs
 *
 * 왜 필요한가: 영상은 20초 고정 블록으로 생성되는데 사설은 그 격자를 모른다.
 * 어느 클립이 어느 줄을 덮는지 손으로 세면 반드시 어긋나고, 어긋나면 그림과
 * 말이 따로 노는데 **재생해 보기 전에는 알 수 없다.** 그래서 `narration.ts`에서
 * 계산한다.
 *
 * 컷은 사설 중간에 떨어져도 된다. 내레이션은 별도 오디오 트랙으로 위에 얹히므로
 * 영상 컷이 문장을 가로질러도 정상이다. 지켜야 하는 것은 하나뿐 —
 * **그 시간에 나오는 그림이 그 시간에 하는 말과 맞을 것.**
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const outPath = join(projectDir, 'docs', 'seedance-edit-map.md');

/** 생성 클립 길이. Seedance 2.5 고정값. */
const CLIP = 20;

/** 막 순서와 길이. `src/scenes/act0*.ts`의 DURATION과 같아야 한다. */
const ACTS = [
  { id: 'farewell', title: '곽씨부인 세상을 뜨다', duration: 54 },
  { id: 'growing', title: '동냥젖으로 자란 청이', duration: 50 },
  { id: 'vow', title: '공양미 삼백 석', duration: 50 },
  { id: 'merchants', title: '몸을 팔아 삼백 석', duration: 52 },
  { id: 'indangsu', title: '인당수에 몸을 던지다', duration: 56 },
  { id: 'dragonPalace', title: '수정궁, 어머니를 만나다', duration: 54 },
  { id: 'lotus', title: '연꽃으로 돌아오다', duration: 52 },
  { id: 'feast', title: '맹인잔치, 눈을 뜨다', duration: 78 },
];

const REGISTER = { aniri: '아니리', changgeuk: '창', chuimsae: '추임새' };

/** 초 → m:ss.s */
function clock(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

const blocks = [];
let blockNo = 0;
let timeline = 0;

for (const act of ACTS) {
  const captions = NARRATION[act.id];
  if (!captions) throw new Error(`자막에 없는 막: ${act.id}`);

  const count = Math.ceil(act.duration / CLIP);
  // 한 막의 클립들은 같은 길이로 쓴다. 버릴 몫을 한 클립에 몰면 그 클립의
  // 본동작까지 잘려 나간다 — 프롬프트의 마지막 4초(정지 상태)에서 조금씩
  // 나눠 가져오는 편이 안전하다.
  const used = act.duration / count;
  const trim = CLIP - used;

  for (let i = 0; i < count; i += 1) {
    blockNo += 1;
    const actIn = i * used;
    const actOut = actIn + used;

    // 이 클립이 화면에 있는 동안 들리는 사설. 겹치기만 하면 포함한다.
    const lines = captions
      .map((c, index) => ({ ...c, index }))
      .filter((c) => c.at < actOut && c.until > actIn)
      .map((c) => ({
        file: `${act.id}-${String(c.index).padStart(2, '0')}.mp3`,
        register: REGISTER[c.style ?? 'aniri'],
        at: c.at,
        until: c.until,
        text: c.text.replace(/\n/g, ' '),
        // 클립 경계를 넘어가는 줄은 편집에서 주의해야 한다. 그림이 바뀌는데
        // 말이 이어지는 자리라, 앞뒤 클립의 그림이 서로 어긋나면 즉시 티가 난다.
        straddles: c.at < actIn || c.until > actOut,
      }));

    blocks.push({
      no: blockNo,
      id: `B${String(blockNo).padStart(2, '0')}`,
      actId: act.id,
      actTitle: act.title,
      indexInAct: i + 1,
      countInAct: count,
      actIn,
      actOut,
      timelineIn: timeline + actIn,
      timelineOut: timeline + actOut,
      used,
      trim,
      lines,
    });
  }

  timeline += act.duration;
}

const generated = blocks.length * CLIP;
const discarded = generated - timeline;

const out = [];
out.push('# 심청전 — Seedance 클립 편집 지도');
out.push('');
out.push('> `npm run seedance:map`이 `src/data/narration.ts`에서 생성한다.');
out.push('> 직접 고치지 말고 원본을 고친 뒤 다시 돌린다.');
out.push('');
out.push('## 요약');
out.push('');
out.push(`| 항목 | 값 |`);
out.push(`|---|---|`);
out.push(`| 생성할 클립 | **${blocks.length}개** × ${CLIP}초 = ${generated}초 |`);
out.push(`| 최종 러닝타임 | **${clock(timeline)}** (${timeline}초) |`);
out.push(`| 버리는 분량 | ${discarded.toFixed(1)}초 (클립당 평균 ${(discarded / blocks.length).toFixed(1)}초) |`);
out.push('');
out.push('클립마다 **꼬리를 잘라** 쓴다. 프롬프트의 마지막 비트(16–20초)는 정지 상태를');
out.push('붙잡고 있는 구간이라 여기서 가져오면 본동작이 상하지 않는다.');
out.push('');
out.push('컷이 사설 중간에 떨어지는 것은 문제가 아니다 — 내레이션은 별도 트랙으로');
out.push('위에 얹힌다. 아래 표에서 **⚠ 표시된 줄만** 주의하면 된다. 그 줄은 클립');
out.push('경계를 넘어가므로, 앞뒤 클립의 그림이 서로 이어져 보여야 한다.');
out.push('');

out.push('## 막별 배분');
out.push('');
out.push('| 막 | 길이 | 클립 | 클립당 사용 | 클립당 버림 |');
out.push('|---|---|---|---|---|');
for (const act of ACTS) {
  const own = blocks.filter((b) => b.actId === act.id);
  const b = own[0];
  out.push(
    `| ${act.title} | ${act.duration}초 | ${own.length}개 (${own[0].id}–${own[own.length - 1].id}) | ` +
      `${b.used.toFixed(1)}초 | ${b.trim.toFixed(1)}초 |`,
  );
}
out.push('');
out.push('---');
out.push('');

let currentAct = null;
for (const b of blocks) {
  if (b.actId !== currentAct) {
    currentAct = b.actId;
    out.push(`## ${b.actTitle}`);
    out.push('');
  }

  out.push(`### ${b.id} · 막 ${b.indexInAct}/${b.countInAct}`);
  out.push('');
  out.push(`- 완성본 위치 **${clock(b.timelineIn)} – ${clock(b.timelineOut)}**`);
  out.push(`- 20초 생성 → **앞에서 ${b.used.toFixed(1)}초만 사용**, 뒤 ${b.trim.toFixed(1)}초 버림`);
  out.push('');

  if (b.lines.length === 0) {
    out.push('사설 없음 — 그림과 음악만.');
    out.push('');
    continue;
  }

  out.push('| 음성 파일 | 갈래 | 막 기준 시각 | 사설 |');
  out.push('|---|---|---|---|');
  for (const l of b.lines) {
    const mark = l.straddles ? ' ⚠' : '';
    out.push(`| \`${l.file}\`${mark} | ${l.register} | ${l.at}–${l.until} | ${l.text} |`);
  }
  out.push('');
}

out.push('---');
out.push('');
out.push('## 조립 순서');
out.push('');
out.push('1. 프롬프트 25개로 클립을 생성한다 (`docs/seedance-prompts.md`)');
out.push('2. 클립마다 위 표의 **사용 길이만큼 앞에서 잘라** 순서대로 잇는다');
out.push('3. 사설 67줄을 fish.audio에서 받는다 (`docs/audio-script.md`)');
out.push('4. `npm run audio:manifest`');
out.push('5. 음성을 **실제 녹음 길이로 재배치**한다 — 아래 주의 참조');
out.push('');
out.push('> **타이밍의 기준은 `narration.ts`의 `at`/`until`이 아니라 실제 녹음 길이다.**');
out.push('> 그 값들은 화면 자막용으로 정한 것이고, 창(23줄)은 감정을 실으면 대개');
out.push('> 길어진다. 녹음이 길어지면 그 줄이 걸친 클립의 사용 길이를 늘려 맞춘다');
out.push('> — 버리는 분량이 클립마다 남아 있으므로 여유가 있다.');
out.push('');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${out.join('\n')}\n`, 'utf8');

// 경계를 넘는 줄은 앞뒤 클립 **양쪽 표에** 나타난다. 등장 횟수를 세면 실제
// 줄 수의 두 배가 나오므로, 파일명으로 중복을 제거하고 센다.
const straddling = new Set(
  blocks.flatMap((b) => b.lines.filter((l) => l.straddles).map((l) => l.file)),
).size;
console.log(`클립 ${blocks.length}개 / 러닝타임 ${clock(timeline)} / 버림 ${discarded.toFixed(1)}초`);
console.log(`클립 경계를 넘는 사설 ${straddling}줄`);
console.log(`docs/seedance-edit-map.md 에 썼다.`);
