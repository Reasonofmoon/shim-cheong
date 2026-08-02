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
    } else {
      // framePath() rounds seconds to a whole-second stamp, so two captureAt
      // values that round to the same integer produce the same file name and
      // the second screenshot silently overwrites the first. The
      // duplicate-frame guard in capture.mjs can't see this — it only ever
      // finds one file on disk, not two identical writes.
      const roundedSeen = new Map();
      const roundedDupes = new Set();
      for (const seconds of captureAt) {
        const stamp = Math.round(seconds);
        const prior = roundedSeen.get(stamp);
        if (prior !== undefined) roundedDupes.add(`${prior}s and ${seconds}s -> t${stamp}`);
        else roundedSeen.set(stamp, seconds);
      }
      if (roundedDupes.size > 0) {
        errors.push(
          `lanes.captureAt[${i}] has values that round to the same frame stamp: ` +
            `${[...roundedDupes].join(', ')}`,
        );
      }
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

/**
 * `scene-lane.md`의 `tools:` frontmatter가 여전히 `Write`와 `Bash`를 내주지
 * 않는지 확인한다.
 *
 * 소유권을 강제하는 계층은 둘뿐이다: 이 frontmatter(새 파일과 셸 명령을 막음)와
 * 리듀스의 사후 `git diff --name-only` 감사(공유 파일 위반을 잡음). 어느 쪽도
 * 완전하지 않지만 — `Edit`은 경로를 제한하지 않으므로 레인은 여전히 자기 파일이
 * 아닌 *기존* 파일을 고칠 수 있다 — 둘 중 하나가 조용히 사라지면 남는 계층이
 * 하나로 줄어든다. 이 검사가 없으면 그 사실을 아무도 자동으로 알 수 없다.
 */
export function validateSceneLaneTools(source) {
  if (source === null) return ['scene-lane.md does not exist'];
  const match = source.match(/^tools:\s*(.*)$/m);
  if (!match) return ['scene-lane.md frontmatter is missing a tools: line'];

  const tools = match[1].split(',').map((t) => t.trim());
  const errors = [];
  if (tools.includes('Write')) {
    errors.push('scene-lane.md tools: grants Write, which breaks file-ownership enforcement');
  }
  if (tools.includes('Bash')) {
    errors.push('scene-lane.md tools: grants Bash, which breaks file-ownership enforcement');
  }
  return errors;
}
