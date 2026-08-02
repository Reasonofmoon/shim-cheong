#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diskReader,
  loadManifest,
  validateAgentDoc,
  validateManifest,
  validateSceneLaneTools,
} from './harness-core.mjs';

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

for (const name of ['scene-lane', 'scalar-tail']) {
  const path = join(worktreeRoot, '.claude', 'agents', `${name}.md`);
  const source = existsSync(path) ? readFileSync(path, 'utf8') : null;
  errors.push(...validateAgentDoc(source, name));
  // Only scene-lane's tools: matters here — it's one of the two ownership
  // enforcement layers (see harness-core.mjs). scalar-tail is meant to have
  // Write/Bash; it owns the shared builders and runs the build.
  if (name === 'scene-lane') errors.push(...validateSceneLaneTools(source));
}

const requiredDocs = [
  ['HARNESS_STATE.md', join(worktreeRoot, 'HARNESS_STATE.md')],
  ['.claude/skills/render-audit/SKILL.md', join(worktreeRoot, '.claude', 'skills', 'render-audit', 'SKILL.md')],
];
for (const [label, path] of requiredDocs) {
  if (!existsSync(path)) errors.push(`required harness doc "${label}" does not exist`);
}

if (errors.length > 0) {
  console.error('render harness check FAILED:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('render harness check OK');
