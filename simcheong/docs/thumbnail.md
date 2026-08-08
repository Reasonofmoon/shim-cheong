# 심청전 — 썸네일 제작 지침 (GPT Image 2)

---

## 0. 유일한 시험

**168 × 94 픽셀에서 읽히는가.**

모바일 유튜브 피드에서 썸네일은 실제로 그 크기다. 1280×720으로 만들지만
심사는 그 8분의 1에서 난다. 완성한 뒤 반드시 축소해서 본다.

이 크기에서 살아남는 것은 셋뿐이다.

1. **큰 명암 덩어리** — 밝은 것과 어두운 것이 화면을 크게 나누는가
2. **하나의 초점** — 눈이 갈 곳이 한 군데인가
3. **얼굴, 그중에서도 눈** — 사람은 작은 화면에서도 눈을 먼저 본다

살아남지 못하는 것: 잔 텍스처, 가는 선, 여러 인물, 배경 디테일, 긴 글자.

> **영화의 붓결과 종이 결은 썸네일에서 그냥 노이즈가 된다.** 압축까지 거치면
> 지저분해질 뿐이다. 큰 형태로 승부하고 잔 텍스처는 버린다.

---

## 1. 영화와 다르게 가야 하는 것

| | 본편 | 썸네일 |
|---|---|---|
| 채도 | 눌러 둔 중간톤, 샷당 강조색 하나 | **밀어 올린다.** 강조색을 화면의 20%까지 |
| 명암 | 부드러운 계조 | **극단으로.** 거의 검정 ↔ 거의 흰색 |
| 텍스처 | 붓결·종이 결이 보인다 | 없앤다 |
| 시선 | 삼사분면 앵글, 여백 | **정면, 화면을 채운다** |

영화의 절제는 7분 26초를 견디게 하려는 것이다. 썸네일에는 0.8초가 주어진다.
**같은 규칙을 쓰면 안 된다.** 다만 팔레트의 **정체성**(오방색·단청)은 유지한다 —
그래야 클릭한 사람이 배신감을 느끼지 않는다.

---

## 2. 주력안 — 개안

8막에서 늙은 봉사의 눈이 열리는 순간. 이 영화에서 가장 강한 단일 이미지이고,
얼굴 클로즈업이라 작은 화면에서 유일하게 살아남는다.

### 구도

```
┌─────────────┬───────────────────────────┐
│             │                           │
│   글자      │      늙은 봉사의 얼굴      │
│  「심청전」  │      (화면을 넘칠 만큼)     │
│             │        ★ 눈 = 최명부       │
│             │                           │
└─────────────┴───────────────────────────┘
   왼쪽 1/3              오른쪽 2/3
   어둡게 비운다          얼굴이 프레임을 넘어간다
```

**얼굴이 프레임 위아래를 넘어가야 한다.** 얼굴 전체가 들어오면 작아 보인다.
이마 위와 턱 아래를 잘라야 크게 읽힌다.

### 프롬프트

```
Extreme close-up portrait of an elderly Korean man at the exact instant his blind eyes open for the first time. His face fills the right two-thirds of the frame and is cropped by the top and bottom edges — forehead cut off above, chin cut off below. Deeply lined weathered face, sparse grey beard, mouth open in a silent gasp, tears running down both cheeks. His eyes are wide open and are the brightest thing in the image, catching a warm white light. Collar of ragged undyed hemp visible at the bottom edge. Behind him, far out of focus, the vermilion columns and ochre painted brackets of a Korean palace hall, reduced to soft blocks of colour with no detail.

Composition: the left third of the frame is deep shadow, almost black, deliberately empty. Strong diagonal light from the upper right striking only his face.

Style: Korean folk painting, minhwa, bold flat gouache shapes with confident dark ink contours, no fine texture, no visible brush grain, simplified planes rather than rendered detail. Obangsaek palette pushed to high saturation — deep ink black, vermilion red, ochre gold, chalk white. Extreme contrast between near-black shadow and near-white highlight. Dramatic, reverent, overwhelming emotion.

Non-photorealistic, illustrated, not a photo. No text, no letters, no captions, no watermark, no logo, no signature, no border, no frame.

16:9 aspect ratio, 1280x720.
```

### 이 프롬프트에서 빼면 안 되는 것

- **`cropped by the top and bottom edges`** — 안 넣으면 얼굴 전체를 넣어 작아진다
- **`the left third is deep shadow, deliberately empty`** — 글자 자리다. 안 비우면
  나중에 글자를 얹을 곳이 없다
- **`his eyes are the brightest thing`** — 초점을 강제하는 문장
- **`no fine texture, no visible brush grain`** — 영화 스타일을 그대로 요구하면
  잔 텍스처가 들어오고 축소하면 지저분해진다
- **`No text, no letters`** — 글자는 후처리로 넣는다 (§4)

---

## 3. 대안 두 가지

### 대안 A — 인당수 (얼굴 없음)

