# 심청전 — 엔딩 크레딧

본편 7:26 뒤에 붙는다. 총 **32초**, 완성본 7:58.

---

## 구성

| 구간 | 시각 | 내용 |
|---|---|---|
| 이음 | 0:00–0:03 | 8막 마지막 프레임에서 검게 디졸브. **북 한 번** |
| 제목 | 0:03–0:09 | 「심청전」 단독 |
| 크레딧 | 0:09–0:26 | 다섯 줄이 위에서 아래로 순차 등장 |
| 출처 | 0:26–0:30 | 원전 고지 |
| 암전 | 0:30–0:32 | 소리 잦아듦 |

**북 한 번이 이 크레딧의 첫 소리다.** 판소리에서 판이 끝날 때 고수가 치는
마지막 타점이고, 7분 26초 동안 들려온 그 북과 같은 소리다. 이것 없이 그냥
음악으로 넘어가면 영화가 끝났다는 신호가 없다.

---

## 크레딧 텍스트

그대로 쓴다. 라벨은 오른쪽 정렬, 이름은 왼쪽 정렬, 가운데 축을 맞춘다.

```
심청전
沈淸傳


      감독 · 편집    달의이성

            각본    Claude

            영상    Seedance 2.5

            소리    Fish Audio

            음악    Suno AI


   판소리 「심청가」에 기대어
```

### 조판

- 서체: 명조 계열 (본명조 / Noto Serif KR). 고딕은 이 영화의 결과 맞지 않는다
- 「심청전」은 크게, 「沈淸傳」은 그 아래 작게 흐리게 — 한자는 장식이지 정보가 아니다
- 라벨(감독·각본·영상·소리·음악)은 이름보다 **한 단계 작고 한 톤 어둡게**
- 다섯 줄은 0.5초 간격으로 페이드 인. 한꺼번에 띄우면 읽히지 않는다
- 색: 본편 팔레트 그대로. 바탕은 먹빛, 글자는 분백(`#F4EFE6`), 「심청전」에만
  단청 주홍을 얹는다. **새 색을 쓰지 않는다**
- 안전 여백 5% 안쪽

### 도구를 그대로 적는 이유

각본이 Claude, 영상이 Seedance, 소리가 Fish Audio, 음악이 Suno다. 이름을 감추면
나중에 발견되고, 그때는 숨긴 것이 문제가 된다. 처음부터 적어 두면 그냥 사실이다.

사람이 한 일은 **감독과 편집**이다. 무엇을 만들지 정하고, 나온 것 중에 무엇을
쓸지 고르고, 어디서 자를지 정한 것 — 크레딧에서 가장 위에 있어야 할 자리다.

---

## 화면 — Seedance 프롬프트 (B26)

본편 25개와 같은 STYLE·AVOID를 쓴다. 한 글자도 바꾸지 않는다.

```
An empty performance space at the end of a telling: a single woven straw mat on a worn wooden floor, a folded paper fan lying closed on the mat, and a barrel drum resting on its side beside it. Nobody is there. Beat one (0-4s): the mat, fan and drum sit motionless in a wide shaft of late afternoon light falling from a high side window. Beat two (4-16s): the shaft of light travels slowly across the floorboards and narrows, dust turning inside it, the room dimming around the objects. Beat three (16-20s): the light thins to a single band lying across the drum head and stops moving. Camera: one very slow push-in toward the mat and drum, barely perceptible, to end close on the empty seat of the storyteller. Light: one warm amber shaft from high screen left, everything outside it falling to deep shadow, no other source. Sound: room tone, distant wind outside, the long decay of a single drum stroke fading to nothing. Final frame: the straw mat, the closed fan and the drum lying in a narrow band of light, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

저장: `credits-00.mp4`. 20초 생성 → **앞에서 20초 전부 사용**하고 뒤 12초는
검은 화면으로 이어 붙인다.

> 이 샷이 하는 일: 7분 26초 동안 이야기를 들려준 것이 **판소리 한 판이었다**는
> 것을 마지막에 드러낸다. 소리꾼도 고수도 이미 자리를 떴고 자리와 북만 남았다.
> 크레딧 위에 이야기의 한 장면을 다시 까는 것보다 이쪽이 조용하고 정확하다.

---

## 음악 — Suno 프롬프트

크레딧에서만 **성악을 쓴다.** 본편 내내 배경음악을 기악으로 묶어 둔 것은
사설과 겹치기 때문인데, 크레딧에는 사설이 없으니 여기서 처음으로 소리가 풀린다.
판소리 영화를 판소리 소리로 닫는다.

```
Korean pansori solo, authentic female sorikkun voice, husky raw timbre with deep gyemyeonjo pitch bending and wide expressive vibrato, accompanied only by a single buk barrel drum played by a gosu, very slow jinyangjo cycle, sparse drum strokes with long silence between them, wordless melisma without lyrics, traditional storytelling lament fading to quiet, recorded in a small wooden hall with natural room reverb, no other instruments
```

**Exclude Styles** — 본편과 같되 `vocals`, `singing`만 뺀다.

```
choir, synthesizer, drum kit, trap drums, 808, EDM, pop, K-pop, trot, orchestral strings, piano, guitar, guzheng, koto, shakuhachi, erhu, cinematic epic
```

- Instrumental 토글은 **끈다** (이 곡만)
- 가사 칸은 비우거나 `[wordless melisma]`만 — **말을 붙이지 않는다.** 크레딧 글자를
  읽는 동안 가사가 들리면 둘 다 읽히지 않는다
- 8막 곡(휘모리)이 잦아든 뒤 1.5초 쉬고 들어온다. 바로 이으면 들뜬 채로 끝난다

> 진양조로 되돌아오는 것이 핵심이다. 1막이 진양조로 시작했으므로 크레딧이
> 진양조로 닫히면 판이 처음 자리로 돌아온다.

---

## 믹싱

- 북 한 번(0:00)은 **−6dB**. 이 크레딧에서 가장 큰 소리다
- 성악은 −14 LUFS 기준으로 본편과 같게
- 0:30부터 2초에 걸쳐 페이드 아웃. 끊지 않는다

---

## 편집 체크

- [ ] 8막 마지막 프레임에서 검게 디졸브가 1.5초인가 (컷이면 안 된다)
- [ ] 북 한 번이 디졸브 **중간**에 들어가는가 (끝난 뒤가 아니라)
- [ ] 다섯 줄이 0.5초 간격으로 순차 등장하는가
- [ ] 「심청전」 외에 새 색이 들어가지 않았는가
- [ ] 휴대폰 화면에서 라벨(작은 글자)이 읽히는가
- [ ] 성악에 가사가 들리지 않는가
