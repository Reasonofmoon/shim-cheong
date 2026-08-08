# 심청전 — Suno 배경음악 프롬프트 8곡

막마다 한 곡. 장단(리듬 주기)과 조(선법)를 막의 감정에 맞춰 다르게 잡는다.

---

## 먼저 — 원안에서 고쳐야 할 것

| 원안 | 문제 | 이 문서 |
|---|---|---|
| `Pansori vocal style, female singing` | **나레이션과 싸운다.** 판소리 사설을 이미 목소리로 얹는데 배경에도 소리가 있으면 둘 다 죽는다 | 전부 기악. `no vocals` |
| `Haegeum, Gayageum, Ajaeng, Janggu` + `NO drums` | 장구가 곧 북이다. Suno가 장구까지 빼 버린다 | 제외어를 `drum kit, trap drums`로 좁힌다 |
| `Pentasonic` | 오타 | `pentatonic` |
| `Jeongtong Minyo` | 민요는 다른 장르다. 심청가는 판소리 | `sanjo`, `sinawi` |
| 장단 지정 없음 | 가장 큰 손실. 판소리의 감정은 **장단이 정한다** | 막마다 다르게 지정 |

판소리 본연의 편성(소리꾼 + 고수의 북)은 나레이션이 이미 담당한다. 배경은
**산조·시나위 기악**으로 가는 것이 겹치지 않고, 실제 창극의 방식이기도 하다.

## 장단 배정

| 막 | 장단 | 조 | 왜 |
|---|---|---|---|
| 1 곽씨부인 세상을 뜨다 | **진양조** (가장 느림, 24박) | 계면조 | 판소리에서 가장 느린 장단. 통곡과 이별의 자리 |
| 2 동냥젖으로 자란 청이 | **중중모리** | 평조 | 걸음이 있는 밝은 장단. 유일하게 따뜻한 막 |
| 3 공양미 삼백 석 | 중모리 → **자진모리** | 계면조 | 이야기로 시작해 조여든다 |
| 4 몸을 팔아 삼백 석 | **진양조** | 계면조 | 마지막 아침상. 1막과 같은 느림으로 되돌아온다 |
| 5 인당수에 몸을 던지다 | 자진모리 → **휘모리** | 계면조 | 가장 빠른 장단. 폭풍과 투신 |
| 6 수정궁 | **엇모리** (10박, 절름) | 우조 | **엇모리는 신적 존재가 나타날 때 쓰는 장단이다.** 용궁에 정확히 맞는다 |
| 7 연꽃으로 돌아오다 | 엇모리 → 중중모리 | 평조 | 신이한 것에서 인간 세상으로 |
| 8 맹인잔치 | 중중모리 → **휘모리** | 우조 | 잔치에서 개안으로. 태평소가 정점에 들어온다 |

---

## Suno 설정

- **Instrumental 토글을 켠다.** 프롬프트의 `no vocals`만으로는 새는 경우가 있다
- **Exclude Styles 칸**에 아래를 넣는다 (프롬프트 안에 부정어를 쓰는 것보다 잘 듣는다)

```
vocals, singing, choir, chanting, synthesizer, drum kit, trap drums, 808, EDM, pop, K-pop, trot, orchestral strings, piano, guitar, guzheng, koto, shakuhachi, erhu, cinematic epic
```

> `guzheng`, `koto`, `erhu`, `shakuhachi`를 반드시 제외한다. Suno는 가야금을
> 중국 쟁이나 일본 고토로, 해금을 얼후로 바꿔 놓는 일이 잦다. 소리가 비슷해
> 그냥 들으면 넘어가지만 한국 음악이 아니게 된다.

- 막 길이는 50~78초인데 Suno는 보통 더 길게 뽑는다. **앞부분을 쓰고 잘라낸다**
- 각 곡을 2~3회 생성해 고른다. 장단이 안 맞게 나오는 경우가 있다

---

# 프롬프트

## 1막 · 곽씨부인 세상을 뜨다 (54초)

```
Korean traditional gugak instrumental, slow jinyangjo rhythm cycle, gyemyeonjo sorrowful mode, solo ajaeng bowed zither leading with deep sustained pitch bends and heavy vibrato, sparse gayageum plucks far behind it, quiet janggu hourglass drum marking the long cycle, long silences between phrases, funeral lament, winter, restrained mourning, acoustic sanjo ensemble, no vocals
```

