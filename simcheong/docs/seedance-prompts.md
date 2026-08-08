# 심청전 — Seedance 2.5 텍스트 프롬프트 25개

원본: 8막 446초. **20초 × 25블록 = 500초 (8:20).**

## 왜 23개가 아니라 25개인가

446 ÷ 20 = 22.3이므로 기계적으로는 23개다. 그러나 그렇게 자르면 한 클립 안에
막 경계가 들어간다 — 예를 들어 22번째 블록이 용궁의 끝과 연꽃의 시작을 함께 담게
된다. Seedance 클립 하나는 **연속된 한 샷**이므로 그 안의 장면 전환은 뭉개진다.

막마다 `ceil(길이 / 20)`으로 끊어 25개가 된다.

**각 블록의 내용은 `narration.ts`에서 계산한 것이다.** 막을 이야기 단위로 눈대중
분할하면 사설과 그림이 어긋나는데, 재생해 보기 전에는 알 수 없다. 실제로 초안에서
일곱 블록이 어긋나 있었다 — 화주승이 건져내는 대사가 B07 안에 있는데 프롬프트는
물에 빠지는 것만 그렸고, "아버지!"가 B23에 6.6초 B24에 1.4초로 걸쳐 있는데 달려가
붙드는 동작이 B24에 있었다. `npm run seedance:map`이 이 대조표를 만든다.

---

## 공통 규칙

**스타일 문장은 25개 전부에서 한 글자도 바뀌면 안 된다.** 텍스트 프롬프트만으로
가는 경우 스타일 일관성을 붙잡아 주는 것이 이 문장뿐이다. 복사해서 붙인다.

**말소리를 넣지 않는다.** 판소리 내레이션은 이미 별도 음원으로 있다. 클립의 소리는
환경음과 효과음뿐이고, 립싱크·대사·자막·글자가 화면에 들어가면 안 된다.

각 프롬프트는 **하나의 눈에 보이는 변화**와 **하나의 카메라 움직임**만 가진다.
카메라를 두 개 겹치면 20초 안에 둘 다 뭉개진다.

---

## STYLE — 모든 프롬프트 끝에 그대로 붙인다

```
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제1막 · 곽씨부인 세상을 뜨다 (겨울, 상중)

## B01 · 0:00–0:20

```
A Korean mountain village in deep winter, thatched-roof cottages under bare persimmon trees, snow lying in the furrows of a frozen field. A blind man in a coarse white hemp robe stands at a cottage door, eyes closed, head tilted to listen; his wife in a pale indigo skirt sets a bowl on the step beside him. Beat one (0-4s): the village sits still and empty in blue dawn light. Beat two (4-16s): the woman rises and gently guides the blind man's hand to the bowl; he finds it and lowers his head. Beat three (16-20s): she looks past him toward the ridge and holds still. Camera: one slow push-in from a wide village view to a waist-level two-shot, to move from place to people. Light: cold overcast dawn, no sun disc, blue shadow on snow. Sound: wind over the field, a single distant crow, cloth rustle. Final frame: the two figures framed in the doorway, the woman's gaze off-screen right, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B02 · 0:20–0:40

