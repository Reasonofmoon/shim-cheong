# 벡터화 렌더 하네스 설계

- 날짜: 2026-08-02
- 대상 저장소: `video-auto` (worktree `claude/lotr-threejs-render-03eab7`)
- 대상 프로젝트: `simcheong/` — 심청전 8막 절차적 Three.js 렌더

## 1. 문제

심청전을 만들 때 시간을 잡아먹은 곳은 지오메트리가 아니라 **확인 루프**였다.

- 8개 막을 하나씩 순차로 작성했다.
- 감사가 전부 직렬이었다: 서버 점프 → 스크린샷 1장 → 판독 → 수정 → 반복.
  왕복이 40회 가까이 났고, 각 왕복은 1장의 프레임만 다뤘다.
- 같은 결함을 여러 막에서 따로 발견했다. 예를 들어 `vertexColors` 미설정으로
  인한 검정 렌더는 문살·창틀·감 열매에서 각각 다른 시점에 드러났다.

핵심 관찰: **프레임 캡처는 싸고 일괄 처리가 되지만, 판독은 비싸다.**
심청전에서는 이 둘을 묶어 한 번에 하나씩 돌렸다. 분리하면 판독을 병렬화할 수 있다.

## 2. 목표와 비목표

### 목표

1. 재사용 가능한 하네스를 **파일로** 남긴다. 세션이 끝나도 다음 작품에 쓸 수 있어야 한다.
2. 그 하네스의 첫 실행으로 심청전의 남은 거친 부분을 실제로 고쳐, 하네스가
   허구가 아님을 증명한다.
3. 감사 왕복을 40회 규모에서 3회로 줄인다.

### 비목표

- 심청전의 서사·연출 재설계. 하네스는 마감 품질을 올리는 도구이지 각본가가 아니다.
- 기존 `docs/harness/`(Electron 앱용 순차 하네스) 대체. 도메인이 다르므로 병존한다.
- 완전 자동 수렴. 벡터 라운드에 상한을 두고, 남으면 멈추고 보고한다.

## 3. 배열 구조

### 3.1 브로드캐스트 (스칼라 → 전 레인)

`WORLD_CONTRACT` 하나가 모든 레인에 동일하게 복사된다.

- 오방색·단청 팔레트 (`src/core/palette.ts`)
- 빌더 API 시그니처 (`roof`, `hanok`, `figure`, `water`, `temple`, `lotus`, `props` …)
- `Shot` / `Pose6` 규약 — `[px, py, pz, tx, ty, tz]`
- 검증 명령 — `npm run build`
- **`tasks/lessons.md`의 함정 10개**

마지막 항목이 브로드캐스트의 존재 이유다. 레인마다 같은 함정을 다시 발견하면
병렬화의 이득이 사라진다. 특히 다음 다섯은 반드시 사전 고지한다.

| 함정 | 증상 |
|---|---|
| `vertexColors: true` + color 속성 없음 | 조명과 무관하게 완전 검정. 경고 없음 |
| `FogExp2` 밀도 밴드 | 이 씬 규모에서 쓸 수 있는 값은 0.003–0.012 |
| 지형 패치 가장자리 | 340 units 밖은 허공. `stage.setFloor()` 필수 |
| envMap 없는 고 metalness | 검은 구멍. `stillWater()` 사용 |
| `Pose6` 슬롯 순서 | y 자리에 z 상수를 넣으면 막 전체가 안개가 된다 |

### 3.2 벡터 레인 (동형 워커, N = `lanes.id.length`)

```
입력   { actId, filePath, intent, frames[], consoleLog, WORLD_CONTRACT }
출력   { actId, edits[], defects[], escalations[], verdict, touchedFiles[] }
불변식 자기 src/scenes/actNN*.ts 하나만 쓴다
```

레인은 전부 같은 절차를 밟는다. 조건 분기가 없다.

1. 자기 막 프레임(3~4장)을 읽는다.
2. `intent`와 대조해 결함을 적는다.
3. 자기 파일만으로 고칠 수 있는 것을 고친다.
4. 나머지는 `escalations[]`에 대상 파일과 함께 적고 **손대지 않는다**.
5. 고정 스키마로 보고한다.

`verdict`는 **레인이 스스로 보고하는** 값으로 `pass` / `fixed` / `blocked` /
`unknown` 넷 중 하나다. 뒤의 마스크는 **리듀스가 계산하는** 별개의 값이다.
레인의 자기 보고를 그대로 믿지 않고 실제 수정 파일 목록과 타입체크 결과로
다시 판정한다는 뜻이다.

#### 왜 공유 빌더를 못 만지게 하는가

심청전의 남은 결함들은 결함의 축과 파일의 축이 어긋나 있다.

- "팔 관절이 각짐" → `src/builders/figure.ts` — 8막 전부가 공유
- "군중 애니메이션 단조로움" → `act08` + `figure.ts`
- "2막 15년 경과가 급함" → `act02`만