## 2막 · 동냥젖으로 자란 청이 (50초)

```
Korean traditional gugak instrumental, jungjungmori rhythm cycle with a light walking lilt, pyeongjo serene mode, gayageum and daegeum bamboo flute trading a simple warm melody, soft janggu, small hand gong accents, gentle and hopeful, village life in sunlight, acoustic sanjo ensemble, no vocals
```

## 3막 · 공양미 삼백 석 (50초)

```
Korean traditional gugak instrumental, jungmori rhythm cycle tightening into faster jajinmori, gyemyeonjo mode, haegeum two-string fiddle in a rising anxious figure with sliding pitch, low ajaeng drone underneath, temple bell and moktak wooden block, mountain temple at dusk, growing unease, acoustic sanjo ensemble, no vocals
```

## 4막 · 몸을 팔아 삼백 석 (52초)

```
Korean traditional gugak instrumental, very slow jinyangjo rhythm cycle, gyemyeonjo mode, solo daegeum bamboo flute with breathy attack and wide vibrato carrying the whole melody, distant gayageum, almost no percussion, grief held back and unspoken, unbearable calm before parting, acoustic, no vocals
```

## 5막 · 인당수에 몸을 던지다 (56초)

```
Korean traditional gugak instrumental, fast jajinmori driving into frantic hwimori rhythm cycle, gyemyeonjo mode, ajaeng scraping low and violent, haegeum shrieking high, hard janggu and buk barrel drum, samulnori percussion intensity, sea storm and terror, then a sudden complete stop into open silence, acoustic, no vocals
```

## 6막 · 수정궁, 어머니를 만나다 (54초)

```
Korean traditional gugak instrumental, eotmori irregular ten-beat rhythm cycle traditionally used for the entrance of divine beings, ujo majestic mode, gayageum harmonics and slow bowed ajaeng, small bronze gongs and wind chimes, floating and weightless, an otherworldly undersea court, wondrous and solemn, acoustic, no vocals
```

## 7막 · 연꽃으로 돌아오다 (52초)

```
Korean traditional gugak instrumental, eotmori irregular cycle opening into gentle jungjungmori, pyeongjo mode, solo gayageum with clear plucked notes and blossoming ornaments, daegeum entering warm behind it, soft janggu, dawn light on calm water, rebirth, tender and bright, acoustic sanjo ensemble, no vocals
```

## 8막 · 맹인잔치, 눈을 뜨다 (78초)

```
Korean traditional gugak instrumental, jungjungmori building into triumphant hwimori rhythm cycle, ujo bright majestic mode, full sinawi ensemble, taepyeongso double-reed shawm entering loud at the climax, janggu buk and kkwaenggwari small gong, festive royal court celebration, overwhelming joy and light, acoustic, no vocals
```

> 태평소는 한국 악기 중 가장 크고 날카롭다. 잔치와 개선에 쓰는 악기라
> **개안의 순간에 정확히 맞는다.** 8막 프롬프트에서 이 단어를 빼지 않는다.

---

## 선택 — 엔딩 크레딧용 성악곡

본편에는 쓰지 않는다. 나레이션과 겹치기 때문이다. 크레딧이나 예고편에만 쓴다.

```
Korean pansori solo, authentic female sorikkun voice, husky and raw with deep gyemyeonjo pitch bending, accompanied only by a single buk barrel drum played by a gosu, slow jinyangjo cycle, sparse drum strokes with long silence between, traditional storytelling lament, recorded in a small wooden hall, no other instruments
```

이것만은 반주를 넣지 않는다 — **판소리는 소리꾼과 고수의 북, 둘뿐이다.**
악기를 더하면 판소리가 아니라 창극이 된다.

---

## 믹싱

- 배경음악은 나레이션 대비 **−18dB 이하**로 깐다. 사설이 주인공이다
- 사설이 없는 구간(1막 첫 3초, 5막 투신 직후의 정적)에서만 −10dB까지 올린다
- **5막 끝의 정적은 음악도 함께 끊는다.** "바람이 자고 물결이 거울처럼
  잔잔해지더라" 위에 음악이 깔려 있으면 그 정적이 전달되지 않는다
- 막 사이 전환은 크로스페이드 1.5초. 장단이 서로 달라 그냥 붙이면 부딪친다
