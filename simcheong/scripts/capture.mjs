#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import {
  diskReader,
  framePath,
  loadManifest,
  resolveChrome,
  validateManifest,
} from './harness-core.mjs';

/**
 * 일괄 캡처.
 *
 * 심청전 감사의 병목은 판독이 아니라 왕복이었다. 프레임 한 장을 얻으려면
 * 이동 → 대기 → 스크린샷 → 판독이 한 덩어리로 묶여 직렬로 돌았다. 이 스크립트는
 * 앞의 셋을 한 번의 실행으로 몰아서 끝내고, 판독만 남겨 병렬화할 수 있게 한다.
 *
 * 서버는 이미 떠 있어야 한다. 스크립트가 서버를 띄우지 않는 이유는, 띄우는
 * 순간 포트·프로세스 수명·빌드 상태를 함께 책임져야 하고 실패 모드가 늘기
 * 때문이다. 서버가 없으면 분명한 메시지로 즉시 실패한다.
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const worktreeRoot = resolve(projectDir, '..');
const outDir = join(projectDir, 'audit', 'frames');

/** 막 전환이 끝나기를 기다리는 상한. 실제로는 상태를 폴링해 더 일찍 끝난다. */
const REBUILD_TIMEOUT_MS = 8000;
/**
 * 두 번째 goTo 이후 기다릴 "실제로 그려진 프레임" 수.
 * 벽시계 시간이 아니라 프레임 수로 세는 이유는 settle() 주석 참조.
 */
const SETTLE_FRAMES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until the page has actually painted fresh frames.
 *
 * A fixed sleep is the wrong instrument here, and it produced a genuinely
 * nasty failure. In headless software rendering the two heaviest acts — the
 * temple with thirty lanterns and point lights, and the dragon palace with
 * jellyfish, three fish schools and a kelp forest — drop to a few frames per
 * second. A 420 ms settle is comfortably more than one frame for the light
 * acts and comfortably *less* than one frame for those two, so `screenshot`
 * returned the previous composite and three captures of one act came back
 * byte-identical. Nothing errored; the frames simply lied.
 *
 * Counting real `requestAnimationFrame` callbacks adapts to whatever the scene
 * actually costs. The deadline stops a stalled page from hanging the run —
 * and it has to be a real timer, not another condition checked only inside
 * the rAF callback: if rAF has stopped firing entirely (the failure mode this
 * exists for), a deadline that only gets tested from inside `tick` never
 * gets tested at all, and `page.evaluate` — which has no default timeout —
 * hangs forever. `setTimeout` runs off the page's task queue, not the paint
 * loop, so it fires even when rendering has fully stalled.
 */
/**
 * 막 전환이 실제로 끝날 때까지 기다린다.
 *
 * 고정 sleep을 쓰면 두 가지로 틀린다. 짧으면 전환 중에 다음 goTo가 날아가고,
 * 길면 33프레임 × 여유시간만큼 통째로 낭비한다. 디렉터가 자기 상태를 말해주므로
 * 물어보면 된다.
 */
async function awaitAct(page, actIndex) {
  const deadline = Date.now() + REBUILD_TIMEOUT_MS;
  for (;;) {
    const state = await page.evaluate(() => window.simcheong.state());
    if (state.built && state.actIndex === actIndex && !state.transitioning) return;
    if (Date.now() > deadline) {
      throw new Error(
        `act ${actIndex} did not settle within ${REBUILD_TIMEOUT_MS}ms ` +
          `(last state: ${JSON.stringify(state)})`,
      );
    }
    await sleep(80);
  }
}

