# 벡터화 렌더 하네스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 심청전 8막 렌더의 시각 감사를 직렬 40 왕복에서 3 왕복으로 줄이는 재사용 가능한 배열형 하네스를 만들고, 그 첫 실행으로 실제 결함을 고친다.

**Architecture:** 레인 하나가 막 파일 하나를 소유한다. 공유 빌더 수정은 escalation으로 올려 스칼라 테일에서만 처리하므로 병합 충돌이 구조적으로 불가능하다. 프레임 캡처(싸고 일괄 가능)와 판독(비쌈)을 분리해 판독만 병렬화한다. 레인 목록은 SoA 평행 배열 매니페스트 하나에서 나오고, 배열 길이 일치가 기계로 검사되는 불변식이다.

**Tech Stack:** Node 22 내장 테스트 러너(`node --test "scripts/**/*.test.mjs"` — 디렉터리 형태는 Windows에서 모듈 해석으로 오인되어 실패한다), `puppeteer-core` + 시스템 Chrome, TypeScript 5.9 strict, Vite 8, Three.js 0.185.

## Global Constraints

- 작업 디렉터리는 저장소 루트. 명령의 상대 경로는 별도 언급이 없으면 `simcheong/` 기준이다.
- TypeScript strict. `any` 금지. ESM만 사용. `.mjs` 스크립트도 ESM.
- 기존 `docs/harness/`, `scripts/check-harness.js`, 루트 `AGENTS.md`를 **수정하지 않는다.** 추가만 한다.
- 새 런타임 의존성 금지. `puppeteer-core`는 `devDependencies`로만 추가하고 브라우저를 내려받지 않는다.
- 레인 파일 소유권: 레인은 자기 `src/scenes/actNN*.ts` 하나만 수정한다. 그 외 경로 수정은 규약 위반이다.
- 벡터 라운드 상한 2회. 결함이 남으면 자동으로 더 돌리지 않고 멈추고 보고한다.
- 커밋 메시지는 Conventional Commits. 한 번에 하나의 논리적 변경.
- 검증 명령: `npm run build` (= `tsc --noEmit && vite build`), `npm run audit:test`, `npm run audit:check`.

---

### Task 1: SoA 매니페스트와 무결성 검사기

레인 목록의 단일 출처를 만들고, SoA 불변식을 기계로 검사한다. 이후 모든 태스크가 이 매니페스트를 읽는다.

**Files:**
- Create: `simcheong/scripts/harness-core.mjs`
- Create: `simcheong/scripts/harness-core.test.mjs`
- Create: `simcheong/scripts/check-render-harness.mjs`
- Create: `HARNESS_MANIFEST.json` (worktree 루트)
- Modify: `simcheong/package.json` (scripts 3개 추가)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `validateManifest(manifest: object, readFile: (path: string) => string | null): string[]` — 오류 메시지 배열, 빈 배열이면 통과
  - `loadManifest(rootDir: string): object` — `HARNESS_MANIFEST.json` 파싱
  - `resolveChrome(exists: (path: string) => boolean, candidates?: string[]): string | null`
  - `framePath(laneId: string, seconds: number): string` — 예: `farewell-t04.jpeg`
  - `LANE_COLUMNS: readonly string[]` — `['id', 'file', 'actIndex', 'captureAt', 'intent']`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `simcheong/scripts/harness-core.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, resolveChrome, framePath } from './harness-core.mjs';

/** 유효한 최소 매니페스트와, 그것을 만족시키는 가짜 파일 시스템. */
function fixture(overrides = {}) {
  const manifest = {
    version: 1,
    domain: 'procedural-render',
    lanes: {
      id: ['farewell', 'growing'],
      file: ['src/scenes/act01Farewell.ts', 'src/scenes/act02Growing.ts'],
      actIndex: [0, 1],
      captureAt: [[4, 24], [5, 18]],
      intent: ['상여가 멀어지고 아버지는 남는다', '십오 년이 지나간다'],
    },
    shared: ['src/builders/figure.ts'],
    ...overrides,
  };

  const files = {
    'src/scenes/act01Farewell.ts': "export const act01Farewell = { id: 'farewell', };",
    'src/scenes/act02Growing.ts': "export const act02Growing = { id: 'growing', };",
    'src/builders/figure.ts': 'export function buildFigure() {}',
    'src/scenes/index.ts': [
      "import { act01Farewell } from './act01Farewell';",
      "import { act02Growing } from './act02Growing';",
    ].join('\n'),
  };

  return { manifest, readFile: (p) => (p in files ? files[p] : null) };
}

test('유효한 매니페스트는 오류가 없다', () => {
  const { manifest, readFile } = fixture();
  assert.deepEqual(validateManifest(manifest, readFile), []);
});

test('레인 열 길이가 다르면 SoA 불변식 위반을 보고한다', () => {
  const { manifest, readFile } = fixture();
  manifest.lanes.intent.pop();
  const errors = validateManifest(manifest, readFile);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /SoA invariant/);
  assert.match(errors[0], /intent=1/);
});

test('레인 파일이 shared에도 있으면 소유권 충돌을 보고한다', () => {
  const { manifest, readFile } = fixture();
  manifest.shared.push('src/scenes/act01Farewell.ts');
  const errors = validateManifest(manifest, readFile);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /must not overlap/);
});

test('레인 파일이 선언한 Act.id가 다르면 보고한다', () => {
  const { manifest, readFile } = fixture();
  manifest.lanes.id[0] = 'wrongId';
  const errors = validateManifest(manifest, readFile);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not declare id: 'wrongId'/);
});

test('index.ts import 순서가 lanes.file 순서와 다르면 보고한다', () => {
  const { manifest } = fixture();
  const readFile = (p) => {
    if (p === 'src/scenes/index.ts') {
      return [
        "import { act02Growing } from './act02Growing';",
        "import { act01Farewell } from './act01Farewell';",
      ].join('\n');
    }
    if (p === 'src/scenes/act01Farewell.ts') return "{ id: 'farewell', }";
    if (p === 'src/scenes/act02Growing.ts') return "{ id: 'growing', }";
    if (p === 'src/builders/figure.ts') return 'x';
    return null;
  };
  const errors = validateManifest(manifest, readFile);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /lanes\.file order/);
});

test('존재하지 않는 레인 파일을 보고한다', () => {
  const { manifest, readFile } = fixture();
  manifest.lanes.file[1] = 'src/scenes/nope.ts';
  const errors = validateManifest(manifest, readFile);
  assert.ok(errors.some((e) => /does not exist/.test(e)));
});

test('resolveChrome은 존재하는 첫 후보를 고른다', () => {
  const found = resolveChrome((p) => p === '/b', ['/a', '/b', '/c']);
  assert.equal(found, '/b');
});

test('resolveChrome은 후보가 없으면 null을 준다', () => {
  assert.equal(resolveChrome(() => false, ['/a']), null);
});

test('framePath는 초를 두 자리로 채운다', () => {
  assert.equal(framePath('farewell', 4), 'farewell-t04.jpeg');
  assert.equal(framePath('feast', 70), 'feast-t70.jpeg');
  assert.equal(framePath('lotus', 9.6), 'lotus-t10.jpeg');
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `cd simcheong && node --test scripts/harness-core.test.mjs`
Expected: FAIL — `Cannot find module ... harness-core.mjs`

- [ ] **Step 3: 최소 구현을 쓴다**

Create `simcheong/scripts/harness-core.mjs`:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 하네스의 순수 계약.
 *
 * 파일 시스템 접근을 주입받는다(`readFile`, `exists`). 검증 로직이 순수해지므로
 * 실제 디스크 없이 단위 테스트가 되고, SoA 불변식 같은 규칙을 회귀 테스트로
 * 고정할 수 있다.
 */

/** 매니페스트 `lanes`가 반드시 가져야 하는 평행 배열들. */
export const LANE_COLUMNS = Object.freeze(['id', 'file', 'actIndex', 'captureAt', 'intent']);

/** Chrome 실행 파일 후보. 앞에서부터 존재하는 첫 항목을 쓴다. */
export const CHROME_CANDIDATES = Object.freeze(
  [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean),
);

export function resolveChrome(exists, candidates = CHROME_CANDIDATES) {
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** 프레임 파일 이름 규약. 레인은 이 이름으로 자기 프레임을 찾는다. */
export function framePath(laneId, seconds) {
  const stamp = String(Math.round(seconds)).padStart(2, '0');
  return `${laneId}-t${stamp}.jpeg`;
}

export function loadManifest(rootDir) {
  return JSON.parse(readFileSync(join(rootDir, 'HARNESS_MANIFEST.json'), 'utf8'));
}

/** 실제 디스크를 읽는 기본 `readFile`. 없는 파일은 예외 대신 null. */
export function diskReader(rootDir) {
  return (relativePath) => {
    const full = join(rootDir, relativePath);
    return existsSync(full) ? readFileSync(full, 'utf8') : null;
  };
}

/**
 * 매니페스트를 검증하고 오류 메시지 배열을 돌려준다. 빈 배열이면 통과.
 *
 * 예외를 던지지 않고 목록을 모으는 이유는, 한 번 실행에 모든 문제를 보여주기
 * 위해서다. 첫 오류에서 멈추면 고치고 다시 돌리는 왕복이 늘어난다.
 */
export function validateManifest(manifest, readFile) {
  const errors = [];

  if (typeof manifest?.version !== 'number') errors.push('version must be a number');
  if (typeof manifest?.domain !== 'string' || manifest.domain.length === 0) {
    errors.push('domain must be a non-empty string');
  }

  const lanes = manifest?.lanes;
  if (!lanes || typeof lanes !== 'object' || Array.isArray(lanes)) {
    errors.push('lanes must be an object of parallel arrays');
    return errors;
  }

  for (const column of LANE_COLUMNS) {
    if (!Array.isArray(lanes[column])) errors.push(`lanes.${column} must be an array`);
  }
  if (errors.length > 0) return errors;

  const lengths = LANE_COLUMNS.map((column) => lanes[column].length);
  if (new Set(lengths).size !== 1) {
    const detail = LANE_COLUMNS.map((column, i) => `${column}=${lengths[i]}`).join(', ');
    errors.push(`SoA invariant broken: lane column lengths differ (${detail})`);
    return errors;
  }

  const count = lengths[0];
  if (count === 0) {
    errors.push('lanes must not be empty');
    return errors;
  }

  const shared = Array.isArray(manifest.shared) ? manifest.shared : [];
  const sharedSet = new Set(shared);

  for (let i = 0; i < count; i++) {
    const id = lanes.id[i];
    const file = lanes.file[i];

    if (typeof id !== 'string' || id.length === 0) {
      errors.push(`lanes.id[${i}] must be a non-empty string`);
      continue;
    }
    if (typeof file !== 'string' || file.length === 0) {
      errors.push(`lanes.file[${i}] must be a non-empty string`);
      continue;
    }

    if (sharedSet.has(file)) {
      errors.push(
        `lanes.file[${i}] "${file}" is also in shared; lane files and shared files must not overlap`,
      );
    }

    if (lanes.actIndex[i] !== i) {
      errors.push(`lanes.actIndex[${i}] must equal ${i}, got ${String(lanes.actIndex[i])}`);
    }

    const captureAt = lanes.captureAt[i];
    if (!Array.isArray(captureAt) || captureAt.length === 0) {
      errors.push(`lanes.captureAt[${i}] must be a non-empty array of seconds`);
    } else if (!captureAt.every((s) => Number.isFinite(s) && s >= 0)) {
      errors.push(`lanes.captureAt[${i}] must contain only finite seconds >= 0`);
    }

    if (typeof lanes.intent[i] !== 'string' || lanes.intent[i].length === 0) {
      errors.push(`lanes.intent[${i}] must be a non-empty string`);
    }

    const source = readFile(file);
    if (source === null) {
      errors.push(`lanes.file[${i}] "${file}" does not exist`);
      continue;
    }
    if (!source.includes(`id: '${id}'`)) {
      errors.push(`lanes.file[${i}] "${file}" does not declare id: '${id}'`);
    }
  }

  const index = readFile('src/scenes/index.ts');
  if (index === null) {
    errors.push('src/scenes/index.ts does not exist');
  } else {
    let cursor = 0;
    let ordered = true;
    for (const file of lanes.file) {
      const moduleName = String(file).split('/').pop().replace(/\.ts$/, '');
      const at = index.indexOf(`from './${moduleName}'`, cursor);
      if (at === -1) {
        ordered = false;
        break;
      }
      cursor = at;
    }
    if (!ordered) {
      errors.push('src/scenes/index.ts imports do not appear in lanes.file order');
    }
  }

  for (const file of shared) {
    if (readFile(file) === null) errors.push(`shared file "${file}" does not exist`);
  }

  return errors;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `cd simcheong && node --test scripts/harness-core.test.mjs`
Expected: PASS — `# pass 9`, `# fail 0`

