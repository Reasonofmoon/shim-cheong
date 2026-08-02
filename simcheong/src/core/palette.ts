import { Color } from 'three';

/**
 * Obangsaek (오방색) — the five cardinal colours of Korean traditional art,
 * plus the dancheong (단청) pigments used on temple and palace timberwork.
 *
 * Every colour in this film comes from here. Nothing is sampled from a texture,
 * so the palette is the only place "art direction" physically lives.
 */
export const OBANG = {
  /** 청(靑) — east, wood, spring. A deep pine blue-green. */
  cheong: 0x1f6b63,
  /** 적(赤) — south, fire, summer. Dahong, the persimmon red of a bridal skirt. */
  jeok: 0xc8402f,
  /** 황(黃) — centre, earth. The imperial ochre. */
  hwang: 0xe0a838,
  /** 백(白) — west, metal, autumn. Hanji paper white, never pure #fff. */
  baek: 0xf0e9db,
  /** 흑(黑) — north, water, winter. Ink black with a blue cast. */
  heuk: 0x171a21,
} as const;

/** Dancheong pigments, in their traditional names. */
export const DANCHEONG = {
  /** 장단 — vermilion lead, the base red of column shafts. */
  jangdan: 0xbf4b2c,
  /** 삼청 — azurite blue used for the recessed panels. */
  samcheong: 0x40749b,
  /** 뇌록 — the green-grey earth pigment that primes every beam. */
  noerok: 0x5f7059,
  /** 석간주 — iron oxide brown for structural members. */
  seokganju: 0x6f3729,
  /** 호분 — oyster-shell white for the fine outlines. */
  hobun: 0xe8e0cf,
} as const;

/** Earth, foliage, timber and cloth tones shared across every act. */
export const NATURE = {
  soil: 0x5a4636,
  soilDry: 0x6d5946,
  ricePaddy: 0x7d8b4a,
  riceRipe: 0xc2a34e,
  grass: 0x536b3c,
  grassWinter: 0x7b7358,
  pineNeedle: 0x2c4a35,
  pineBark: 0x5b3a2b,
  willowLeaf: 0x7f9a4e,
  thatch: 0xb99a63,
  thatchWorn: 0x9a7f52,
  timber: 0x6b4c33,
  stone: 0x8b8b86,
  stoneDark: 0x5f6060,
  snow: 0xe6e8ea,
} as const;

/** Skin, hair and hanbok cloth. Commoners wear undyed hemp; nobles wear dye. */
export const CLOTH = {
  skin: 0xd9b394,
  skinPale: 0xe4c6ab,
  hair: 0x241c1a,
  hempWhite: 0xe3dccb,
  hempGrey: 0xc0b8a5,
  mourningWhite: 0xeee9dd,
  monkGrey: 0x8d8b84,
  monkKasaya: 0x9a4f36,
  merchantIndigo: 0x2f4356,
  royalRed: 0xa8232c,
  royalGold: 0xd8ad4a,
  cheongSkirt: 0x33566e,
  cheongJeogori: 0xf2e6d4,
} as const;

/** Water column colours for the sea and the dragon palace. */
export const SEA = {
  shallow: 0x3f7c86,
  deep: 0x0d2a3c,
  abyss: 0x061722,
  foam: 0xdfeaea,
  stormDeep: 0x14232e,
  stormCrest: 0x54707a,
  palaceGlow: 0x53d2c4,
} as const;

/**
 * A named sky mood. Acts crossfade between these to carry the story's arc.
 *
 * A note on `fogDensity`, because it was got badly wrong the first time.
 *
 * `FogExp2` computes `1 - exp(-(density * distance)^2)`, which rises far faster
 * than intuition suggests. At this film's scale — action at 20–60 units,
 * background ridges at 240–780 — the usable band is roughly 0.003 to 0.012.
 * A density of 0.017 puts the near cottage at 20% fog and washes the entire
 * frame to a flat beige; 0.03 renders the middle distance invisible. Every
 * value below is chosen so the *subject* stays clear and only the ridgelines
 * dissolve.
 */
export interface SkyMood {
  readonly zenith: number;
  readonly horizon: number;
  readonly ground: number;
  /** Direction the key light comes from, normalised at build time. */
  readonly sun: readonly [number, number, number];
  readonly sunColor: number;
  readonly sunIntensity: number;
  readonly ambient: number;
  readonly ambientIntensity: number;
  readonly fog: number;
  readonly fogDensity: number;
}

/**
 * Declared without an explicit `Record` annotation so the keys stay literal —
 * `SKY.storm` is then known to exist, and acts do not have to null-check a mood
 * they can see written right here.
 */