```
A white funeral bier carried on the shoulders of six village men leaves a thatched cottage and moves along a snow path between bare fields. Paper streamers on the bier's canopy lift in the wind. Behind them a blind man in white hemp stands alone in the doorway holding a swaddled newborn against his chest, not following. Beat one (0-4s): the bier is lifted and steadies on the men's shoulders. Beat two (4-16s): the procession walks away from camera down the path, the bier swaying with each step, the doorway shrinking behind it. Beat three (16-20s): the blind man turns his face toward the sound though he cannot see it. Camera: one slow dolly back along the path, holding both the receding bier and the doorway in frame, so the distance between them becomes the subject. Light: flat grey winter noon, snow bouncing pale light upward. Sound: crunching snow underfoot, wind in paper streamers, a swaddled infant's thin cry. Final frame: bier small in the upper third, man and infant fixed in the lower right doorway, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B03 · 0:40–1:00

```
An empty snow path curving away over a low ridge, the funeral procession already gone beyond it, only footprints left in the snow. A blind man in white hemp kneels in the middle of the path holding a swaddled infant, his face turned up toward an overcast sky. Beat one (0-4s): the last figures disappear over the ridge line. Beat two (4-16s): the man sinks slowly to his knees in the snow, curling forward over the infant, shoulders shaking once. Beat three (16-20s): he lifts his face and goes completely still, snow beginning to fall. Camera: one very slow crane up and back, leaving him small at the bottom of a wide white field, to make the emptiness the point. Light: dimming afternoon, the sky flat and colourless, everything reading as tones of white and blue-grey. Sound: wind, one soft infant cry, then near silence. Final frame: a small dark figure at the centre bottom of an empty white field, snow drifting, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제2막 · 동냥젖으로 자란 청이 (마을, 한낮)

## B04 · 1:00–1:20

```
A Korean village lane in warm spring noon, earth walls and thatched eaves, laundry drying on a line. A blind man in worn white hemp walks the lane with a swaddled infant bound to his chest, feeling along the wall with one hand and stopping at each gate to bow. Beat one (0-4s): he stops at the first gate and bows low, the infant held carefully. Beat two (4-16s): he moves gate to gate down the lane, bowing at each, a woman opening one door and stepping out. Beat three (16-20s): the woman reaches out and takes the infant into her arms. Camera: one steady lateral tracking shot moving with him along the lane, to make the repetition of the doors visible. Light: high spring sun, warm ochre walls, short hard shadows, one vermilion gate as the single saturated accent. Sound: footsteps on packed earth, a wooden gate creaking, distant chickens, cloth rustle. Final frame: the woman holding the infant, the blind man bowing beside her, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B05 · 1:20–1:40

```
A village courtyard through four seasons compressed into one continuous view: the same persimmon tree bare, then in leaf, then heavy with orange fruit, then bare again, while at its foot a child grows from a toddler to a girl of fifteen in a pale indigo skirt. Village women come and go around her. Beat one (0-4s): a toddler takes unsteady steps under a bare tree. Beat two (4-16s): the seasons wheel across the tree and courtyard, the child rising in height with each turn, clothes changing from infant white to a young woman's skirt. Beat three (16-20s): the grown girl turns from the tree, crosses to a blind man in patched white hemp seated on the step, and puts a bowl into his hands. Camera: one locked-off wide shot, no movement at all, so that only the seasons and the child change. Light: cycles from cold white through green noon to golden autumn and back, one full turn. Sound: layered seasonal ambience — wind, cicadas, rain on thatch, wind again. Final frame: a fifteen-year-old girl crouched beside her seated blind father with the bowl in his hands, persimmon tree above them, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B06 · 1:40–2:00

```
Inside a poor thatched cottage at evening, a low wooden table with one bowl of rice and a dish of greens. A fifteen-year-old girl in a pale indigo skirt kneels and guides her blind father's hand to the bowl; he wears patched white hemp and keeps his eyes closed. Village neighbours watch from the open door, nodding to one another. Beat one (0-4s): the girl sets the bowl down and folds her hands. Beat two (4-16s): she takes her father's wrist and places his fingers on the rim; he finds the spoon and eats, and she quietly moves her own empty bowl out of his reach. Beat three (16-20s): she bows her head; warm light from the doorway widens across the floor. Camera: one slow low push-in toward the table from floor height, to bring the audience to their level. Light: low amber lamp inside, cool blue dusk through the doorway, the lamp as the single warm accent. Sound: a spoon on pottery, cloth, low evening insects, a neighbour's soft murmur without words. Final frame: father eating, daughter bowed beside him with her empty bowl behind her, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제3막 · 공양미 삼백 석 (절, 해질녘)

## B07 · 2:00–2:20

```
A shallow mountain stream in failing dusk light, stepping stones half submerged, pines and a mountain temple roof above the far bank. A blind man in white hemp falls into the water and is pulled out by a travelling monk. Beat one (0-4s): he taps a stick along the bank, steps onto the first stone, finds nothing, and pitches sideways into the stream. Beat two (4-16s): he thrashes, robe ballooning and dragging him down; a monk in grey robes with a straw travelling hat wades in, takes him under the arms, and hauls him up onto the stone bank. Beat three (16-20s): the monk straightens, plants his staff, and raises one hand toward the temple roof above; the soaked man turns his face up toward him. Camera: one continuous drift down and across the stream, ending low beside the two men on the bank, to arrive with the rescue. Light: dusk, orange sky above and the ravine already dark, temple lanterns just lit as small warm points. Sound: rushing water, splashing, a stick clattering on stone, dripping cloth, one distant temple bell. Final frame: the soaked man's upturned face and the monk's raised hand, temple roof behind them, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B08 · 2:20–2:40