- [ ] **Step 5: 실제 매니페스트를 쓴다**

Create `HARNESS_MANIFEST.json` (worktree 루트):

```json
{
  "version": 1,
  "domain": "procedural-render",
  "project": "simcheong",
  "url": "http://localhost:5178",
  "viewport": { "width": 1440, "height": 810 },
  "lanes": {
    "id": [
      "farewell", "growing", "vow", "merchants",
      "indangsu", "dragonPalace", "lotus", "feast"
    ],
    "file": [
      "src/scenes/act01Farewell.ts",
      "src/scenes/act02Growing.ts",
      "src/scenes/act03Vow.ts",
      "src/scenes/act04Merchants.ts",
      "src/scenes/act05Indangsu.ts",
      "src/scenes/act06DragonPalace.ts",
      "src/scenes/act07Lotus.ts",
      "src/scenes/act08Feast.ts"
    ],
    "actIndex": [0, 1, 2, 3, 4, 5, 6, 7],
    "captureAt": [
      [4, 24, 40, 50],
      [5, 18, 30, 44],
      [5, 20, 27, 42],
      [4, 17, 31, 47],
      [8, 31, 39, 50],
      [6, 24, 38, 50],
      [10, 24, 36, 47],
      [8, 30, 50, 57, 70]
    ],
    "intent": [
      "겨울 들판. 상여 행렬이 멀어지고 눈먼 아버지만 아기를 안고 남는다. 그는 움직이지 않는다.",
      "여름 마을. 전반은 갓난아이를 안고 젖을 구하는 아버지, 후반은 열다섯 청이가 그를 이끈다.",
      "밤 산사. 연등 길이 개울에서 법당까지 오른다. 아버지가 무릎 꿇고 삼백 석을 약속한다.",
      "새벽 포구. 청이가 상인들 앞에 나선다. 쌀이 집에 쌓이고 아버지는 아무것도 모른다.",
      "폭풍 바다. 청이가 뱃머리에서 서쪽으로 두 번 절하고 뛰어내린다. 카메라가 물속까지 따라간다.",
      "수정궁. 용이 여의주를 들고 돌고, 조개가 열려 어머니가 나온다. 위쪽에서 빛기둥이 내린다.",
      "연꽃이 물속에서 떠올라 수면을 뚫고, 궁중 연못에서 열리며 청이가 일어선다.",
      "궁궐 맹인잔치. 늦게 온 늙은 봉사가 딸의 목소리에 눈을 뜬다. 흰 화면 한 프레임."
    ]
  },
  "shared": [
    "src/builders/figure.ts",
    "src/builders/materials.ts",
    "src/builders/roof.ts",
    "src/builders/hanok.ts",
    "src/builders/temple.ts",
    "src/builders/nature.ts",
    "src/builders/water.ts",
    "src/builders/ship.ts",
    "src/builders/dragon.ts",
    "src/builders/undersea.ts",
    "src/builders/lotus.ts",
    "src/builders/props.ts",
    "src/core/palette.ts",
    "src/core/stage.ts",
    "src/core/cameraRig.ts",
    "src/core/shot.ts",
    "src/core/timeline.ts",
    "src/core/director.ts",
    "src/core/rng.ts",
    "src/core/subtitles.ts",
    "src/core/types.ts",
    "src/core/ui.ts",
    "src/data/narration.ts",
    "src/main.ts"
  ],
  "contract": {
    "outputSchema": {
      "actId": "string",
      "edits": "string[]",
      "defects": "{ frame: string, what: string, cause: string, owner: 'lane' | 'shared' }[]",
      "escalations": "{ targetFile: string, what: string, why: string }[]",
      "verdict": "'pass' | 'fixed' | 'blocked' | 'unknown'",
      "touchedFiles": "string[]"
    },
    "verdicts": ["pass", "fixed", "blocked", "unknown"],
    "maxVectorRounds": 2
  },
  "runs": []
}
```