export const SKY = {
  /** Act 1 — a bleak, colourless winter burial. */
  winterMourning: {
    // Overcast winter is uniformly pale, not a deep blue dome. The first pass
    // used a dark zenith and the sky read as dusk with a strip light on the
    // horizon; a narrow zenith-to-horizon range is what makes it read overcast.
    zenith: 0x9dabb8,
    horizon: 0xc7ccce,
    ground: 0x8a8b84,
    sun: [-0.35, 0.42, -0.6],
    sunColor: 0xdfe2e0,
    sunIntensity: 1.75,
    ambient: 0x94a4b6,
    ambientIntensity: 0.72,
    fog: 0xb6bec6,
    fogDensity: 0.0072,
  },
  /** Act 2 — a warm village noon, the one happy stretch of the tale. */
  villageNoon: {
    zenith: 0x4f86bd,
    horizon: 0xcfe0e6,
    ground: 0x8d9163,
    sun: [0.45, 0.72, 0.4],
    sunColor: 0xfff2d6,
    sunIntensity: 2.1,
    ambient: 0xbcd0e4,
    ambientIntensity: 0.85,
    fog: 0xc8dbe2,
    fogDensity: 0.0038,
  },
  /** Act 3 — dusk at the mountain temple, lanterns doing the work. */
  templeDusk: {
    zenith: 0x2b3a63,
    horizon: 0xd88a55,
    ground: 0x3f3a33,
    sun: [-0.7, 0.16, 0.35],
    sunColor: 0xf0a262,
    sunIntensity: 1.5,
    ambient: 0x54608c,
    ambientIntensity: 0.75,
    fog: 0x7a6a72,
    fogDensity: 0.0062,
  },
  /** Act 4 — a grey dawn at the harbour, the day she is sold. */
  harbourDawn: {
    zenith: 0x50607d,
    horizon: 0xe0b287,
    ground: 0x6a6558,
    sun: [0.6, 0.2, -0.5],
    sunColor: 0xffc890,
    sunIntensity: 1.6,
    ambient: 0x7d88a0,
    ambientIntensity: 0.9,
    fog: 0xa9a598,
    fogDensity: 0.0055,
  },
  /** Act 5 — the storm over Indangsu. Almost no sky left. */
  storm: {
    zenith: 0x1a222c,
    horizon: 0x3d4a52,
    ground: 0x141c24,
    sun: [-0.2, 0.5, -0.8],
    sunColor: 0x9fb4bd,
    sunIntensity: 0.9,
    // Lifted after the first render: with a low key and a dark ambient the
    // ship became a black hole in the middle of a lit sea.
    ambient: 0x54697e,
    ambientIntensity: 1.35,
    fog: 0x2b363f,
    fogDensity: 0.0115,
  },
  /** Act 6 — the dragon palace. There is no sun down here, only glow. */
  undersea: {
    // Underwater there is no horizon, so the sky's three stops are kept close
    // together and close to the fog colour. Any contrast between them draws a
    // hard line across the middle of the frame — which is exactly what the
    // first pass did, in a scene that is supposed to be a single volume.
    zenith: 0x0e4a50,
    horizon: 0x0a2c36,
    ground: 0x07242f,
    sun: [0.1, 1.0, 0.15],
    sunColor: 0x7fe3d8,
    sunIntensity: 0.85,
    ambient: 0x1a5a63,
    ambientIntensity: 1.1,
    fog: 0x07242f,
    // Water is genuinely denser than air, but this still has to sit inside the
    // usable band described above. At 0.019 — the first value tried — a scene
    // using this mood without overriding it per frame renders solid black, and
    // the fog colour here is nearly black so there is no beige tell to warn
    // you. Act VI drives this down to 0.011→0.004 as it approaches the palace;
    // this default only governs the frame before its first update.
    fogDensity: 0.012,
  },
  /** Act 7 — she surfaces in a lotus at first light. */
  lotusDawn: {
    zenith: 0x36527e,
    horizon: 0xf3c79a,
    ground: 0x4e5b60,
    sun: [0.5, 0.28, 0.62],
    sunColor: 0xffd8a8,
    sunIntensity: 1.9,
    ambient: 0x8fa6bd,
    ambientIntensity: 0.95,
    fog: 0xc0b3ab,
    fogDensity: 0.0058,
  },
  /** Act 8 — the palace feast, and the moment his eyes open. */
  palaceDay: {
    zenith: 0x5b93c4,
    horizon: 0xe8e0cb,
    ground: 0x94886d,
    sun: [0.35, 0.8, 0.45],
    sunColor: 0xfff6e2,
    sunIntensity: 2.3,
    ambient: 0xc9d8e6,
    ambientIntensity: 0.95,
    fog: 0xd9d5c6,
    fogDensity: 0.0032,
  },
} satisfies Record<string, SkyMood>;

const scratchA = new Color();
const scratchB = new Color();

/** Linear interpolation between two hex colours, returned as a new Color. */
export function mixHex(a: number, b: number, t: number): Color {
  scratchA.setHex(a);
  scratchB.setHex(b);
  return scratchA.clone().lerp(scratchB, t);
}

/**
 * Nudge a hex colour's lightness and saturation. Used everywhere to break up
 * flat fills — a hundred roof tiles all sharing one exact colour reads as
 * plastic, but a ±4% jitter reads as fired clay.
 */
export function vary(base: number, lightness: number, saturation = 0): Color {
  const c = scratchA.setHex(base).clone();
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(
    hsl.h,
    Math.min(1, Math.max(0, hsl.s + saturation)),
    Math.min(1, Math.max(0, hsl.l + lightness)),
  );
  return c;
}