async function settle(page, frames = SETTLE_FRAMES) {
  await page.evaluate(
    (count) =>
      new Promise((resolve, reject) => {
        let seen = 0;
        let done = false;
        // The real deadline: fires from the task queue regardless of whether
        // rAF ever calls back again. A stall is an error, not an early
        // return — a page that has stopped painting must fail the lane
        // loudly instead of handing back however many frames it managed.
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          reject(
            new Error(
              `render stalled: only ${seen}/${count} requestAnimationFrame ` +
                `callbacks fired within 10000ms`,
            ),
          );
        }, 10_000);
        const tick = () => {
          if (done) return;
          seen += 1;
          if (seen >= count) {
            done = true;
            clearTimeout(timer);
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

const manifest = loadManifest(worktreeRoot);
const manifestErrors = validateManifest(manifest, diskReader(projectDir));
if (manifestErrors.length > 0) {
  console.error('manifest invalid, refusing to capture:');
  for (const error of manifestErrors) console.error(`  - ${error}`);
  process.exit(1);
}

const chrome = resolveChrome(existsSync);
if (chrome === null) {
  console.error('no Chrome found. set CHROME_PATH to a chrome.exe / google-chrome binary.');
  process.exit(1);
}

// 매니페스트에 없어도 죽지 않게 기본값을 둔다. 검증기는 lanes만 강제하고
// 이 둘은 선택 항목이다.
const url = process.env.AUDIT_URL ?? manifest.url ?? 'http://localhost:5178';
const viewport = manifest.viewport ?? { width: 1440, height: 810 };

const probe = await fetch(url).catch(() => null);
if (probe === null || !probe.ok) {
  console.error(`dev server not reachable at ${url}. run "npm run dev" first.`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'],
});

/** 콘솔은 막 단위로 모은다. 현재 어느 막을 찍는 중인지 이 변수가 들고 있다. */
let currentLane = 'boot';
/** 실패 시 "어느 프레임에서 죽었는지" 보고하기 위한 위치 표시. */
let currentFrame = null;
const consoleByLane = {};
const inspectByLane = {};
let captured = 0;
/** 스크립트 자체가 죽을 만한 실패만 여기 담는다 — 개별 레인 실패는 아래 루프 안에서 흡수된다. */
let failure = null;
/** 실패한 레인 목록. 하나라도 있으면 라운드 전체는 완주해도 종료 코드는 0이 아니다. */
const failedLanes = [];

// 캡처 루프 어디서든 (씬 빌드 실패, goto 타임아웃 등) 던질 수 있다. try/finally로
// 감싸서, 실패해도 브라우저는 항상 닫히고 그때까지 모은 console.json/inspect.json은
// 항상 디스크에 남긴다 — 진단 없는 부분 캡처보다 진단 있는 부분 캡처가 훨씬 쓸모있다.
try {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
  });

  const record = (entry) => {
    (consoleByLane[currentLane] ??= []).push(entry);
  };

  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    record({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => record({ type: 'pageerror', text: String(error) }));

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

  // 플레이어 크롬과 커버를 숨긴다. 감사 프레임에 UI가 끼면 레인이 그것을 결함으로
  // 보고하는 노이즈가 생긴다.
  //
  // 막 제목 카드도 숨긴다. 등장 애니메이션이 6초짜리라 캡처 속도에서는 한 레인의
  // 모든 프레임에 걸리고, 화면 좌상단을 덮는다. 레인은 프롬프트로 이미 자기 막을
  // 알고 있으니 이 카드가 주는 정보가 없다.
  //
  // 자막은 일부러 남긴다. 자막이 피사체를 가리는지는 실제 구도 결함이다 —
  // 5막의 한 샷에서 나레이션이 정확히 그 대상 인물 위에 얹혀 있었다.
  await page.addStyleTag({
    content: '.player, .boot, .actcard { display: none !important; }',
  });

  const { id: ids, actIndex: indices, captureAt: times } = manifest.lanes;

  for (let lane = 0; lane < ids.length; lane++) {
    currentLane = ids[lane];
    const actIndex = indices[lane];

    // 레인 하나의 실패(씬 빌드 예외, seek 불일치, settle 스톨)가 나머지 일곱 레인의
    // 33장을 통째로 날려서는 안 된다. 스크립트 자체가 죽는 경우(잘못된 매니페스트,
    // Chrome 없음, 서버 불통, 브라우저 실행 실패)는 이 루프에 들어오기 전에 이미
    // 걸러졌으니 여기서 잡을 필요가 없다 — 이 try는 오직 레인 단위 실패만 흡수한다.
    try {
      for (let i = 0; i < times[lane].length; i++) {
        const seconds = times[lane][i];
        currentFrame = framePath(currentLane, seconds);

        // 레인의 첫 프레임에서만 막을 "전환"한다: goTo 첫 호출이 빌드 + 약 1.1초
        // 페이드를 시작시키므로, 그게 끝나기를 REBUILD_MS만큼 기다려야 한다.
        // 같은 레인의 나머지 프레임들은 이미 살아 있는 막 안에서 시간만 바꾸는
        // 것이라 goTo가 로컬 시간에 대한 순수 함수처럼 즉시·정확하게 동작한다.
        // 그래서 그 프레임들은 REBUILD_MS 없이 settle()만 기다리면 된다.
        if (i === 0) {
          await page.evaluate((args) => window.simcheong.goTo(args.i, args.t), {
            i: actIndex,
            t: seconds,
          });
          await awaitAct(page, actIndex);
        }
        await page.evaluate((args) => window.simcheong.goTo(args.i, args.t), {
          i: actIndex,
          t: seconds,
        });
        await settle(page);

        // 시크가 실제로 먹었는지 확인한다. 안 먹었으면 프레임은 조용히 거짓말을
        // 하고, 레인은 그 거짓말을 믿고 멀쩡한 씬을 "고친다".
        //
        // actId도 함께 비교한다: 매니페스트 검사기는 index.ts의 *import 순서*만
        // 보고, 실제로 goTo가 도는 순서는 index.ts 맨 아래 ACTS 배열이다. ACTS를
        // 재정렬하면서 import는 그대로 두면 정적 검사는 통과하지만 actIndex가
        // 가리키는 실제 막이 달라진다 — 그러면 이 레인은 자기 막이 아닌 다른 막을
        // 찍어서 자기 파일명으로 저장하게 된다. 여기서 잡는다.
        const landed = await page.evaluate(() => window.simcheong.state());
        if (
          Math.abs(Number(landed.actTime) - seconds) > 0.05 ||
          landed.actIndex !== actIndex ||
          landed.actId !== currentLane
        ) {
          throw new Error(
            `seek did not land: asked lane "${currentLane}" (act ${actIndex}) @ ${seconds}s, ` +
              `got ${JSON.stringify(landed)}`,
          );
        }

        const file = join(outDir, currentFrame);
        await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
        captured++;
        console.log(`  ${currentFrame}`);
      }

      currentFrame = null;
      inspectByLane[currentLane] = await page.evaluate(() => window.simcheong.inspect(30));
    } catch (laneError) {
      // console.json이 이 레인의 진단을 담아야 테일이 크래시부터 고칠 수 있다.
      // 그다음 다음 레인으로 넘어간다 — 이 레인은 그냥 frames가 없는 채로 남는다.
      failedLanes.push(currentLane);
      const text =
        laneError instanceof Error ? (laneError.stack ?? laneError.message) : String(laneError);
      (consoleByLane[currentLane] ??= []).push({
        type: 'pageerror',
        text: `lane "${currentLane}" capture failed: ${text}`,
      });
      console.error(`lane "${currentLane}" failed, continuing with remaining lanes:`);
      console.error(laneError);
      currentFrame = null;
    }
  }
} catch (error) {
  failure = error;
} finally {
  // 브라우저를 먼저 닫는다. 아래 두 writeFileSync 중 하나가 던지면(디스크 가득,
  // 경로 사라짐 등) 브라우저를 닫지 못한 채 프로세스가 죽어 고아 프로세스로
  // 남는 것 — 바로 이 finally가 원래 막으려던 문제 — 를 재도입하게 된다.
  try {
    await browser.close();
  } catch (closeError) {
    console.error('failed to close browser:', closeError);
  }
  // 두 파일을 각각 독립적으로 감싼다. 하나가 실패해도 다른 하나는 쓰이고, 원래
  // 실패(위의 `failure`나 레인 실패들)가 write 실패에 가려지지 않는다.
  try {
    writeFileSync(join(outDir, 'console.json'), JSON.stringify(consoleByLane, null, 2), 'utf8');
  } catch (writeError) {
    console.error('failed to write console.json:', writeError);
  }
  try {
    writeFileSync(join(outDir, 'inspect.json'), JSON.stringify(inspectByLane, null, 2), 'utf8');
  } catch (writeError) {
    console.error('failed to write inspect.json:', writeError);
  }
}

if (failure) {
  const where = currentFrame ? `frame "${currentFrame}"` : 'lane setup/inspect';
  console.error(`capture script failed in lane "${currentLane}" at ${where}`);
  console.error(failure);
  process.exit(1);
}

// Duplicate-frame guard.
//
// Two captures of the same act at different times must not be byte-identical.
// When they are, the screenshot caught a stale composite and the frames are
// lying — which is worse than a crash, because a lane agent will read them,
// believe them, and "fix" a scene that was never broken. Three lanes caught
// this by hand on the first run; the harness should never make them do it again.
const digests = new Map();
const duplicates = [];
for (const file of readdirSync(outDir)) {
  if (!file.endsWith('.jpeg')) continue;
  const digest = createHash('md5').update(readFileSync(join(outDir, file))).digest('hex');
  const seen = digests.get(digest);
  if (seen) duplicates.push(`${seen} == ${file}`);
  else digests.set(digest, file);
}

if (duplicates.length > 0) {
  console.error('identical frames detected — the screenshot caught a stale composite:');
  for (const pair of duplicates) console.error(`  ${pair}`);
  console.error('raise SETTLE_FRAMES, or check whether the render loop stalled.');
  process.exit(1);
}

const errorCount = Object.values(consoleByLane)
  .flat()
  .filter((entry) => entry.type === 'error' || entry.type === 'pageerror').length;

console.log(`captured ${captured} frames to audit/frames`);
console.log(`console errors: ${errorCount}`);

if (failedLanes.length > 0) {
  console.error(`${failedLanes.length} lane(s) failed: ${failedLanes.join(', ')}`);
  process.exit(1);
}
