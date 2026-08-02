# 심청전 — 절차적 Three.js 렌더

한국 고전 「심청전」을 **에셋 없이 코드만으로** 지어 올린 8막 애니메이션.
`.glb` 모델도, 텍스처 이미지도, 오디오 파일도 없다. 화면에 보이는 모든 폴리곤이
런타임에 계산된다.

**▶ [실행해 보기](https://reasonofmoon.github.io/shim-cheong/)**

```bash
cd simcheong
npm install
npm run dev      # http://localhost:5178
```

TypeScript strict 약 11,400줄, 총 7분 26초.
`Space` 재생/정지 · `←/→` 막 이동 · `Shift+←/→` 프레임 단위 · `1`~`8` 막 선택 · `R` 처음으로

---

## 여덟 마당

| 막 | 제목 | 절차적으로 만든 것 |
|---|---|---|
| 1 | 곽씨부인 세상을 뜨다 | 초가삼간, 상여와 만장, 눈, 겨울 들판 |
| 2 | 동냥젖으로 자란 청이 | 마을, 우물, 버드나무, 솟대와 장승 |
| 3 | 공양미 삼백 석 | 산사(2층 팔작지붕), 석탑, 범종, 연등 30개 |
| 4 | 몸을 팔아 삼백 석 | 한선, 포구, 쌀 삼백 석 |
| 5 | 인당수에 몸을 던지다 | 폭풍 파도, 낙하 → 입수 → 침강 원 테이크 |
| 6 | 수정궁, 어머니를 만나다 | 용, 여의주, 해파리, 물고기 떼, 다시마 숲 |
| 7 | 연꽃으로 돌아오다 | 개화하는 연꽃, 궁중 연못 야경 |
| 8 | 맹인잔치, 눈을 뜨다 | 궁궐, 어좌, 일월오봉도, 맹인 24인, 개안 |

자막은 판소리의 register를 따른다 — 말로 하는 **아니리**, 소리로 하는 **창**(더 크고
자간 넓게), 그리고 고수의 **추임새**(얼씨구, 좋다).

---

## 지붕이 가장 어려웠다

한국 지붕이 중국·일본과 다르게 보이는 건 세 가지 곡선 때문이다.
[`roof.ts`](simcheong/src/builders/roof.ts)는 이걸 곡면 함수 하나의 항으로 표현한다.

- **앙곡(昻曲)** — 처마 끝이 위로 들림 → `angok * |edge|⁴ * v^2.6`
- **안허리곡** — 평면상 처마가 바깥으로 휨 → `1 + anheorigok * |edge|³ * v²`
- **오목한 지붕면** — 용마루 쪽은 급하고 처마 쪽은 완만 → `1 - (1-v)²`

기와 골은 별도 메시가 아니다. 곡면 자체를 `cos²`로 변조해서 굽는다 — 추가
드로우콜 0개, flat shading이 알아서 각을 세운다. 초가지붕은 같은 슬롯에 노이즈를
넣은 것뿐이다. 그래서 초가집·절·궁궐·상여·석탑이 전부 같은 함수다.

## 파동 함수는 두 번 쓰였다

[`water.ts`](simcheong/src/builders/water.ts)의 Gerstner 파동 4개는 GLSL과
TypeScript에 **같은 식으로 두 번** 존재한다. 이 중복이 사는 이유는 하나다 — 배와
연꽃이 "대충 사인파 위에서 흔들리는" 게 아니라 **실제로 그려지고 있는 그 수면 위에
떠 있다.** 갑판이 기울면 그 위 인물도 같이 기울고, 뒤의 수평선도 같은 각도로 기운다.

## 인물은 리그 하나다

심청, 심봉사, 스님, 뱃사람, 궁녀, 맹인 24인 — 전부
[`figure.ts`](simcheong/src/builders/figure.ts)의 같은 리그에 옷 색만 다르다.
한복이 한복으로 읽히는 건 실루엣 두 개 덕분이다. 여성은 가슴 아래서 끝나는 아주
짧은 저고리 + 가슴부터 발목까지 종처럼 떨어지는 치마(허리가 안 보인다). 남성은
엉덩이까지 오는 저고리 + 발목에서 대님으로 묶는 바지, 그리고 갓.

포즈는 순수 함수다. 막은 시간 `t`만 받아 자세를 계산하므로, 스크러버로 7분짜리
영상의 아무 프레임이나 찍어도 구도가 정확히 재현된다.

---

## 자기 결과물을 보는 문제

이 프로젝트의 진짜 난이도는 지오메트리가 아니라 **만든 걸 확인하는 것**이었다.
코드 리뷰로는 하나도 안 잡히고 렌더를 봐야만 보이는 버그가 계속 나왔다.

그래서 [배열형 감사 하네스](.claude/skills/render-audit/SKILL.md)를 만들었다.
캡처는 싸고 일괄 처리가 되지만 판독은 비싸다 — 둘을 분리하면 판독만 병렬화할 수 있다.

```
npm run audit:capture     # 헤드리스 1회 실행으로 8막 × 4지점 = 33프레임
                          # + 막별 콘솔 로그 + 씬 바운딩박스 덤프
```

그 다음 레인 에이전트 8개가 각자 자기 막의 프레임만 읽고 자기 씬 파일만 고친다.
공유 빌더 수정은 손대지 않고 escalation으로 올려 스칼라 테일이 한 번에 처리한다.
왕복이 40회에서 3회로 줄었다.

페이지에 조회 훅이 있다:

```js
simcheong.goTo(actIndex, seconds)   // 점프 후 일시정지
simcheong.state()                   // 어느 막 몇 초, 전환 중인지
simcheong.inspect(minSize)          // 큰 오브젝트의 월드 바운딩박스
simcheong.facing(name)              // 이 인물이 카메라를 보는가 (dot, correction)
simcheong.toggle(name, visible)     // 명명된 서브트리 끄고 켜기
simcheong.camera()                  // 현재 pos/dir/fov
```

### 실제로 잡힌 것들

- **정점 컬러 없는 메시가 새까맣게** — `vertexColors: true`인데 지오메트리에 `color`
  속성이 없으면 WebGL이 `(0,0,0)`을 넣는다. 경고도 없다. 문살·창틀·감 열매가 전부
  검정이었다.
- **프레임이 조용히 거짓말했다** — 서로 다른 시각의 프레임이 바이트 동일했다.
  `Director.goTo`가 전환 중 호출되면 페이드 타이머를 리셋해, 빠르게 점프하는
  호출자는 seek 분기에 영영 진입하지 못했다. 예외도 콘솔 에러도 없었다.
  **레인 하나가 "확인할 수 없다"며 수정을 거부한 것이** 잘못된 수정을 막았다.
- **연꽃이 안 벌어졌다** — 꽃잎 피벗을 접선이 아니라 반경 축으로 돌려서, "개화"가
  옆으로 비트는 동작이 됐다.
- **클라이맥스에서 심청이 관객에게 등을 돌리고 있었다** — `facing()`으로 재서
  `dot -0.85 → 0.89`로 확인.
- **한 막이 통째로 안개였다** — `Pose6 = [px, py, pz, tx, ty, tz]`의 y 자리에 z
  상수를 넣어 카메라가 지하 300 units에 앉아 있었다.

전체 기록은 [`tasks/lessons.md`](tasks/lessons.md).
하네스 설계는 [`docs/superpowers/specs/`](docs/superpowers/specs/).

---

## 구조

```
simcheong/
  src/core/       stage, director, cameraRig, shot, timeline, palette, rng, subtitles, ui
  src/builders/   roof, hanok, temple, figure, nature, water, ship, dragon, undersea, lotus, props
  src/scenes/     act01 ~ act08
  src/data/       narration.ts  (판소리 사설체 자막)
  scripts/        capture.mjs, harness-core.mjs, check-render-harness.mjs
HARNESS_MANIFEST.json          레인 목록 (SoA 평행 배열)
.claude/agents/                레인 워커 · 스칼라 테일 역할 정의
.claude/skills/render-audit/   감사 절차
```

머티리얼은 캐시하고 지오메트리만 막마다 해제한다. 머티리얼은 100개 남짓이라
누수가 없고, 살려두면 스크러버로 되돌아온 막이 셰이더를 재컴파일하지 않는다.
지오메트리는 막마다 수만 정점이라 정리한다.

오방색(청·적·황·백·흑)과 단청 안료가
[`palette.ts`](simcheong/src/core/palette.ts)에 모여 있다. 텍스처가 없으니 팔레트가
미술감독이 사는 유일한 장소다. 텍스처 없는 표면이 플라스틱처럼 보이는 걸 막는 건
`applyVertexTint` — 정점별로 밝기를 ±5% 흔들면 기와 300장이 전부 같은 색이어도
구운 흙처럼 읽힌다.

## 라이선스

MIT