레인이 공유 빌더를 만지면 8개 레인이 같은 파일을 동시에 고친다. 이 거래는
병렬도를 조금 낮추는 대신, 계약이 지켜지는 한 병합 비용을 0으로 만든다. 8개
레인이 각자 "팔이 각져요"라고 8번 보고해도 고치는 것은 스칼라 테일에서 한
번이다. 계약이 지켜졌는지는 강제되지 않고 사후에 감사될 뿐이다 — 3.4절 참조.

### 3.3 마스크 (불리언, 브랜치리스)

레인 실행 중에는 분기하지 않는다. 전부 수집한 뒤 리듀스에서 분류한다.

```
pass      = typecheck && touchedFiles ⊆ {자기 파일} && defects.length == 0
tail      = escalations.length > 0
violation = touchedFiles ⊄ {자기 파일}
blocked   = frames.length == 0
```

### 3.4 리듀스 (결정적)

`actId` 사전순 병합. 파일 소유권은 **계약으로 요청되고 사후에 감사될 뿐**,
구조적으로 강제되지 않는다 — `scene-lane.md`가 내주는 `Edit` 도구는 경로를
제한하지 않으므로 레인은 자기 파일이 아닌 *기존* 파일도 얼마든지 고칠 수
있다. 리듀스가 하는 감사는 `git diff --name-only`로 전체 worktree의 변경
파일 목록을 보는 것인데, 이 목록은 여덟 레인 전부의 수정이 합쳐진
**합집합**이다. 그래서 이 감사는 두 종류의 위반을 다르게 다룬다.

- **공유 파일 위반** (레인이 자기 레인 파일도 다른 레인 파일도 아닌 공유
  경로를 건드림) — 합집합 밖이므로 확실히 잡힌다. 해당 경로를 `git checkout`
  으로 되돌리고 발견 내용은 escalation으로 이관한다.
- **레인 간 위반** (레인 A가 레인 B의 막 파일을 건드림) — 두 경로 모두
  합집합 **안**에 있으므로 이 감사로는 보이지 않는다. 유일한 신호는 레인이
  스스로 보고하는 `touchedFiles`뿐인데, 그 자기 보고를 신뢰하지 말라는 것이
  바로 이 설계의 전제다.

정직하게 말하면 병합 충돌이 "원천적으로 없는" 것이 아니라, **감지되면
되돌리는** 방식으로 다뤄질 뿐이고 레인 간 위반은 지금 그 감지망 밖에 있다.
`escalations`는 대상 파일별로 그룹화되어 스칼라 테일의 작업 목록이 된다.

동일 대상 파일에 대한 서로 다른 레인의 escalation은 **합치지 않고 전부 보존한다.**
같은 증상을 여러 막에서 봤다는 사실 자체가 우선순위 신호다.

### 3.5 스칼라 테일 (순차 1회)

`src/builders/*` 와 `src/core/*` 수정은 여기서만 일어난다. 테일은 escalation
목록을 대상 파일 순으로 처리하고, 각 수정이 어느 막들에 영향을 주는지 기록한다.

## 4. 실행 라운드

| # | 단계 | 형태 | 대략 |
|---|---|---|---|
| 0 | 일괄 캡처 v0 — 8막 × 4지점 = 32프레임 + 콘솔 + `inspect()` 덤프 | 배리어 | ~90s |
| 1 | 레인 8개: 판독 + 자기 파일 수정 | **벡터** | ~5분 |
| 2 | 타입체크 + 캡처 v1 | 배리어 | ~90s |
| 3 | 레인 8개: 자기 프레임 재검증 → 마스크 | **벡터** | ~3분 |
| 4 | 스칼라 테일: escalation 병합 처리 | 스칼라 | ~6분 |
| 5 | 캡처 v2 + 최종 판독 | 배리어 | ~2분 |

**벡터 라운드 상한은 2회다.** 결함이 남으면 자동으로 더 돌리지 않고 멈추고
보고한다. 토큰 폭주를 막는 대신 한 번에 끝나지 않을 수 있다 — 의도된 거래다.

## 5. 산출물

```
HARNESS_STATE.md                              현황·드리프트·변경 이력
HARNESS_MANIFEST.json                         SoA 매니페스트
.claude/agents/scene-lane.md                  동형 워커 정의
.claude/agents/scalar-tail.md                 공유 빌더 전담 워커
.claude/skills/render-audit/SKILL.md          캡처+판독 절차, 트리거, 출력 스키마
simcheong/scripts/capture.mjs                 일괄 캡처
simcheong/scripts/check-render-harness.mjs    하네스 무결성 검사
simcheong/audit/frames/                       산출물 (gitignore)
```

캡처 시점과 의도는 `HARNESS_MANIFEST.json` 안에만 둔다. 초안에는 별도
`audit/plan.json`이 있었으나 같은 데이터를 두 곳에 두면 반드시 어긋난다.
`capture.mjs`가 매니페스트를 직접 읽는다.

