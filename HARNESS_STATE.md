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
| 리듀스 | `actId` 사전순. 소유권은 계약 + 사후 `git diff` 감사 — 구조적 보장 아님 (아래 드리프트 참조) |
| 스칼라 테일 | `scalar-tail` × 1 — `src/builders/*`, `src/core/*` 전담 |
| 라운드 상한 | 벡터 2회 |

## 이 저장소의 범위

이 하네스는 `simcheong/` 절차적 렌더 전용이다. 원래는 다른 프로젝트(Electron
영상 도구)용 순차 하네스와 한 저장소에 병존했고, 그쪽은 공개 대상이 아니라
여기에 포함하지 않았다. 그래서 이 저장소에는 검사기가 하나뿐이다 —
`simcheong/scripts/check-render-harness.mjs`.


## 드리프트 위험

- `HARNESS_MANIFEST.json`의 `lanes.id`는 `src/scenes/index.ts`의 `ACTS`가 내보내는
  `Act.id`와 순서까지 같아야 한다. 막을 추가·재정렬하면 매니페스트를 함께 고친다.
  `npm run audit:check`는 `index.ts`의 *import 문 순서*만 정적으로 검사하고,
  실제로 `goTo`가 도는 순서는 파일 맨 아래의 `ACTS` 배열 리터럴이다 — 임포트는
  그대로 두고 `ACTS`만 재정렬하면 `audit:check`는 통과하지만 캡처는 엉뚱한
  막을 찍는다. 이 경우는 `npm run audit:capture`가 잡는다: `capture.mjs`가
  각 시크 뒤 `window.simcheong.state().actId`를 그 레인의 id와 대조해,
  다르면 그 레인만 실패로 기록하고 나머지 레인은 계속 진행한다.
- `shared` 목록에 새 빌더를 추가하는 것을 잊으면, 레인이 그 파일을 고쳐도
  violation으로 잡히지 않는다. 새 파일을 `src/builders/`나 `src/core/`에 만들면
  매니페스트에도 넣는다.
- `captureAt`의 초는 각 막의 샷 경계에 맞춰 고른 값이다. 샷 리스트를 크게 바꾸면
  캡처 시점도 다시 골라야 한다.
- **소유권은 보장이 아니라 계약이다.** `scene-lane.md`는 `Write`/`Bash`를 주지
  않지만 `Edit`은 경로를 제한하지 않으므로, 레인은 자기 파일이 아닌 *기존*
  파일도 고칠 수 있다. 리듀스의 `git diff --name-only` 감사는 전체 worktree의
  변경 파일 **합집합**만 보므로 공유 파일 위반(합집합 밖)은 잡지만, 레인 A가
  레인 B의 막 파일을 건드리는 레인 간 위반(둘 다 합집합 안)은 잡지 못한다.
  이를 실제 보장으로 만들려면 팬아웃 전에 레인별 소유 파일을 해시해 두고,
  리듀스에서 레인별로 diff해 그 해시와 비교해야 한다 — 지금은 구현되어
  있지 않다.

## 모델 선택

`scene-lane`은 모델을 지정하지 않아 세션 모델을 상속한다. 여덟 레인을 동시에
띄우므로 비용이 부담되면 `.claude/agents/scene-lane.md` 프론트매터에
`model: sonnet`을 넣는다. 판독은 시각 과제라 vision이 있는 모델이면 된다.

## 변경 이력

- 2026-08-02: 최초 작성. 8레인, 33프레임.