```
A mountain path at dusk below a temple with bracketed eaves and dancheong-painted beams. A soaked blind man in white hemp stands alone where the monk left him, then turns and walks away down the path toward the village, moving too fast, stumbling, one hand out. Beat one (0-4s): he stands motionless on the path, water still running from his robe, mouth working as he repeats something to himself. Beat two (4-16s): he turns from the temple and starts down the path, walking faster than a blind man safely can, his stick swinging wide, catching himself twice on the rocks. Beat three (16-20s): he reaches a bend where the village roofs come into view below and stops dead, as if only now hearing what he agreed to. Camera: one steady tracking shot moving backward ahead of him down the path, to keep his face toward the audience the whole way. Light: last orange dusk behind him on the temple, deep blue ahead down the valley, so he walks out of warm light into cold. Sound: dripping cloth, a stick striking rock, hurried uneven footsteps, a temple bell far behind, wind in pines. Final frame: the man stopped at the bend, village roofs small and blue below him, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B09 · 2:40–3:00

```
Inside the poor thatched cottage at night, one oil lamp, an empty rice chest standing open against the wall. A blind man in white hemp kneels on the floor striking his own chest with both fists; his teenage daughter in a pale indigo skirt stands in the doorway behind him, listening. Beat one (0-4s): the man kneels and the empty chest is visible behind him, lid tipped back. Beat two (4-16s): he beats his chest twice and rocks forward with his forehead to the floor; the girl steps in from the doorway, stops, and understands. Beat three (16-20s): she lowers her head slowly and completely, and does not move again. Camera: one slow push-in past the father to settle on the daughter's bowed head, to move the shot from his grief to her decision. Light: single warm lamp low in frame, the rest of the room in deep indigo shadow, the empty chest catching one pale edge. Sound: fists on cloth, breath, a wooden lid settling, night insects outside. Final frame: the daughter standing with her head bowed, father blurred and low in the foreground, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제4막 · 몸을 팔아 삼백 석 (포구, 새벽)

## B10 · 3:00–3:20

