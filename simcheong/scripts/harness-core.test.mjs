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

test('레인 captureAt에 반올림 시 같은 프레임 스탬프가 되는 값이 있으면 보고한다', () => {
  const { manifest, readFile } = fixture();
  // framePath()는 Math.round()로 반올림한다: 4와 4.4는 둘 다 farewell-t04.jpeg가
  // 되어 두 번째 스크린샷이 첫 번째를 조용히 덮어쓴다.
  manifest.lanes.captureAt[0] = [4, 4.4, 24];
  const errors = validateManifest(manifest, readFile);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /same frame stamp/);
});

test('captureAt가 반올림 없이 전부 다르면 통과한다', () => {
  const { manifest, readFile } = fixture();
  manifest.lanes.captureAt[0] = [4, 5, 24];
  assert.deepEqual(validateManifest(manifest, readFile), []);
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

import { validateAgentDoc, REQUIRED_AGENT_SECTIONS, validateSceneLaneTools } from './harness-core.mjs';

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

test('scene-lane.md가 없으면 보고한다', () => {
  const errors = validateSceneLaneTools(null);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not exist/);
});

test('scene-lane.md에 tools: 줄이 없으면 보고한다', () => {
  const errors = validateSceneLaneTools('---\nname: scene-lane\n---\n');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing a tools:/);
});

test('scene-lane.md의 tools:가 Write를 내주면 보고한다', () => {
  const errors = validateSceneLaneTools('---\ntools: Read, Grep, Glob, Edit, Write\n---\n');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /grants Write/);
});

test('scene-lane.md의 tools:가 Bash를 내주면 보고한다', () => {
  const errors = validateSceneLaneTools('---\ntools: Read, Grep, Glob, Edit, Bash\n---\n');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /grants Bash/);
});

test('scene-lane.md의 tools:에 Write도 Bash도 없으면 통과한다', () => {
  const errors = validateSceneLaneTools('---\ntools: Read, Grep, Glob, Edit\n---\n');
  assert.deepEqual(errors, []);
});