강렬하지만 얼굴이 없어 클릭률이 낮다. **A/B 테스트용**으로만 쓴다.

```
A young Korean girl in a pale indigo skirt standing alone on the rail of a wooden ship, seen in near-silhouette against a towering black wave that fills the frame. Her skirt and hair stream sideways in the wind. She occupies the right third, small against the wave. One cold silver break in the storm clouds lights the edge of her figure. The left two-thirds is the black wall of water, almost pure black, deliberately empty.

Style: Korean folk painting, minhwa, bold flat gouache shapes with heavy ink contours, no fine texture, simplified planes. Obangsaek palette at high saturation — ink black, deep indigo, one stroke of vermilion in the sky. Extreme contrast. Overwhelming scale, terror and resolve.

Non-photorealistic, illustrated, not a photo. No text, no letters, no watermark, no logo, no border.

16:9 aspect ratio, 1280x720.
```

### 대안 B — 두 얼굴 (아버지와 딸)

감정은 가장 크지만 인물이 둘이라 작은 화면에서 흩어진다. 채널 구독자가 이미
많을 때 쓴다 — 아는 사람에게는 이쪽이 더 아프다.

```
Two Korean faces close together filling the frame: an elderly man with newly opened weeping eyes on the left, and a young woman in a deep vermilion robe pressing her forehead to his temple on the right. Both faces cropped by the frame edges. Her eyes are closed, his are open. Warm gold light from screen right. Background reduced to a soft dark blur with no detail.

Composition: faces occupy the centre and right; the far left edge is deep shadow, deliberately empty.

Style: Korean folk painting, minhwa, bold flat gouache shapes with dark ink contours, no fine texture, simplified planes. Obangsaek palette at high saturation — ink black, vermilion, ochre gold, chalk white. Extreme contrast. Tender and devastating.

Non-photorealistic, illustrated, not a photo. No text, no letters, no watermark, no logo, no border.

16:9 aspect ratio, 1280x720.
```

---

## 4. 글자는 모델에 맡기지 않는다

**프롬프트에 한글을 넣지 않는다.** 이미지 모델의 한글은 아직 무너진다.
자모가 어긋나거나 없는 글자가 만들어지는데, 한국 시청자는 즉시 알아본다.

이미지를 글자 없이 받고 Figma·Photoshop·Canva에서 얹는다.

### 글자 규격

```
심청전
```

- **넉 자만.** 부제·설명·화살표·이모지 전부 넣지 않는다
- 위치: 왼쪽 3분의 1 안, 세로 중앙
- 크기: 화면 높이의 **18~22%**. 168px 축소판에서 글자 높이가 20px 이상이어야 한다
- 서체: 굵은 명조 (본명조 Bold / 나눔명조 ExtraBold). 고딕은 이 영화와 맞지 않는다
- 색: 분백 `#F4EFE6`
- 그림자: 단청 주홍 `#C1272D`을 2px 오프셋으로. 검은 배경에서 글자가 뜬다
- 획이 얼굴에 **1px도 겹치지 않게** 한다

---

## 5. 생성 요령

- **한 번에 4장씩, 3회 이상 돌린다.** 얼굴 표정은 편차가 크고, 열두 장 중
  쓸 만한 것은 대개 한둘이다
- 마음에 드는 구도가 나오면 그 이미지를 레퍼런스로 넣고 표정만 바꿔 재생성한다
- **눈이 어색하면 그 장은 버린다.** 눈을 후보정으로 살리기 어렵고,
  이 썸네일은 눈이 전부다
- 손·귀·치아가 이상하게 나와도 얼굴 클로즈업에서는 대개 프레임 밖이다.
  들어왔다면 크롭으로 잘라낸다

---

## 6. 검수

만든 뒤 **반드시 축소해서** 확인한다.

- [ ] **168×94로 줄여도 눈이 보이는가** — 이것 하나가 나머지 전부보다 중요하다
- [ ] 「심청전」 넉 자가 읽히는가
- [ ] 밝은 덩어리와 어두운 덩어리가 화면을 크게 나누는가
- [ ] 초점이 한 군데인가 (눈이 두 군데로 가면 실패)
- [ ] 흰 플래시 프레임처럼 하얗게 날아간 곳이 없는가
- [ ] 유튜브 다크 모드와 라이트 모드 **양쪽에서** 떠 보이는가
  (왼쪽 3분의 1이 거의 검정이면 양쪽 다 산다)
- [ ] 오른쪽 아래 모서리에 중요한 것이 없는가 — **재생 시간 배지가 덮는다**
- [ ] 파일이 2MB 이하, JPG 또는 PNG, 1280×720

### 마지막 확인

썸네일을 흑백으로 바꿔 본다. 흑백에서도 형태가 읽히면 명암 설계가 된 것이고,
회색 덩어리로 뭉개지면 채도로 버티고 있었던 것이다. **후자는 축소하면 죽는다.**