```
A small Korean harbour at first light, a wooden trading junk with patched sails moored at a stone quay, crates and rope coils stacked on the boards. Six merchant sailors in dark quilted jackets come ashore and stand talking with villagers, one gesturing out to sea. Beat one (0-4s): the ship rocks at its mooring and the gangplank drops onto the quay. Beat two (4-16s): the sailors walk ashore in a loose group, villagers gathering to meet them, the lead sailor pointing seaward and then spreading his hands in refusal. Beat three (16-20s): the villagers draw back from him and look at one another. Camera: one slow arc around the meeting group from the ship side to the village side, to turn the audience from the sea toward the people. Light: pale grey-pink dawn, low sun behind the mast, everything backlit with long thin shadows on wet stone. Sound: water slapping the quay, rope creak, gulls, low crowd murmur without words. Final frame: villagers pulled back in a half circle, the lead sailor with hands open at the centre, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B11 · 3:20–3:40

```
The same harbour quay at dawn. A fifteen-year-old girl in a pale indigo skirt walks out of the crowd of villagers and stands alone in front of the merchant sailors, back straight, chin level, hands folded at her waist. Beat one (0-4s): the crowd is still and closed; a gap opens in it. Beat two (4-16s): the girl walks forward through the gap, stops two paces from the lead sailor, and holds his gaze without flinching; the sailors shift, one removing his cap. Beat three (16-20s): the lead sailor's face breaks and he looks at the ground; the girl does not move. Camera: one slow push-in from behind the sailors' shoulders to a chest-up frame of the girl, to make her the only thing in focus by the end. Light: low dawn sun full on her face from screen left, the sailors in silhouette against it, her indigo skirt the single saturated accent. Sound: sea, wind in sail cloth, the crowd going quiet, one rope knocking the mast. Final frame: the girl centred, lit, unmoving, sailors dark and lowered around her, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B12 · 3:40–4:00

```
Two linked views in one continuous move: inside the thatched cottage at dawn a girl in a pale indigo skirt sets a breakfast tray before her blind father and watches him eat, her own place empty; then through the open door, far off at the quay, the trading junk casting off. Beat one (0-4s): she places the tray and settles back on her heels, hands pressed flat on her knees. Beat two (4-16s): the father eats unhurriedly, unaware; she watches him without blinking, then rises and steps backward out of the door without turning her back on him. Beat three (16-20s): from the empty doorway, the ship is already out on the water, sail filling. Camera: one continuous slow pull back from the low table, through the doorway, out to the sea beyond, to carry the audience out with her. Light: cold blue interior, a widening band of gold dawn coming through the door, the sail catching that gold at the end. Sound: a spoon on pottery, cloth, then wind and water swelling as the frame moves outdoors. Final frame: the empty doorway framing a small ship under sail on open water, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제5막 · 인당수에 몸을 던지다 (폭풍)

## B13 · 4:00–4:20

```
Open sea in a black storm, water the colour of ink, crests breaking white and ragged. A wooden trading junk with a reefed patched sail pitches bow-up over a swell and drops into the trough, sailors clinging to the rail and rigging. Beat one (0-4s): the ship rides up the face of a wave, hull streaming. Beat two (4-16s): it crests, hangs, and slams down into the trough; a wall of spray crosses the deck and knocks two sailors to their knees; the sail cracks taut. Beat three (16-20s): the ship rolls hard to one side and rights itself, mast swinging across the sky. Camera: one continuous low tracking shot from just above the water surface, rising and falling with the swell, to put the audience in the sea rather than above it. Light: near-black storm sky with one cold pale break in the cloud, the sail's chalk white as the single accent. Sound: heavy sea, wind screaming in rigging, timber groaning, spray hitting deck. Final frame: the ship heeled over on a black crest, sail hard against the sky, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B14 · 4:20–4:40

```
The bow of the pitching junk in the black storm. A fifteen-year-old girl in a pale indigo skirt climbs onto the foredeck, turns to face the western horizon, and bows twice from the waist, slow and formal, while the sailors kneel behind her with their heads down. Beat one (0-4s): she reaches the bow and steadies herself against the rail, hair and skirt streaming sideways. Beat two (4-16s): she releases the rail, straightens, and bows deeply twice toward the west, holding each bow at the bottom, the deck heaving under her; the sailors go down on their knees behind her. Beat three (16-20s): she rises from the second bow, draws her outer skirt up over her head with both hands, and steps up onto the rail, holding a shroud line. Camera: one slow low push-in from behind her toward the horizon past her shoulder, to make her stillness the centre of the storm. Light: black sky, one cold silver break low in the west that lights only her face and hands. Sound: wind, sea, cloth snapping, the creak of the deck; the storm noise drops slightly during the bows. Final frame: the girl standing on the rail with her skirt over her head, one hand on the line, sailors kneeling behind, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B15 · 4:40–5:00

```
The storm sea at the ship's side. A girl in a pale indigo skirt already standing on the rail with her skirt over her head lets go and drops into the black water; the sea then goes flat and still. Beat one (0-4s): her hand releases the line and she falls away from the rail, a small pale shape against black water. Beat two (4-16s): she enters with one hard white burst of spray that collapses and closes over her; the rings spread, and the surface begins to lose its crests. Beat three (16-20s): the wind stops and the whole sea flattens into a smooth mirror reflecting a clearing sky. Camera: one continuous slow descent following her from rail height down to just above the water, then holding on the flattening surface, so the calm arrives in the same unbroken shot. Light: black storm light through the fall, then a widening pale silver as the sky clears onto the mirror surface. Sound: wind and sea at full force, one deep water impact, then a rapid fall to near silence with only faint lapping. Final frame: a flat mirror-still sea with fading rings where she entered, the ship small and upright at the edge of frame, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제6막 · 수정궁, 어머니를 만나다 (해저)