- [ ] **Step 6: CLI 검사기를 쓴다**

Create `simcheong/scripts/check-render-harness.mjs`:

```js
#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diskReader, loadManifest, validateManifest } from './harness-core.mjs';

/**
 * 하네스 무결성 검사. 실패하면 종료 코드 1.
 *
 * 이 저장소 루트는 simcheong의 부모다: 매니페스트는 worktree 루트에 있고,
 * 그 안의 경로는 simcheong 기준이다.
 */
const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const worktreeRoot = resolve(projectDir, '..');

const errors = [];

if (!existsSync(join(worktreeRoot, 'HARNESS_MANIFEST.json'))) {
  errors.push('HARNESS_MANIFEST.json not found at worktree root');
} else {
  const manifest = loadManifest(worktreeRoot);
  errors.push(...validateManifest(manifest, diskReader(projectDir)));
}

if (errors.length > 0) {
  console.error('render harness check FAILED:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('render harness check OK');
```

- [ ] **Step 7: npm 스크립트를 추가한다**

Modify `simcheong/package.json` — `scripts` 블록을 아래로 교체:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "audit:test": "node --test \"scripts/**/*.test.mjs\"",
    "audit:check": "node scripts/check-render-harness.mjs"
  },
```

- [ ] **Step 8: 검사기를 실제 매니페스트에 돌린다**

Run: `cd simcheong && npm run audit:check`
Expected: `render harness check OK`

만약 `does not declare id:` 오류가 나오면 매니페스트의 `lanes.id`가 실제 `Act.id`와
다른 것이다. `grep -n "id: '" src/scenes/act0*.ts`로 실제 값을 확인해 매니페스트를 맞춘다.

- [ ] **Step 9: 커밋**

```bash
git add simcheong/scripts/harness-core.mjs simcheong/scripts/harness-core.test.mjs simcheong/scripts/check-render-harness.mjs simcheong/package.json HARNESS_MANIFEST.json
git commit -m "feat(harness): SoA 매니페스트와 무결성 검사기

레인 목록의 단일 출처를 만든다. 평행 배열의 길이 일치가 기계로 검사되는
불변식이 되고, lanes.file 과 shared 의 교집합이 비어 있는지도 함께 검사한다.
검증 로직은 파일 접근을 주입받아 순수하므로 디스크 없이 단위 테스트된다."
```

---

### Task 2: 일괄 캡처 스크립트

한 번 실행으로 33개 프레임과 콘솔·씬 덤프를 만든다. 이것이 직렬 왕복을 없애는 핵심 부품이다.

**Files:**
- Create: `simcheong/scripts/capture.mjs`
- Modify: `simcheong/package.json` (`audit:capture` 스크립트, `puppeteer-core` devDependency)
- Modify: `.gitignore` (worktree 루트 — `simcheong/audit/` 추가)

**Interfaces:**
- Consumes: `loadManifest`, `validateManifest`, `diskReader`, `resolveChrome`, `framePath` (Task 1)
- Produces:
  - `simcheong/audit/frames/<laneId>-t<SS>.jpeg` × 33
  - `simcheong/audit/frames/console.json` — `{ [laneId]: { type: string, text: string }[] }`
  - `simcheong/audit/frames/inspect.json` — `{ [laneId]: { name, extent, min, max }[] }`

- [ ] **Step 1: puppeteer-core를 devDependency로 설치한다**

Run: `cd simcheong && npm install --save-dev --no-audit --no-fund puppeteer-core`
Expected: `added 1 package` 정도. **크롬 다운로드가 일어나면 안 된다** — `puppeteer-core`는 브라우저를 내려받지 않는다. `puppeteer`(core 없는 이름)를 설치하면 안 된다.

- [ ] **Step 2: Chrome이 실제로 잡히는지 먼저 확인한다**

Run:
```bash
cd simcheong && node -e "import('./scripts/harness-core.mjs').then(m=>console.log(m.resolveChrome(require('fs').existsSync)))"
```
Expected: `C:\Program Files\Google\Chrome\Application\chrome.exe` 같은 실제 경로.
`null`이면 `CHROME_PATH` 환경변수로 경로를 지정한 뒤 다음 단계로 간다.

- [ ] **Step 3: 캡처 스크립트를 쓴다**

Create `simcheong/scripts/capture.mjs`:

```js
#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

/** 막 전환 페이드(1.1초)와 지오메트리 빌드가 끝나기를 기다리는 시간. */
const REBUILD_MS = 1500;
/** 두 번째 goTo 이후 한 프레임이 확실히 그려질 때까지. */
const SETTLE_MS = 420;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const page = await browser.newPage();
await page.setViewport({
  width: viewport.width,
  height: viewport.height,
  deviceScaleFactor: 1,
});

/** 콘솔은 막 단위로 모은다. 현재 어느 막을 찍는 중인지 이 변수가 들고 있다. */
let currentLane = 'boot';
const consoleByLane = {};
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
await page.addStyleTag({
  content: '.player, .boot { display: none !important; }',
});

const inspectByLane = {};
const { id: ids, actIndex: indices, captureAt: times } = manifest.lanes;
let captured = 0;

for (let lane = 0; lane < ids.length; lane++) {
  currentLane = ids[lane];
  const actIndex = indices[lane];

  for (const seconds of times[lane]) {
    // 두 번 부르는 이유: 첫 호출은 막 전환(빌드 + 페이드)을 시작시키고,
    // 두 번째 호출이 이미 살아 있는 막을 정확한 시각으로 스크럽한다.
    await page.evaluate((args) => window.simcheong.goTo(args.i, args.t), {
      i: actIndex,
      t: seconds,
    });
    await sleep(REBUILD_MS);
    await page.evaluate((args) => window.simcheong.goTo(args.i, args.t), {
      i: actIndex,
      t: seconds,
    });
    await sleep(SETTLE_MS);

    const file = join(outDir, framePath(currentLane, seconds));
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    captured++;
    console.log(`  ${framePath(currentLane, seconds)}`);
  }

  inspectByLane[currentLane] = await page.evaluate(() => window.simcheong.inspect(30));
}

writeFileSync(join(outDir, 'console.json'), JSON.stringify(consoleByLane, null, 2), 'utf8');
writeFileSync(join(outDir, 'inspect.json'), JSON.stringify(inspectByLane, null, 2), 'utf8');

await browser.close();

const errorCount = Object.values(consoleByLane)
  .flat()
  .filter((entry) => entry.type === 'error' || entry.type === 'pageerror').length;

