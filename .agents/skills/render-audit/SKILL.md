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

### 1-b. 에이전트 등록 확인

`.Codex/agents/*.md`는 **세션이 시작될 때** 로드된다. 같은 세션에서 만든 정의는
`subagent_type: scene-lane`으로 부를 수 없다. 새 세션이 아니라면 범용 에이전트에게
`.Codex/agents/scene-lane.md`를 `Read`시켜라 — 계약이 여덟 프롬프트에 복사되지
않고 디스크의 단일 출처로 남으므로 이쪽이 오히려 낫다.

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
| 프레임이 거짓말함 | 서로 다른 시각의 프레임이 바이트 동일할 수 있다. `capture.mjs`가 md5 중복과 시크 착지를 검증하지만, 프레임이 의도와 어긋나 보이면 먼저 `simcheong.state()`로 실제 시각을 확인한다 |

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