## B16 · 5:00–5:20

```
Deep underwater in shafts of dim green-blue light, drifting motes and slow strands of kelp. A girl in a pale indigo skirt sinks slowly through the water with her arms loose and hair floating upward; below her, enormous shapes rise out of the dark to meet her — sea turtles the size of boats, a coiling dragon's tail, lantern-carrying attendants. Beat one (0-4s): she sinks alone through empty green water, small in the frame. Beat two (4-16s): shapes resolve out of the darkness beneath her and rise; great turtles slide in under her body and take her weight, her descent slowing to a stop. Beat three (16-20s): she comes to rest cradled on their shells, and far below her in the dark the five-coloured lanterns of a great undersea palace come up one row at a time, revealing courtyard roofs and lines of waiting attendants. Camera: one slow sink alongside her, matching her fall and then stopping with her, so the audience descends and is caught with her. Light: pale surface shafts from directly above, deep indigo below, the palace lanterns blooming from the dark as five small saturated points that grow. Sound: muffled underwater rumble, bubbles, distant low resonant tones, a soft ceremonial drum rising at the end. Final frame: the girl lying level on the great shells with the lit palace spread out in the dark beneath her, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B17 · 5:20–5:40

```
The undersea crystal palace: a broad courtyard of pale jade flagstones under water, ringed by Korean pavilions with upturned dancheong-painted eaves and hanging lanterns in five colours. Attendants with fish tails and armoured turtle courtiers stand in two facing rows. At the far end on a raised dais sits the Dragon King, immense, robed, with a long beard drifting in the current. Beat one (0-4s): the courtyard is still, lanterns swaying gently in the current. Beat two (4-16s): the two rows of courtiers bow inward in a wave as the girl is escorted down the centre; the Dragon King rises from the dais and extends one hand toward her. Beat three (16-20s): the girl kneels, then turns her head sharply toward a hanging bamboo blind at the side of the courtyard where a woman's face has appeared between the slats, watching her. Camera: one slow low dolly forward down the centre aisle toward the dais, to arrive where she arrives. Light: filtered blue water light overall, five-colour lanterns as the saturated accents, a warm pool on the dais and one narrow warm bar falling across the woman's face at the blind. Sound: deep resonant underwater tones, lantern chains, a low ceremonial drum, drifting water. Final frame: the girl kneeling but turned away from the dais toward the blind, the woman's face visible between the slats, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B18 · 5:40–6:00