console.log(`captured ${captured} frames to audit/frames`);
console.log(`console errors: ${errorCount}`);
```

- [ ] **Step 4: npm 스크립트와 gitignore를 추가한다**

Modify `simcheong/package.json` — `scripts`에 한 줄 추가:

```json
    "audit:capture": "node scripts/capture.mjs"
```

Modify `.gitignore` (worktree 루트) — 끝에 추가:

```
simcheong/audit/
```

- [ ] **Step 5: 서버를 띄우고 캡처를 돌린다**

먼저 서버가 필요하다. 이미 떠 있으면 그대로 쓴다.

Run (별도 터미널 또는 백그라운드): `cd simcheong && npm run dev`
Run: `cd simcheong && npm run audit:capture`

Expected: 33줄의 프레임 이름이 찍히고 마지막에
```
captured 33 frames to audit/frames
console errors: 0
```

- [ ] **Step 6: 프레임이 실제로 그럴듯한지 눈으로 한 장 확인한다**

Run: `ls simcheong/audit/frames | head -5`
그리고 `simcheong/audit/frames/feast-t08.jpeg`를 Read 도구로 연다.
Expected: 궁궐 마당, 상 앞에 앉은 손님들, 어좌. UI 바가 **보이지 않아야** 한다.

프레임이 검거나 부팅 커버만 보이면 `REBUILD_MS`를 2200으로 올려 다시 돌린다.

- [ ] **Step 7: 커밋**

```bash
git add simcheong/scripts/capture.mjs simcheong/package.json simcheong/package-lock.json .gitignore
git commit -m "feat(harness): 일괄 프레임 캡처 스크립트

33개 프레임과 막별 콘솔/씬 덤프를 한 번의 실행으로 만든다. 이동-대기-스크린샷을
한 덩어리로 몰아 끝내면 남는 것은 판독뿐이고, 그것만 병렬화하면 된다.
puppeteer-core + 시스템 Chrome이라 브라우저 다운로드가 없다."
```

---

### Task 3: 레인 워커와 스칼라 테일 에이전트 정의

동형 워커의 계약을 파일로 고정한다. 이 파일들이 "다음 작품에서도 빨라진다"는 약속의 실체다.

**Files:**
- Create: `.claude/agents/scene-lane.md`
- Create: `.claude/agents/scalar-tail.md`
- Modify: `simcheong/scripts/check-render-harness.mjs` (에이전트 파일 존재·섹션 검사 추가)
- Modify: `simcheong/scripts/harness-core.test.mjs` (섹션 검사 테스트 추가)
- Modify: `simcheong/scripts/harness-core.mjs` (`validateAgentDoc` 추가)

**Interfaces:**
- Consumes: `validateManifest`, `diskReader`, `loadManifest` (Task 1)
- Produces: `validateAgentDoc(source: string | null, name: string): string[]`

- [ ] **Step 1: 섹션 검사의 실패하는 테스트를 쓴다**

Modify `simcheong/scripts/harness-core.test.mjs` — 파일 끝에 추가:

```js
import { validateAgentDoc, REQUIRED_AGENT_SECTIONS } from './harness-core.mjs';

test('에이전트 문서가 없으면 보고한다', () => {
  const errors = validateAgentDoc(null, 'scene-lane');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /scene-lane.*does not exist/);
});

test('필수 섹션이 빠지면 그 섹션을 지목한다', () => {
  const source = REQUIRED_AGENT_SECTIONS.slice(0, -1)
    .map((heading) => `${heading}\n\n내용\n`)
    .join('\n');
  const errors = validateAgentDoc(source, 'scene-lane');
  assert.equal(errors.length, 1);
  assert.match(errors[0], new RegExp(REQUIRED_AGENT_SECTIONS.at(-1)));
});