기존 `docs/harness/`(Electron 앱용)와 `scripts/check-harness.js`, 루트 `AGENTS.md`는
건드리지 않는다. 추가만 한다.

### 5.1 SoA 매니페스트

레인 객체의 배열이 아니라 **평행 배열**로 둔다. 레인 i는 모든 배열의 i번째 열이다.

```json
{
  "version": 1,
  "domain": "procedural-render",
  "lanes": {
    "id":        ["farewell", "growing", "vow", "merchants",
                  "indangsu", "dragonPalace", "lotus", "feast"],
    "file":      ["src/scenes/act01Farewell.ts", "src/scenes/act02Growing.ts", "…"],
    "actIndex":  [0, 1, 2, 3, 4, 5, 6, 7],
    "captureAt": [[4, 24, 40, 50], [5, 18, 30, 45], "…"],
    "intent":    ["상여가 멀어지고 아버지는 남는다", "…"]
  },
  "shared": ["src/builders/figure.ts", "src/builders/materials.ts",
             "src/core/palette.ts", "src/core/stage.ts", "…"],
  "contract": {
    "outputSchema": "3.2절의 레인 출력 스키마",
    "verdicts": ["pass", "fixed", "blocked", "unknown"]
  },
  "runs": []
}
```

이 형태가 브로드캐스트를 공짜로 만든다 — 레인에 넘길 컨텍스트가 "열 하나 슬라이스"다.
그리고 **모든 배열의 길이가 같아야 한다**는 게 기계로 검사 가능한 불변식이 된다.

### 5.2 캡처 스크립트

`puppeteer-core` + 시스템 Chrome을 쓴다. 로컬에 다음이 확인되었다.

- `%LOCALAPPDATA%\ms-playwright\chromium-1187`, `chromium_headless_shell-1187`
- `C:\Program Files\Google\Chrome\Application\chrome.exe`

따라서 **브라우저 다운로드가 필요 없다.** `puppeteer-core`는 ~2MB이고 브라우저를
내려받지 않는다. `executablePath`로 시스템 Chrome을 가리킨다.

스크립트는 한 번 실행으로 다음을 만든다.

- `audit/frames/actNN-tSS.jpeg` × 32
- `audit/frames/console.json` — 막별 콘솔 에러
- `audit/frames/inspect.json` — 막별 `simcheong.inspect()` 덤프

`window.simcheong.goTo(actIndex, time)`는 이미 존재하므로 페이지 쪽 추가 구현이 없다.

## 6. 실패 처리

전부 결정적이며 재시도 폭주가 없다.

| 상황 | 처리 |
|---|---|
| 레인이 남의 파일 수정 | `violation`. 해당 경로만 `git checkout`으로 되돌리고 발견 내용은 escalation으로 이관 |
| 레인 출력 스키마 위반 | `verdict: unknown`. 재시도 없음. 그 막은 스칼라 테일이 직접 본다 |
| 특정 막 캡처 실패 | 그 레인 `frames: []`, `verdict: blocked`. 콘솔 로그 첨부 → 테일이 크래시부터 고침 |
| 캡처 스크립트 자체 실패 | 라운드 중단. 하네스 문서는 남기고 실행만 보류 |
| 결함이 2라운드 후에도 남음 | 멈추고 잔여 목록 보고 |

## 7. 검증

1. `npm run build` — `tsc --noEmit && vite build` (기존)
2. `node scripts/check-harness.js` — 기존 Electron 하네스 무결성 유지 확인
3. `node simcheong/scripts/check-render-harness.mjs` — 신규
   - `HARNESS_MANIFEST.json` 스키마
   - SoA 불변식: `lanes`의 모든 배열 길이가 같다
   - 모든 `lanes.file`이 실재한다
   - `lanes.file ∩ shared = ∅`
   - `lanes.id`가 `src/scenes/index.ts`의 `ACTS`가 내보내는 `Act.id`와
     순서까지 일치한다 (`farewell`, `growing`, … `feast`)
4. 캡처 v2에서 콘솔 에러 0건
5. 회귀 기준: 8막 전부 `pass` 마스크

## 8. 첫 실행 범위

이미 식별된 결함:

- 인물 팔 관절이 각짐 (`figure.ts` — 스칼라 테일)
- 8막 군중 애니메이션이 단조로움 (`act08` 레인 + `figure.ts` 테일)
- 2막 15년 경과가 컷 하나로 급하게 처리됨 (`act02` 레인)

여기에 32프레임이 새로 찾아내는 것을 더한다.

## 9. 성공 기준

- 감사 왕복이 3회 이하 (기존 ~40회)
- 8막 전부 `pass` 마스크, 콘솔 에러 0
- `npm run build` 통과
- 하네스 파일 7개(+ 산출물 디렉터리)가 남고 `check-render-harness.mjs`가 통과
- 다음 작품에서 `HARNESS_MANIFEST.json`의 `lanes`만 교체하면 재사용 가능