```
A quiet side chamber of the undersea palace behind a hanging bamboo blind, lantern light coming through the slats in bars. A woman in a pale robe steps through the blind; a fifteen-year-old girl in indigo turns and sees her; they meet and hold each other. Beat one (0-4s): the woman pushes through the blind and the girl comes to her feet. Beat two (4-16s): they cross the space and take hold of one another; the woman cups the girl's face in both hands and turns it to the light, studying it, then presses the girl's head to her shoulder. Beat three (16-20s): the water current strengthens, the lantern light dims, and the woman's hands begin to loosen. Camera: one slow orbit around the two figures, ending on the woman's hands on the girl's face, to keep the reunion continuous and unbroken. Light: warm ochre lantern bars through the blind against cold blue water, the warm bars as the single accent, cooling toward the end. Sound: water, a bamboo blind knocking, cloth, low resonant tones rising at the close. Final frame: mother and daughter face to face, the woman's hands still on the girl's cheeks, light already fading, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제7막 · 연꽃으로 돌아오다 (새벽 → 밤 연못)

## B19 · 6:00–6:20

```
Underwater rising toward a bright surface: a huge closed lotus bud, pale pink with green sepals, is released by the Dragon King's attendants and floats upward through green water, growing brighter as it climbs, then breaks the surface onto a calm dawn sea. Beat one (0-4s): attendant hands release the bud in deep water and withdraw into the dark. Beat two (4-16s): the bud rises steadily through lightening water, motes streaming down past it, its colour warming from grey-green to pink as the surface nears. Beat three (16-20s): it breaks through into open air and settles, rocking gently on a flat pink dawn sea. Camera: one continuous rise following the bud from below to just above the waterline, crossing the surface in the same unbroken move. Light: dark green below, brightening to gold-pink at the surface, the lotus pink as the single saturated accent. Sound: muffled underwater rumble giving way to open air, small waves, distant gulls at the end. Final frame: a single closed lotus floating alone on a flat pink dawn sea, horizon empty, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B20 · 6:20–6:40

```
A calm dawn sea and a wooden trading junk under sail. Sailors crowd the rail, point at a floating lotus, lower a net on poles, and lift the flower streaming water onto the deck, where they set it down and step back from it. Beat one (0-4s): a sailor at the rail sees the flower and calls the others over. Beat two (4-16s): they lower the net, work the lotus into it, and haul it up over the rail; water sheets off the petals as it swings inboard and settles on the boards. Beat three (16-20s): the sailors lift the flower onto a low carrying litter and hand it over the rail to waiting court officials in dark robes and black horsehair hats, who bear it away up a stone quay toward palace gates. Camera: one slow rise from water level up over the rail onto the deck and on across to the quay, following the flower's whole path from sea to shore. Light: full pink-gold dawn, low warm sun from screen right, wet deck boards shining, the lotus pink held as the accent as it moves ashore. Sound: sea, rope through blocks, dripping water, boots on wood then on stone, a hushed crowd murmur without words. Final frame: the lotus on its litter carried between officials toward palace gates, the ship behind them, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B21 · 6:40–7:00

```
A palace garden pond at night, still black water, stone lanterns burning around the rim, a Korean pavilion with dancheong-painted eaves behind. The great lotus floats at the centre; its petals open one by one and a young woman in white and pale indigo rises and steps out onto the water's edge. Beat one (0-4s): the closed lotus sits motionless on black water, lantern flames doubled in the reflection. Beat two (4-16s): the outer petals peel open in sequence, opening outward and downward, warm light spilling from inside; a young woman rises upright from the centre. Beat three (16-20s): she steps from the flower onto the stone rim and stands; every lantern flame leans toward her. Camera: one slow push-in across the water from the far bank to a chest-up frame of her, to arrive as she does. Light: night, the lanterns and the light inside the flower the only sources, warm gold against black water as the single accent. Sound: still water, insect night, lantern flame, petals moving like heavy paper. Final frame: the young woman standing at the pond's stone rim, opened lotus behind her on the water, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

# 제8막 · 맹인잔치, 눈을 뜨다 (궁궐, 한낮)

## B22 · 7:00–7:20