test('모든 섹션이 있으면 통과한다', () => {
  const source = REQUIRED_AGENT_SECTIONS.map((heading) => `${heading}\n\n내용\n`).join('\n');
  assert.deepEqual(validateAgentDoc(source, 'scene-lane'), []);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `cd simcheong && npm run audit:test`
Expected: FAIL — `validateAgentDoc is not a function` 또는 `SyntaxError: ... does not provide an export named 'validateAgentDoc'`

- [ ] **Step 3: `validateAgentDoc`을 구현한다**

Modify `simcheong/scripts/harness-core.mjs` — 파일 끝에 추가:

```js
/**
 * 에이전트 역할 문서가 반드시 가져야 하는 섹션.
 *
 * 이 저장소의 기존 하네스(`scripts/check-harness.js`)가 쓰는 것과 같은 이름을
 * 그대로 따른다. 도메인이 달라도 역할 문서의 뼈대는 하나로 유지한다.
 */
export const REQUIRED_AGENT_SECTIONS = Object.freeze([
  '## Mission',
  '## Inputs',
  '## Outputs',
  '## Must Not Do',
  '## Handoff Protocol',
  '## Failure And Escalation',
]);

export function validateAgentDoc(source, name) {
  if (source === null) return [`agent doc "${name}" does not exist`];
  const missing = REQUIRED_AGENT_SECTIONS.filter((heading) => !source.includes(heading));
  return missing.map((heading) => `agent doc "${name}" is missing section ${heading}`);
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `cd simcheong && npm run audit:test`
Expected: PASS — `# pass 12`, `# fail 0`

- [ ] **Step 5: 레인 워커를 쓴다**

Create `.claude/agents/scene-lane.md`:

```markdown
---
name: scene-lane
description: 심청전 절차적 렌더의 막 하나를 소유하는 동형 워커. 자기 막의 캡처 프레임을 읽고 의도와 대조해 결함을 찾아 자기 씬 파일만 수정한다. 공유 빌더 수정은 손대지 않고 escalation으로 올린다. render-audit 하네스의 벡터 레인으로 여러 개가 동시에 실행된다.
tools: Read, Grep, Glob, Edit
---

# Scene Lane

## Mission

막 하나를 끝까지 책임진다. 프레임을 보고, 무엇이 잘못됐는지 판정하고, 자기
파일로 고칠 수 있는 것을 고치고, 나머지를 정확히 넘긴다.

프레임을 본 주체가 그대로 고친다. 판독과 수정을 나누면 결함을 글로 옮겨 적는
왕복이 한 번 더 생기고, 본 사람과 고치는 사람이 갈린다.

## Inputs

프롬프트로 다음을 받는다.

- `actId`, `filePath` — 소유한 막과 그 파일 (예: `feast`, `src/scenes/act08Feast.ts`)
- `intent` — 이 막이 보여줘야 하는 것, 한 문장
- `frames[]` — 자기 막 프레임의 절대 경로 3~5개
- `consoleErrors[]` — 이 막에서 난 콘솔 에러
- `WORLD_CONTRACT` — 팔레트·빌더 API·Shot 규약·기존 함정 목록

프레임은 Read 도구로 직접 연다. 반드시 **전부** 본다.

## Outputs

마지막 응답은 아래 JSON 하나여야 한다. 앞뒤에 다른 텍스트를 붙이지 않는다.

```json
{
  "actId": "feast",
  "edits": ["샷 9의 fov를 30에서 36으로 넓혀 두 인물이 함께 들어오게 함"],
  "defects": [
    {
      "frame": "feast-t60.jpeg",
      "what": "재회 장면이 가슴 위만 잡혀 두 인물이 잘림",
      "cause": "샷 9가 3 units 거리에 fov 30",
      "owner": "lane"
    }
  ],
  "escalations": [
    {
      "targetFile": "src/builders/figure.ts",
      "what": "팔꿈치 이음매에 각이 보임",
      "why": "소매와 팔뚝 원기둥의 반지름이 어긋나 실루엣이 끊김"
    }
  ],
  "verdict": "fixed",
  "touchedFiles": ["src/scenes/act08Feast.ts"]
}
```

`verdict`는 넷 중 하나다.

- `pass` — 결함 없음. 수정하지 않음
- `fixed` — 자기 파일에서 고쳤음
- `blocked` — 프레임이 없거나 콘솔 에러로 막이 렌더되지 않음
- `unknown` — 판단이 서지 않음. 이유를 `defects`에 적는다

## Must Not Do

- **`filePath` 외의 어떤 파일도 수정하지 않는다.** `src/builders/*`, `src/core/*`,
  다른 막 파일, 매니페스트, 설정 — 전부 금지. 고쳐야 하면 `escalations`에 적는다.
- 새 파일을 만들지 않는다.
- 서버를 띄우거나 명령을 실행하지 않는다. 타입체크는 배리어에서 한다.
- 서사나 샷 순서를 재설계하지 않는다. 마감 품질만 다룬다.
- 프레임을 보지 않고 코드만 읽고 판정하지 않는다. 판정의 근거는 항상 프레임이다.
- 출력 JSON 밖에 설명을 덧붙이지 않는다.

## Handoff Protocol

1. `frames[]`를 전부 Read로 연다.
2. 각 프레임을 `intent`와 대조한다. "이 프레임이 의도한 것을 보여주는가?"
3. 결함마다 `owner`를 정한다. 자기 파일로 고칠 수 있으면 `lane`, 공유 빌더가
   원인이면 `shared`.
4. `owner: "lane"`인 것만 Edit으로 고친다. 수정 이유를 코드 주석으로 남긴다.
5. `owner: "shared"`인 것은 `escalations`로 옮긴다.
6. JSON을 출력한다.

## Failure And Escalation

- `frames[]`가 비었거나 파일이 없다 → `verdict: "blocked"`, `defects`에 사유.
- `consoleErrors`가 비어 있지 않다 → 먼저 그것을 보고한다. 렌더가 깨진 상태의
  프레임에서 구도를 논하는 것은 의미가 없다.
- 결함의 원인을 특정할 수 없다 → 추측해서 고치지 않는다. `verdict: "unknown"`으로
  두고 관찰한 것만 적는다. 심청전에서 원인을 추측으로 짚었다가 40분을 쓴 전례가 있다.
- 자기 파일 밖을 고쳐야만 해결된다 → 고치지 말고 `escalations`. 이것이 이 하네스가
  병합 충돌 없이 병렬로 돌아가는 유일한 이유다.
```

- [ ] **Step 6: 스칼라 테일을 쓴다**

Create `.claude/agents/scalar-tail.md`:

```markdown
---
name: scalar-tail
description: 심청전 렌더 하네스의 스칼라 테일. 벡터 레인들이 올린 escalation을 받아 공유 빌더(src/builders/*, src/core/*)를 순차로 한 번에 수정한다. 여러 막이 같은 증상을 보고했더라도 고치는 것은 한 번이다.
---

# Scalar Tail

## Mission

공유 코드를 고친다. 벡터 레인은 구조적으로 여기 손댈 수 없으므로, `src/builders/*`
와 `src/core/*`의 모든 수정은 이 워커에서만 일어난다.

여덟 레인이 각자 "팔이 각져요"라고 여덟 번 보고해도 고치는 것은 한 번이다.
같은 증상이 여러 막에서 왔다는 사실은 중복이 아니라 **우선순위 신호**다.

## Inputs

- `escalations[]` — 대상 파일별로 그룹화된 목록. 각 항목에 `targetFile`, `what`,
  `why`, 그리고 이것을 올린 `actIds[]`
- `frames[]` — 근거가 된 프레임 경로
- `WORLD_CONTRACT` — 팔레트·빌더 API·Shot 규약·기존 함정 목록

## Outputs

```json
{
  "resolved": [
    {
      "targetFile": "src/builders/figure.ts",
      "change": "팔꿈치에 소매와 같은 반지름의 이음 캡을 넣어 실루엣을 잇는다",
      "affectedActs": ["farewell", "growing", "feast"]
    }
  ],
  "deferred": [{ "targetFile": "...", "what": "...", "why": "이번 라운드 범위 밖인 이유" }],
  "touchedFiles": ["src/builders/figure.ts"],
  "typecheck": "pass"
}
```

## Must Not Do

- `src/scenes/*`를 수정하지 않는다. 막 파일은 레인의 소유다. 씬 수정이 필요하면
  `deferred`에 적어 다음 벡터 라운드로 넘긴다.
- 요청되지 않은 리팩터링을 하지 않는다. escalation에 적힌 것만 다룬다.
- 한 escalation을 고치려고 공유 API 시그니처를 바꾸지 않는다. 여덟 막이 전부
  그 API를 쓴다. 시그니처를 바꿔야 한다면 `deferred`로 올리고 이유를 적는다.

## Handoff Protocol

1. escalation을 `targetFile` 순으로 정렬한다. 같은 파일은 한 번에 처리한다.
2. 근거 프레임을 Read로 확인한다. 보고 내용만 믿고 고치지 않는다.
3. 고친다. 왜 이 값인지 코드 주석으로 남긴다 — 특히 눈으로 보고 정한 수치라면.
4. `npm run build`를 돌린다.
5. JSON을 출력한다.

## Failure And Escalation

- 타입 오류가 남는다 → `typecheck: "fail"`과 함께 오류 원문을 출력한다. 되돌리지
  않는다. 다음 배리어가 판단한다.
- 한 escalation을 고치면 다른 막이 깨질 것이 확실하다 → 고치지 말고 `deferred`.
- 원인이 씬 쪽에 있다고 판단된다 → `deferred`에 적고 어느 막인지 지목한다.
```

- [ ] **Step 7: 검사기에 에이전트 문서 검사를 붙인다**

Modify `simcheong/scripts/check-render-harness.mjs` — `import` 줄과 `if (errors.length > 0)` 사이를 아래로 교체:

```js
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diskReader,
  loadManifest,
  validateAgentDoc,
  validateManifest,
} from './harness-core.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const worktreeRoot = resolve(projectDir, '..');

const errors = [];

if (!existsSync(join(worktreeRoot, 'HARNESS_MANIFEST.json'))) {
  errors.push('HARNESS_MANIFEST.json not found at worktree root');
} else {
  const manifest = loadManifest(worktreeRoot);
  errors.push(...validateManifest(manifest, diskReader(projectDir)));
}

for (const name of ['scene-lane', 'scalar-tail']) {
  const path = join(worktreeRoot, '.claude', 'agents', `${name}.md`);
  const source = existsSync(path) ? readFileSync(path, 'utf8') : null;
  errors.push(...validateAgentDoc(source, name));
}
```

- [ ] **Step 8: 검사기를 돌린다**

Run: `cd simcheong && npm run audit:check && npm run audit:test`
Expected: `render harness check OK` 그리고 `# fail 0`

- [ ] **Step 9: 커밋**

```bash
git add .claude/agents/scene-lane.md .claude/agents/scalar-tail.md simcheong/scripts/harness-core.mjs simcheong/scripts/harness-core.test.mjs simcheong/scripts/check-render-harness.mjs
git commit -m "feat(harness): 레인 워커와 스칼라 테일 역할 정의

레인은 자기 씬 파일만 소유하고 Edit/Read/Grep/Glob만 갖는다. 공유 빌더 수정은
도구 수준에서 불가능하고, 필요하면 escalation으로 올라간다. 역할 문서의 필수
섹션은 기존 Electron 하네스와 같은 이름을 쓰고 검사기가 강제한다."
```

---

### Task 4: 감사 절차 스킬과 하네스 상태 문서

사람이(또는 다음 세션의 에이전트가) 이 하네스를 어떻게 돌리는지 한 파일에 적는다.

**Files:**
- Create: `.claude/skills/render-audit/SKILL.md`
- Create: `HARNESS_STATE.md` (worktree 루트)
- Modify: `simcheong/scripts/check-render-harness.mjs` (두 파일 존재 검사)

- [ ] **Step 1: 감사 스킬을 쓴다**

Create `.claude/skills/render-audit/SKILL.md`:

```markdown
---
name: render-audit
description: 심청전 절차적 Three.js 렌더의 시각 감사를 배열형으로 돌린다. 33개 프레임을 한 번에 캡처한 뒤 막별 레인 8개가 동시에 판독·수정하고, 공유 빌더 수정은 스칼라 테일이 한 번에 처리한다. "렌더 감사", "막 점검", "프레임 확인", "심청전 손보기", "audit" 요청 시 사용한다. 다른 절차적 렌더 프로젝트에도 HARNESS_MANIFEST.json의 lanes만 교체하면 그대로 쓴다.
---

# Render Audit

## 언제 쓰는가

- 심청전 8막 중 하나 이상의 마감 품질을 올려야 할 때
- 빌더나 팔레트를 바꾼 뒤 여덟 막에 미친 영향을 확인해야 할 때
- 새 막을 추가한 뒤 전체를 점검할 때

## 왜 이런 모양인가

프레임 캡처는 싸고 일괄 처리가 되지만 판독은 비싸다. 이 둘을 묶어 한 번에
하나씩 돌리면 왕복이 프레임 수만큼 난다. 심청전 초판이 그랬고 40 왕복이 났다.
캡처를 앞으로 몰아 한 번에 끝내면 남는 것은 판독뿐이고, 그것만 병렬화하면 된다.

## 절차

### 0. 준비

```bash
cd simcheong && npm run audit:check
```

실패하면 매니페스트가 코드와 어긋난 것이다. 고치기 전에는 진행하지 않는다.

서버가 필요하다. 떠 있지 않으면 `npm run dev`.

### 1. 캡처 v0 (배리어)

```bash
cd simcheong && npm run audit:capture
```

`audit/frames/`에 프레임 33장, `console.json`, `inspect.json`이 생긴다.
콘솔 에러가 0이 아니면 **레인을 돌리기 전에** 그것부터 고친다. 깨진 렌더의
프레임에서 구도를 논하는 것은 의미가 없다.

### 2. 벡터 라운드 1

`HARNESS_MANIFEST.json`의 `lanes`에서 열 하나씩 슬라이스해 `scene-lane`
에이전트를 **한 메시지에서 전부** 띄운다. 순차로 띄우면 병렬화가 무의미하다.

각 레인 프롬프트에 넣을 것:

- `actId` = `lanes.id[i]`, `filePath` = `lanes.file[i]`, `intent` = `lanes.intent[i]`
- `frames[]` = `lanes.captureAt[i]`를 `<laneId>-t<SS>.jpeg`로 바꾼 절대 경로
- `consoleErrors[]` = `console.json[laneId]`
- `WORLD_CONTRACT` = 아래 「브로드캐스트」 절 전문

### 3. 리듀스

레인 출력을 `actId` 사전순으로 모은다. 그다음 **레인의 자기 보고를 믿지 말고**
실제로 검사한다.

```bash
git diff --name-only
```

- 어떤 레인이 자기 `filePath` 밖을 건드렸으면 그 경로만 `git checkout -- <path>`로
  되돌리고, 그 발견을 escalation으로 옮긴다.
- `escalations`를 `targetFile`별로 묶는다. 같은 대상에 대한 서로 다른 레인의
  보고는 **합치지 않고 전부 보존한다.** 중복이 곧 우선순위다.

### 4. 배리어

```bash
cd simcheong && npm run build && npm run audit:capture
```

### 5. 벡터 라운드 2

새 프레임으로 레인을 다시 띄운다. 이번에는 "고쳐졌는가"를 확인한다.

### 6. 스칼라 테일

묶은 escalation을 `scalar-tail` 에이전트 하나에 넘긴다. 순차 1회다.

### 7. 최종 배리어

```bash
cd simcheong && npm run build && npm run audit:capture && npm run audit:check
```

프레임을 마지막으로 훑고 남은 것을 보고한다. **벡터 라운드는 여기서 끝이다.**
결함이 남았으면 더 돌리지 말고 목록으로 보고한다.

## 브로드캐스트 (WORLD_CONTRACT)

모든 레인에 **동일하게** 복사한다. 레인마다 같은 함정을 다시 발견하면 병렬화의
이득이 사라진다.

- 팔레트: `src/core/palette.ts` — 오방색(청·적·황·백·흑), 단청 안료, `SKY` 무드
- 빌더: `roof`, `hanok`, `temple`, `figure`, `nature`, `water`, `ship`, `dragon`,
  `undersea`, `lotus`, `props`
- 샷 문법: `Pose6 = [px, py, pz, tx, ty, tz]`. `move()`, `hold()`, `orbitShot()`
- 눈높이는 **피사체 발밑 지형고도 + 오프셋**으로 쓴다. 절대 y를 박으면 지형이
  ±1.5 흔들릴 때 인물이 화면 밖으로 나간다.

### 이미 밟은 함정 (다시 밟지 말 것)

| 함정 | 증상 |
|---|---|
| `vertexColors: true` + color 속성 없음 | 조명과 무관하게 완전 검정. 경고 없음. `meshOf`가 막아준다 |
| `FogExp2` 밀도 | 이 씬 규모에서 쓸 수 있는 값은 0.003–0.012. 0.017이면 화면이 베이지로 뭉갠다 |
| 지형 패치 가장자리 | 340 units 밖은 허공. `stage.setFloor()` 필수 |
| envMap 없는 고 metalness | 검은 구멍. `stillWater()`를 쓴다 |
| `Pose6` 슬롯 | y 자리에 z 상수를 넣으면 막 전체가 안개가 된다 |
| `ShaderMaterial` | three의 자동 포그·라이트 유니폼을 못 받는다. `Ocean.update(t, stage)`가 stage를 필수로 받는 이유 |
| 이목구비 크기 | 해부학적으로 맞는 크기는 촬영 거리에서 0픽셀이다. 눈썹이 표정 유무를 가른다 |
| 방향 추측 | `simcheong.facing(name)`으로 잰다. 등을 돌렸다고 확신했다가 `dot 0.70`이었던 전례 |

## 도구

페이지에 이미 있다.

```js
simcheong.goTo(actIndex, seconds)   // 점프 후 일시정지
simcheong.inspect(minSize)          // 큰 오브젝트의 월드 바운딩박스
simcheong.facing(name)              // 이 오브젝트가 카메라를 보는가 (dot, correction)
simcheong.toggle(name, visible)     // 명명된 서브트리 끄고 켜기
simcheong.camera()                  // 현재 카메라 pos/dir/fov
```

## 다른 프로젝트에 재사용하기

`HARNESS_MANIFEST.json`의 `lanes`(id/file/actIndex/captureAt/intent)와 `shared`를
교체한다. 대상 페이지가 `window.simcheong.goTo(index, seconds)`와 `inspect()`를
노출하면 나머지는 그대로 돈다. `domain`과 `url`도 함께 바꾼다.
```

- [ ] **Step 2: 하네스 상태 문서를 쓴다**

Create `HARNESS_STATE.md` (worktree 루트):

```markdown
# Render Harness State

## 무엇인가

`simcheong/` 절차적 렌더의 시각 감사를 배열형으로 돌리는 하네스.
설계: `docs/superpowers/specs/2026-08-02-vectorized-render-harness-design.md`
절차: `.claude/skills/render-audit/SKILL.md`

## 배열 구조

| 요소 | 값 |
|---|---|
| 브로드캐스트 | `WORLD_CONTRACT` — 팔레트, 빌더 API, Shot 규약, 함정 8개 |
| 벡터 레인 | `scene-lane` × `lanes.id.length` (현재 8) |
| 레인 소유권 | `src/scenes/actNN*.ts` 하나 |
| 마스크 | `pass` / `tail` / `violation` / `blocked` — 리듀스가 계산 |
| 리듀스 | `actId` 사전순. 파일 소유권 분리로 병합 충돌 없음 |
| 스칼라 테일 | `scalar-tail` × 1 — `src/builders/*`, `src/core/*` 전담 |
| 라운드 상한 | 벡터 2회 |

## 기존 하네스와의 관계

이 저장소에는 하네스가 둘이다.

- `docs/harness/` — Electron 앱(`src/main.js` 등)용 순차 4역할 하네스. **건드리지 않는다.**
- 이 문서 — `simcheong/` 절차적 렌더용 배열형 하네스.

도메인과 대상 파일이 겹치지 않으므로 병존한다. `scripts/check-harness.js`(전자)와
`simcheong/scripts/check-render-harness.mjs`(후자)는 서로 독립이다.

## 드리프트 위험

- `HARNESS_MANIFEST.json`의 `lanes.id`는 `src/scenes/index.ts`의 `ACTS`가 내보내는
  `Act.id`와 순서까지 같아야 한다. 막을 추가·재정렬하면 매니페스트를 함께 고친다.
  `npm run audit:check`가 이것을 잡는다.
- `shared` 목록에 새 빌더를 추가하는 것을 잊으면, 레인이 그 파일을 고쳐도
  violation으로 잡히지 않는다. 새 파일을 `src/builders/`나 `src/core/`에 만들면
  매니페스트에도 넣는다.
- `captureAt`의 초는 각 막의 샷 경계에 맞춰 고른 값이다. 샷 리스트를 크게 바꾸면
  캡처 시점도 다시 골라야 한다.

## 모델 선택

`scene-lane`은 모델을 지정하지 않아 세션 모델을 상속한다. 여덟 레인을 동시에
띄우므로 비용이 부담되면 `.claude/agents/scene-lane.md` 프론트매터에
`model: sonnet`을 넣는다. 판독은 시각 과제라 vision이 있는 모델이면 된다.

## 변경 이력

- 2026-08-02: 최초 작성. 8레인, 33프레임.
```

- [ ] **Step 3: 검사기에 두 파일 존재 검사를 붙인다**

Modify `simcheong/scripts/check-render-harness.mjs` — `for (const name of [...])` 루프 **뒤**에 추가:

```js
const requiredDocs = [
  ['HARNESS_STATE.md', join(worktreeRoot, 'HARNESS_STATE.md')],
  ['.claude/skills/render-audit/SKILL.md', join(worktreeRoot, '.claude', 'skills', 'render-audit', 'SKILL.md')],
];
for (const [label, path] of requiredDocs) {
  if (!existsSync(path)) errors.push(`required harness doc "${label}" does not exist`);
}
```

- [ ] **Step 4: 전체 검증을 돌린다**

Run: `cd simcheong && npm run audit:test && npm run audit:check && npm run build`
Expected: `# fail 0`, `render harness check OK`, `✓ built in ...`

Run: `node scripts/check-harness.js` (worktree 루트에서)
Expected: 기존 Electron 하네스 검사가 여전히 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add .claude/skills/render-audit/SKILL.md HARNESS_STATE.md simcheong/scripts/check-render-harness.mjs
git commit -m "docs(harness): 감사 절차 스킬과 하네스 상태 문서

절차를 한 파일에 적어 다음 세션이 같은 순서로 돌릴 수 있게 한다. 브로드캐스트에
이미 밟은 함정 여덟 개를 넣어 레인이 같은 것을 다시 발견하지 않게 한다.
기존 Electron 하네스와의 경계와 드리프트 위험도 함께 명시."
```

---

### Task 5: 캡처 v0과 콘솔 게이트

하네스의 첫 실행. 레인을 띄우기 전에 렌더가 성한지부터 확인한다.

**Files:**
- Modify: 없음 (실행 태스크). 콘솔 에러가 나오면 해당 파일을 고친다.

- [ ] **Step 1: 서버를 띄운다**

Run: `cd simcheong && npm run dev` (백그라운드)
Expected: `Local: http://localhost:5178/`

- [ ] **Step 2: 캡처 v0을 돌린다**

Run: `cd simcheong && npm run audit:capture`
Expected: `captured 33 frames to audit/frames`, `console errors: 0`

- [ ] **Step 3: 콘솔 게이트**

Run: `cat simcheong/audit/frames/console.json`
Expected: 모든 막의 배열이 비어 있거나, `favicon.ico` 404 같은 무해한 항목만.

`type: "pageerror"`나 `type: "error"`가 있으면 **여기서 멈춘다.** 해당 막 파일을
읽고 원인을 고친 뒤 Step 2로 돌아간다. 깨진 렌더의 프레임으로 레인을 돌리면
여덟 레인이 전부 같은 크래시를 보고하는 낭비가 난다.

- [ ] **Step 4: 프레임 샘플을 눈으로 확인한다**

Read 도구로 다음 셋을 연다.
- `simcheong/audit/frames/indangsu-t31.jpeg`
- `simcheong/audit/frames/lotus-t47.jpeg`
- `simcheong/audit/frames/feast-t08.jpeg`

Expected: 각각 폭풍 뱃머리의 심청, 열린 연꽃과 일어서는 심청, 궁궐 마당의 잔치.
셋 다 UI 바 없이 보여야 한다. 하나라도 검거나 엉뚱하면 캡처 타이밍(`REBUILD_MS`)
문제이므로 2200으로 올려 다시 돌린다.

- [ ] **Step 5: 커밋 (프레임은 gitignore이므로 코드 변경이 있을 때만)**

콘솔 에러를 고쳤다면:

```bash
git add simcheong/src
git commit -m "fix: 캡처 v0에서 드러난 콘솔 에러 수정"
```

고칠 것이 없었으면 이 단계를 건너뛴다.

---

### Task 6: 벡터 라운드 1과 리듀스

여덟 레인을 한 번에 띄우고, 레인 말을 믿지 않고 실제 diff로 판정한다.

**Files:**
- Modify: `src/scenes/act01Farewell.ts` ~ `src/scenes/act08Feast.ts` (각 레인이 자기 것만)

- [ ] **Step 1: 레인 여덟 개를 한 메시지에서 띄운다**

`scene-lane` 에이전트 8개를 **하나의 메시지 안에서** 동시에 호출한다. 순차로
띄우면 이 하네스의 존재 이유가 사라진다.

레인 i의 프롬프트 템플릿 (`HARNESS_MANIFEST.json`의 열 i를 채워 넣는다):

```
너는 scene-lane 레인 i다.

actId: <lanes.id[i]>
filePath: simcheong/<lanes.file[i]>
intent: <lanes.intent[i]>

frames (전부 Read로 열 것):
  <worktree>/simcheong/audit/frames/<id>-t<SS>.jpeg   (captureAt 전부)

consoleErrors: <console.json[id]>

WORLD_CONTRACT:
<.claude/skills/render-audit/SKILL.md 의 「브로드캐스트」 절 전문>

지시:
1. 프레임을 전부 읽는다.
2. intent와 대조해 결함을 찾는다.
3. filePath 하나만 Edit으로 고친다. 다른 파일은 절대 건드리지 않는다.
4. 공유 빌더가 원인이면 고치지 말고 escalations에 적는다.
5. 마지막 응답은 scene-lane 계약의 JSON 하나여야 한다.
```

- [ ] **Step 2: 소유권 위반을 실제 diff로 검사한다**

Run: `git diff --name-only`
Expected: `simcheong/src/scenes/act0*.ts`만 나온다.

`simcheong/src/builders/*`나 `simcheong/src/core/*`가 있으면 그 경로를 되돌린다:

```bash
git checkout -- simcheong/src/builders simcheong/src/core
```

그리고 그 레인의 발견을 escalation 목록에 손으로 옮긴다. 되돌린 사실을 기록한다.

- [ ] **Step 3: escalation을 대상 파일별로 묶는다**

여덟 레인의 `escalations`를 모아 `targetFile`로 그룹화한다. 같은 대상에 대한
서로 다른 레인의 항목은 **합치지 않는다.** 각 항목에 올린 `actId`를 붙여 둔다.

결과를 `simcheong/audit/escalations.json`에 쓴다 (gitignore 대상이므로 커밋되지 않는다).

- [ ] **Step 4: 마스크를 계산해 표로 적는다**

레인의 자기 보고(`verdict`)를 그대로 쓰지 않는다. 실제 diff와 타입체크 결과로
다시 판정한 것이 마스크다. 여덟 줄을 그대로 적는다.

```
laneId        verdict   touched-ok  defects  escalations  ->  mask
farewell      fixed     yes         0        1                tail
growing       fixed     yes         1        0                tail? no -> fixed
...
```

판정 규칙:

```
violation = touchedFiles ⊄ {자기 filePath}        (Step 2에서 되돌린 레인)
blocked   = verdict == "blocked"
tail      = escalations.length > 0
pass      = 위 셋 다 아니고 defects.length == 0
```

`violation`이 하나라도 있으면 그 레인의 수정은 되돌려진 상태이므로, 라운드 2에서
같은 결함을 다시 만난다. 그것이 정상이다.

- [ ] **Step 5: 배리어 — 타입체크와 재캡처**

Run: `cd simcheong && npm run build`
Expected: `✓ built in ...`

타입 오류가 나면 어느 레인의 수정인지 파일로 특정해 고친다.

Run: `cd simcheong && npm run audit:capture`
Expected: `captured 33 frames`, `console errors: 0`

- [ ] **Step 6: 커밋**

```bash
git add simcheong/src/scenes
git commit -m "fix(scenes): 벡터 라운드 1 — 막별 구도·타이밍 수정

여덟 레인이 각자 자기 막의 프레임을 읽고 자기 파일만 수정했다. 공유 빌더가
원인인 결함은 손대지 않고 escalation으로 올렸다."
```

---

### Task 7: 벡터 라운드 2, 스칼라 테일, 최종 검증

**Files:**
- Modify: `src/builders/*`, `src/core/*` (스칼라 테일만)
- Modify: `src/scenes/*` (라운드 2 레인)
- Modify: `HARNESS_MANIFEST.json` (`runs` 기록 추가)

- [ ] **Step 1: 벡터 라운드 2를 띄운다**

Task 6 Step 1과 같은 방식으로 `scene-lane` 8개를 다시 한 메시지에서 띄운다.
프롬프트는 같되 지시 첫 줄을 바꾼다:

```
이것은 라운드 2다. 라운드 1에서 네가 한 수정이 실제로 반영된 새 프레임을 본다.
1. 프레임을 전부 읽는다.
2. 라운드 1의 결함이 해결됐는지 먼저 확인한다.
3. 남은 결함만 다룬다. 새 결함을 찾겠다고 범위를 넓히지 않는다.
```

- [ ] **Step 2: 소유권 검사와 escalation 병합**

Run: `git diff --name-only`
Task 6 Step 2와 같은 절차. 새 escalation을 `audit/escalations.json`에 합친다.

- [ ] **Step 3: 스칼라 테일을 한 번 띄운다**

`scalar-tail` 에이전트 하나를 호출한다.

```
너는 scalar-tail이다.

escalations: <audit/escalations.json 전문, targetFile로 그룹화됨>
frames: <근거가 된 프레임의 절대 경로>

WORLD_CONTRACT:
<.claude/skills/render-audit/SKILL.md 의 「브로드캐스트」 절 전문>

지시:
1. targetFile 순으로 처리한다. 같은 파일은 한 번에.
2. 근거 프레임을 Read로 확인한다. 보고만 믿고 고치지 않는다.
3. src/scenes/*는 건드리지 않는다. 필요하면 deferred로 올린다.
4. 공유 API 시그니처를 바꾸지 않는다. 여덟 막이 그것을 쓴다.
5. npm run build를 돌린다.
6. scalar-tail 계약의 JSON 하나로 답한다.
```

이미 알려진 escalation 셋은 반드시 포함한다.
- `src/builders/figure.ts` — 팔꿈치 이음매의 각짐
- `src/builders/figure.ts` — 군중 idle 동작의 단조로움 (8막이 요청)
- `src/scenes/act02Growing.ts` — 15년 경과가 급함 → 이것은 **씬**이므로 테일이
  아니라 라운드 2 레인이 다룬다. 테일에 넘기지 않는다.

- [ ] **Step 4: 최종 배리어**

Run: `cd simcheong && npm run build && npm run audit:capture && npm run audit:check && npm run audit:test`
Expected: 빌드 통과, `captured 33 frames`, `console errors: 0`, `render harness check OK`, `# fail 0`

Run (worktree 루트): `node scripts/check-harness.js`
Expected: 기존 Electron 하네스도 여전히 통과.

- [ ] **Step 5: 최종 프레임을 훑는다**

`simcheong/audit/frames/`의 33장 중 라운드에서 결함이 보고됐던 프레임을 Read로
다시 연다. 해결됐으면 그 레인은 `pass`다.

**여기가 끝이다.** 결함이 남아 있어도 벡터 라운드를 더 돌리지 않는다. 남은 것을
목록으로 보고한다.

- [ ] **Step 6: 실행 기록을 매니페스트에 남긴다**

Modify `HARNESS_MANIFEST.json` — `runs` 배열에 항목 추가 (날짜와 숫자는 실제 값으로):

```json
  "runs": [
    {
      "date": "2026-08-02",
      "rounds": 2,
      "frames": 33,
      "lanesPassed": 8,
      "escalationsResolved": 3,
      "escalationsDeferred": 0,
      "note": "최초 실행. 팔꿈치 이음매와 군중 idle을 테일에서 처리."
    }
  ]
```

- [ ] **Step 7: 커밋**

```bash
git add simcheong/src HARNESS_MANIFEST.json
git commit -m "fix: 벡터 라운드 2와 스칼라 테일 반영

공유 빌더 수정은 스칼라 테일에서 한 번에 처리했다. 여덟 레인이 같은 증상을
여러 번 보고했지만 고친 것은 한 번이다. 실행 기록을 매니페스트 runs에 남긴다."
```

- [ ] **Step 8: lessons.md를 갱신한다**

Modify `tasks/lessons.md` — 이번 실행에서 새로 드러난 함정이 있으면 같은 형식으로
추가한다 (`Why:` / `How to apply:` 포함). 없으면 건너뛴다.

새 함정을 추가했다면 `.claude/skills/render-audit/SKILL.md`의 「이미 밟은 함정」
표에도 같은 항목을 넣는다. 두 곳이 어긋나면 다음 레인이 그것을 다시 밟는다.

```bash
git add tasks/lessons.md .claude/skills/render-audit/SKILL.md
git commit -m "docs: 이번 감사에서 드러난 함정을 브로드캐스트에 추가"
```

---

## 완료 기준

- `npm run build` 통과
- `npm run audit:test` — `# fail 0`
- `npm run audit:check` — `render harness check OK`
- `node scripts/check-harness.js` — 기존 하네스 무결성 유지
- `audit/frames/console.json` — 에러 0
- 하네스 파일 7개 존재: `HARNESS_STATE.md`, `HARNESS_MANIFEST.json`,
  `.claude/agents/scene-lane.md`, `.claude/agents/scalar-tail.md`,
  `.claude/skills/render-audit/SKILL.md`, `simcheong/scripts/capture.mjs`,
  `simcheong/scripts/check-render-harness.mjs`
  (+ `harness-core.mjs`와 그 테스트, + `audit/frames/` 산출물 디렉터리)
- 감사 왕복 3회 이하 (캡처 v0 / v1 / v2)