```
A palace courtyard in bright daylight, red-columned halls with dancheong-painted brackets on three sides, long low tables being laid end to end across the flagstones. Servants carry in food; blind guests in white hemp are led in by attendants and seated in rows. High on the hall steps a young empress in a deep vermilion robe stands watching the gate. Beat one (0-4s): servants set the last dishes and step back from the tables. Beat two (4-16s): a stream of blind guests is guided in through the great gate and seated along the rows, filling the courtyard; the empress descends two steps and stops, scanning the gate. Beat three (16-20s): the last guest is seated and the gate stands empty; she does not move. Camera: one slow crane down from a high wide view of the full courtyard to a mid frame of the empress on the steps, to narrow from the crowd to the one who is searching. Light: high clean noon sun, hard shadows under the eaves, the vermilion robe as the single saturated accent. Sound: crowd murmur without words, dishes, footsteps on stone, a ceremonial drum. Final frame: the empress on the steps looking toward an empty gate, the full courtyard below her, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B23 · 7:20–7:40

```
The palace courtyard late on the last day of the feast, light gone amber and long, most tables cleared, only a few guests left. A young empress in vermilion walks slowly between the rows studying each blind face and finding none of them. At the far gate an old blind man in filthy ragged hemp shuffles in alone, feeling ahead with a stick. Beat one (0-4s): she passes two seated guests, looks at each face, and moves on. Beat two (4-16s): she reaches the end of the row and stops, shoulders dropping; behind her, unnoticed, the ragged old man comes through the gate and taps his way forward a few paces. Beat three (16-20s): she turns, sees him, and breaks into a run down the length of the courtyard toward him, robe streaming behind her. Camera: one slow lateral track following her down the row that swings round with her as she turns and runs, letting the gate stay in the deep background so the old man is visible the whole time without cutting. Light: low amber late-afternoon sun raking across the courtyard, long shadows, the vermilion robe still the accent, the old man in colourless grey. Sound: near-empty courtyard, a stick tapping stone, cloth, then running footsteps on flagstone. Final frame: the empress running at full stride mid-courtyard, the ragged old man stopped and turned toward the sound ahead of her, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B24 · 7:40–8:00

```
The palace courtyard. A young empress in vermilion already has hold of a ragged old blind man by both shoulders; he stiffens, strains, screws his face tight, and then his eyes open in a burst of white light that spreads outward through the seated guests. Beat one (0-4s): her hands are on his shoulders and his stick is already on the ground; he goes rigid at the sound of her. Beat two (4-16s): his head tilts back, the muscles of his face working as he strains at his sealed eyelids, hands rising to grip her forearms, the whole courtyard turning toward them. Beat three (16-20s): a hard white flash floods the frame and clears — his eyes are open and fixed on her face, tears running, and behind him the nearest seated guests are lifting their heads too. Camera: one push-in from a mid two-shot to a tight frame of his face, to end on the moment the eyes open. Light: warm amber late sun, then one blown-out white flash at the sixteen-second mark, resolving back to warm light with his face fully lit and the courtyard behind him brighter than before. Sound: strained breathing, a rising crowd gasp, one deep drum strike on the flash. Final frame: the old man's open eyes locked on the empress's face, guests stirring behind him, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

## B25 · 8:00–8:20

```
The palace courtyard filled with blind guests in white hemp who all open their eyes at once, standing up from the tables and looking around at the world, hands raised to their faces, while the empress and her father stand together at the centre. Beat one (0-4s): seated guests along the rows lift their heads together as if hearing the same thing. Beat two (4-16s): eyes open in a spreading wave from the centre outward, guests rising to their feet, turning slowly to look at the painted brackets, the sky, their own hands; the courtyard light lifts steadily brighter. Beat three (16-20s): the crane pulls high above the courtyard, the whole crowd standing and looking upward, the light going to a clean pale gold. Camera: one continuous crane up and back from the two figures at the centre to a high wide view of the entire courtyard, to close the film from above. Light: rising from warm amber to a bright even gold with no hard shadows, the vermilion robe still readable as the accent at the centre. Sound: a swelling crowd of voices without words, a ceremonial drum and gong, wind through the courtyard. Final frame: a high wide view of the full courtyard, everyone standing and looking up, the two figures small and together at the centre, held to the end.
STYLE: Korean folk-tale animation in the obangsaek palette — indigo blue, vermilion red, ochre yellow, chalk white, ink black — with dancheong temple-pigment accents. Matte gouache surfaces, visible brush tooth, soft hand-inked contours that thicken at silhouette edges, flat cel shading with one soft ambient gradient, no specular highlights, fine paper grain over the whole frame. Muted desaturated mid-tones with a single saturated accent per shot. Non-photorealistic, illustrated, not a photo, no live-action, no realism.
AVOID: no text, no subtitles, no captions, no logos, no watermark, no dialogue, no lip-sync, no speaking mouths, no modern objects, no photorealistic skin, no lens flare, no multiple camera moves.
```

---

## 생성 순서 권장

**B11(내 몸을 사시오)과 B24(개안)를 먼저 뽑는다.** 이 둘이 영화의 두 정점이고,
동시에 생성 모델이 가장 실패하기 쉬운 종류다 — 하나는 표정 연기, 하나는 순간 변화.
여기서 스타일과 인물이 원하는 대로 나오면 나머지 23개는 같은 문장으로 따라온다.
반대로 이 둘이 실패하면 스타일 문장을 고쳐야 하는데, 23개를 뽑은 뒤에 고치면 전부
다시 뽑아야 한다.

## 검수 항목

블록마다 확인한다. 완료 상태는 합격이 아니다.

- 스타일이 앞 블록과 같은가 (붓결·윤곽선 굵기·종이 결·채도)
- 인물 수와 옷 색이 대본과 맞는가 (청이 남색 치마, 심봉사 흰 삼베, 황후 다홍)
- **눈에 보이는 변화가 실제로 일어났는가** — 20초 내내 같은 그림이면 실패다
- 카메라가 하나만 움직였는가
- 화면에 글자·자막·로고·워터마크가 없는가
- 입을 움직여 말하는 인물이 없는가
- 마지막 상태가 끝까지 유지되는가 (다음 클립과 이어붙일 지점이다)

## 길이와 편집

생성 500초 → 완성본 446초. **클립마다 꼬리를 2~3초씩 잘라 쓴다.**
각 프롬프트의 마지막 비트(16–20초)는 정지 상태를 붙잡고 있는 구간이라, 여기서
가져오면 본동작이 상하지 않는다. 클립별 사용 길이와 그 시간에 들리는 사설은
`docs/seedance-edit-map.md`에 있다 (`npm run seedance:map`으로 다시 생성).

컷이 사설 중간에 떨어지는 것은 문제가 아니다 — 내레이션은 별도 오디오 트랙으로
위에 얹힌다. 편집 지도에서 **⚠ 표시된 18줄만** 주의하면 된다. 그 줄들은 클립
경계를 넘어가므로 앞뒤 클립의 그림이 서로 이어져 보여야 한다.

## 음성은 아직 없다

판소리 음원은 **아직 녹음되지 않았다.** `public/audio/`는 비어 있다.
있는 것은 텍스트뿐이다.

| 파일 | 무엇 |
|---|---|
| `src/data/narration.ts` | **원본.** 67줄, `{at, until, text, style}` |
| `docs/audio-script.md` | 붙여넣기용 대본. 감정 태그 + 저장할 파일명 |

순서는 이렇다.

1. `docs/audio-script.md`의 67줄을 fish.audio에 붙여넣어 mp3를 받는다 → `public/audio/`
2. `npm run audio:manifest`
3. **실제 녹음 길이를 재서** 클립 사용 길이를 조정한다

3번이 중요하다. `narration.ts`의 `at`/`until`은 화면 자막용으로 정한 값이고,
창(23줄)은 감정을 실으면 대개 길어진다 — 특히 `indangsu-04`(하직 인사)와
`feast-07`(개안). 녹음이 길어지면 그 줄이 걸친 클립의 사용 길이를 늘려 맞춘다.
클립마다 버리는 몫이 남아 있으므로 여유가 있다.
