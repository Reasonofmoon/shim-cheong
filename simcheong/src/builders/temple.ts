import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { applyVertexTint, hanji, meshOf, surface, unlit } from './materials';
import { buildBracketSet, buildPaintedColumn, buildStairs } from './hanok';
import { DANCHEONG, NATURE, OBANG, vary } from '../core/palette';
import { DEFAULT_ROOF, frontEavePoint, hipRoof, type RoofSpec } from './roof';
import type { Rng } from '../core/rng';

/**
 * The mountain temple of Act 3, where a monk tells Sim's father that three
 * hundred sacks of rice offered to the Buddha will restore his sight.
 *
 * Everything here is built from the same roof surface as the village cottages,
 * but with the tile ribbing on, far more angok, and dancheong paint on the
 * timber. That continuity is deliberate: a Korean temple *is* a hanok, built
 * richer, and the film reads better when the shapes rhyme.
 */

export interface HallSpec {
  readonly kan?: number;
  readonly kanWidth?: number;
  readonly depth?: number;
  readonly columnHeight?: number;
  /** Two-tier roof, for the main hall and the palace throne room. */
  readonly doubleRoof?: boolean;
  readonly litInterior?: number;
  readonly doorColor?: number;
}

export interface HallRig {
  readonly group: Group;
  /** Where a figure standing on the porch would be, in local space. */
  readonly porch: Vector3;
  /** Front eave points, for hanging lanterns. */
  readonly eave: Vector3[];
  readonly width: number;
  readonly depth: number;
  readonly roofTop: number;
}

export function buildHall(spec: HallSpec, rng: Rng): HallRig {
  const kan = spec.kan ?? 3;
  const kanWidth = spec.kanWidth ?? 3.0;
  const width = kan * kanWidth;
  const depth = spec.depth ?? 6.2;
  const colH = spec.columnHeight ?? 3.4;

  const group = new Group();
  const halfW = width / 2;
  const halfD = depth / 2;

  // ---- Stone platform and stairs -----------------------------------------
  const platH = 0.85;
  const plat = applyVertexTint(new BoxGeometry(width + 2.4, platH, depth + 2.0), rng, 0.055);
  plat.translate(0, platH / 2, 0);
  group.add(meshOf(plat, surface(vary(NATURE.stone, 0.04).getHex(), { roughness: 0.95 })));

  const stairMat = surface(NATURE.stone, { roughness: 0.94 });
  for (const step of buildStairs(3.0, 4, platH / 4, 0.34, rng)) {
    step.translate(0, 0, halfD + 1.0);
    group.add(meshOf(step, stairMat));
  }

  // ---- Columns ------------------------------------------------------------
  const colXs: number[] = [];
  for (let i = 0; i <= kan; i++) colXs.push(-halfW + i * kanWidth);

  for (const cx of colXs) {
    for (const cz of [halfD, -halfD]) {
      const col = buildPaintedColumn(colH, 0.19, rng);
      col.position.set(cx, platH, cz);
      group.add(col);

      const bracket = buildBracketSet(1.0, rng);
      bracket.position.set(cx, platH + colH, cz);
      group.add(bracket);
    }
  }

  // ---- Head beams, painted --------------------------------------------------
  const beamY = platH + colH + 0.62;
  for (const cz of [halfD, -halfD]) {
    const beam = applyVertexTint(new BoxGeometry(width + 0.9, 0.34, 0.26), rng, 0.045);
    beam.translate(0, beamY, cz);
    group.add(meshOf(beam, surface(DANCHEONG.noerok, { roughness: 0.86 })));

    const trim = new BoxGeometry(width + 0.92, 0.09, 0.29);
    trim.translate(0, beamY + 0.2, cz);
    group.add(meshOf(trim, surface(DANCHEONG.jangdan, { roughness: 0.86 }), false, false));
  }
  for (const cx of [halfW, -halfW]) {
    const beam = applyVertexTint(new BoxGeometry(0.26, 0.34, depth), rng, 0.045);
    beam.translate(cx, beamY, 0);
    group.add(meshOf(beam, surface(DANCHEONG.noerok, { roughness: 0.86 })));
  }

  // ---- Walls and lattice doors ---------------------------------------------
  const wallMat = surface(vary(DANCHEONG.hobun, -0.04).getHex(), { roughness: 0.97 });
  const doorMat = surface(spec.doorColor ?? DANCHEONG.seokganju, { roughness: 0.88 });
  const paperMat = hanji(0xf2e2bc, spec.litInterior ?? 0, 1);

  for (let i = 0; i < kan; i++) {
    const cx = -halfW + (i + 0.5) * kanWidth;
    const doorW = kanWidth - 0.5;
    const doorH = colH * 0.82;

    const panel = applyVertexTint(new BoxGeometry(doorW, doorH, 0.05), rng, 0.02);
    panel.translate(cx, platH + doorH / 2 + 0.1, halfD - 0.22);
    group.add(meshOf(panel, paperMat, false, false));

    // Kkotsalmun — the flower-lattice door of a temple hall. Diagonal crossing
    // over the orthogonal grid is what distinguishes it from a house door.
    const cols = 5;
    const rows = 8;
    for (let c = 0; c <= cols; c++) {
      const bar = new BoxGeometry(0.035, doorH, 0.06);
      bar.translate(cx - doorW / 2 + (c / cols) * doorW, platH + doorH / 2 + 0.1, halfD - 0.19);
      group.add(meshOf(bar, doorMat, false, false));
    }
    for (let r = 0; r <= rows; r++) {
      const bar = new BoxGeometry(doorW, 0.032, 0.06);
      bar.translate(cx, platH + 0.1 + (r / rows) * doorH, halfD - 0.19);
      group.add(meshOf(bar, doorMat, false, false));
    }
    for (let d = -3; d <= 3; d++) {
      const diag = new BoxGeometry(doorW * 1.3, 0.022, 0.05);
      diag.translate(cx, platH + doorH * 0.5 + 0.1 + d * (doorH / 7), halfD - 0.165);
      const mesh = meshOf(diag, doorMat, false, false);
      mesh.rotation.z = 0.62;
      group.add(mesh);
    }

    // Back and side infill.
    const back = applyVertexTint(new BoxGeometry(kanWidth, colH, 0.24), rng, 0.05);
    back.translate(cx, platH + colH / 2, -halfD);
    group.add(meshOf(back, wallMat));
  }

  for (const cx of [halfW, -halfW]) {
    const wall = applyVertexTint(new BoxGeometry(0.24, colH, depth), rng, 0.05);
    wall.translate(cx, platH + colH / 2, 0);
    group.add(meshOf(wall, wallMat));
  }

  // ---- Roof -----------------------------------------------------------------
  const lowerSpec: RoofSpec = {
    ...DEFAULT_ROOF,
    ridgeHalf: halfW * 0.42,
    eaveHalfX: halfW + 2.1,
    eaveHalfZ: halfD + 2.0,
    drop: 2.15,
    angok: 0.78,
    anheorigok: 0.5,
    concavity: 1,
    ribs: Math.round(width * 3.0),
    ribDepth: 0.06,
    thatch: 0,
    uSegments: Math.round(width * 13),
    vSegments: 15,
  };

  const tileMat = surface(0x474d57, { roughness: 0.8, doubleSide: true });
  const lower = hipRoof(lowerSpec, rng.int(0, 9999));
  lower.translate(0, beamY + lowerSpec.drop + 0.3, 0);
  applyVertexTint(lower, rng, 0.06);
  group.add(meshOf(lower, tileMat));

  let roofTop = beamY + lowerSpec.drop + 0.3;

  if (spec.doubleRoof) {
    // The upper storey sits back on a short drum wall — the classic two-tier
    // Korean hall, seen on Daeungjeon halls and on throne rooms.
    const drumH = 1.5;
    const drum = applyVertexTint(new BoxGeometry(width * 0.72, drumH, depth * 0.66), rng, 0.05);
    drum.translate(0, roofTop + drumH / 2, 0);
    group.add(meshOf(drum, surface(DANCHEONG.jangdan, { roughness: 0.88 })));

    const upperSpec: RoofSpec = {
      ...lowerSpec,
      ridgeHalf: halfW * 0.30,
      eaveHalfX: halfW * 0.82,
      eaveHalfZ: halfD * 0.78,
      drop: 1.75,
      angok: 0.68,
      ribs: Math.round(width * 2.2),
      uSegments: Math.round(width * 10),
    };
    const upper = hipRoof(upperSpec, rng.int(0, 9999));
    upper.translate(0, roofTop + drumH + upperSpec.drop + 0.2, 0);
    applyVertexTint(upper, rng, 0.06);
    group.add(meshOf(upper, tileMat));
    roofTop = roofTop + drumH + upperSpec.drop + 0.2;

    addRidge(group, upperSpec, roofTop, rng);
  }

  addRidge(group, lowerSpec, beamY + lowerSpec.drop + 0.3, rng);

  const eave: Vector3[] = [];
  for (let i = 0; i <= 6; i++) {
    const p = frontEavePoint(lowerSpec, i / 6, new Vector3());
    p.y += beamY + lowerSpec.drop + 0.3;
    eave.push(p);
  }

  return {
    group,
    porch: new Vector3(0, platH, halfD + 0.8),
    eave,
    width,
    depth,
    roofTop,
  };
}

/** Yongmaru and the little clay guardians that ride the hip ridges. */
function addRidge(group: Group, spec: RoofSpec, baseY: number, rng: Rng): void {
  const ridgeMat = surface(0x363b44, { roughness: 0.82 });
  const ridge = applyVertexTint(new BoxGeometry(spec.ridgeHalf * 2 + 0.5, 0.4, 0.46), rng, 0.05);
  ridge.translate(0, baseY + 0.18, 0);
  group.add(meshOf(ridge, ridgeMat));

  // Chimi — the upturned ornament at each end of the main ridge.
  for (const end of [1, -1] as const) {
    const profile: Vector2[] = [
      new Vector2(0.001, 0),
      new Vector2(0.16, 0.02),
      new Vector2(0.2, 0.2),
      new Vector2(0.14, 0.44),
      new Vector2(0.05, 0.56),
      new Vector2(0.001, 0.58),
    ];
    const chimi = new LatheGeometry(profile, 8);
    chimi.scale(1.5, 1.5, 1.1);
    chimi.translate(end * (spec.ridgeHalf + 0.24), baseY + 0.3, 0);
    group.add(meshOf(applyVertexTint(chimi, rng, 0.05), ridgeMat));
  }

  // Japsang — the row of small figures marching down each hip ridge.
  for (const sx of [1, -1] as const) {
    for (const sz of [1, -1] as const) {
      const count = rng.int(3, 5);
      for (let i = 0; i < count; i++) {
        const k = (i + 1) / (count + 1);
        const fig = new SphereGeometry(0.11, 5, 4);
        fig.scale(0.8, 1.5, 0.8);
        fig.translate(
          sx * (spec.ridgeHalf + k * (spec.eaveHalfX - spec.ridgeHalf)),
          baseY - spec.drop * (1 - (1 - k) * (1 - k)) + spec.angok * Math.pow(k, 2.6) + 0.15,
          sz * spec.eaveHalfZ * k,
        );
        group.add(meshOf(fig, ridgeMat, true, false));
      }
    }
  }
}

/**
 * A stone pagoda. Korean pagodas are stone rather than timber, with a heavy
 * plinth and roof-stones whose corners flick up in miniature echoes of the
 * building's own eaves.
 */
export function buildPagoda(tiers: number, rng: Rng, scale = 1): Group {
  const group = new Group();
  const stoneMat = surface(vary(NATURE.stone, -0.02).getHex(), { roughness: 0.97 });

  const baseH = 0.5 * scale;
  const base = applyVertexTint(new BoxGeometry(2.4 * scale, baseH, 2.4 * scale), rng, 0.06);
  base.translate(0, baseH / 2, 0);
  group.add(meshOf(base, stoneMat));

  const plinth = applyVertexTint(new BoxGeometry(1.85 * scale, 0.45 * scale, 1.85 * scale), rng, 0.06);
  plinth.translate(0, baseH + 0.225 * scale, 0);
  group.add(meshOf(plinth, stoneMat));

  let y = baseH + 0.45 * scale;
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const bodyW = (1.25 - k * 0.55) * scale;
    const bodyH = (0.62 - k * 0.16) * scale;

    const body = applyVertexTint(new BoxGeometry(bodyW, bodyH, bodyW), rng, 0.06);
    body.translate(0, y + bodyH / 2, 0);
    group.add(meshOf(body, stoneMat));
    y += bodyH;

    // The roof stone: a shallow slab with the corners lifted, built from the
    // same hip-roof function so it echoes the halls around it.
    const capSpec: RoofSpec = {
      ...DEFAULT_ROOF,
      ridgeHalf: bodyW * 0.16,
      eaveHalfX: bodyW * 1.5,
      eaveHalfZ: bodyW * 1.5,
      drop: 0.3 * scale,
      angok: 0.28 * scale,
      anheorigok: 0.22,
      concavity: 1,
      ribs: 0,
      ribDepth: 0,
      thatch: 0,
      uSegments: 16,
      vSegments: 6,
    };
    const cap = hipRoof(capSpec, rng.int(0, 9999));
    cap.translate(0, y + capSpec.drop, 0);
    applyVertexTint(cap, rng, 0.05);
    group.add(meshOf(cap, surface(vary(NATURE.stone, -0.06).getHex(), { roughness: 0.96, doubleSide: true })));
    y += 0.1 * scale;
  }

  // Finial.
  const finial = new SphereGeometry(0.13 * scale, 7, 6);
  finial.translate(0, y + 0.2 * scale, 0);
  group.add(meshOf(finial, stoneMat));
  const spire = new CylinderGeometry(0.02 * scale, 0.05 * scale, 0.5 * scale, 6);
  spire.translate(0, y + 0.45 * scale, 0);
  group.add(meshOf(spire, stoneMat));

  return group;
}

export interface LanternRig {
  readonly group: Group;
  readonly light: PointLight;
  readonly core: Group;
}

/**
 * A yeondeung — the paper lotus lantern hung in rows for Buddha's birthday.
 * These carry Act 3: a mountain path lined with them at dusk is instantly and
 * unmistakably a Korean temple.
 */
export function buildLantern(color: number, rng: Rng, scale = 1): LanternRig {
  const group = new Group();

  const core = new Group();
  group.add(core);

  const profile: Vector2[] = [
    new Vector2(0.001, 0),
    new Vector2(0.13, 0.03),
    new Vector2(0.2, 0.14),
    new Vector2(0.21, 0.3),
    new Vector2(0.15, 0.42),
    new Vector2(0.001, 0.45),
  ].map((v) => new Vector2(v.x * scale, v.y * scale - 0.45 * scale));

  const shell = new LatheGeometry(profile, 12);
  applyVertexTint(shell, rng, 0.04);
  core.add(meshOf(shell, hanji(color, 1.35, 0.92), false, false));

  // Lotus petals wrapped around the shell — the detail that makes it a
  // yeondeung rather than a generic paper lamp.
  const petalMat = surface(color, {
    roughness: 0.95,
    emissive: color,
    emissiveIntensity: 0.5,
    doubleSide: true,
  });
  for (let ring = 0; ring < 3; ring++) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.4;
      const r = (0.19 - ring * 0.02) * scale;
      const petal = new SphereGeometry(0.07 * scale, 5, 4, 0, Math.PI, 0, Math.PI);
      petal.scale(1, 1.5, 0.35);
      const mesh = meshOf(petal, petalMat, false, false);
      mesh.position.set(
        Math.cos(a) * r,
        (-0.34 + ring * 0.11) * scale,
        Math.sin(a) * r,
      );
      mesh.rotation.y = -a + Math.PI / 2;
      mesh.rotation.x = 0.5 - ring * 0.16;
      core.add(mesh);
    }
  }

  // Hanging cord and tassel.
  const cord = new CylinderGeometry(0.008 * scale, 0.008 * scale, 0.5 * scale, 4);
  cord.translate(0, 0.25 * scale, 0);
  group.add(meshOf(cord, surface(0x6b4c33, { roughness: 0.95 }), false, false));

  const tassel = new CylinderGeometry(0.02 * scale, 0.055 * scale, 0.28 * scale, 6);
  tassel.translate(0, -0.6 * scale, 0);
  core.add(meshOf(tassel, surface(OBANG.jeok, { roughness: 0.9 }), false, false));

  const glow = new SphereGeometry(0.09 * scale, 7, 6);
  glow.translate(0, -0.32 * scale, 0);
  core.add(meshOf(glow, unlit(0xffe6ad), false, false));

  const light = new PointLight(color, 2.6 * scale * scale, 7 * scale, 2);
  light.position.y = -0.32 * scale;
  core.add(light);

  return { group, light, core };
}

/** A stone lantern (석등) — the standing counterpart to the hanging kind. */
export function buildStoneLantern(rng: Rng, scale = 1): LanternRig {
  const group = new Group();
  const stoneMat = surface(vary(NATURE.stone, -0.05).getHex(), { roughness: 0.97 });

  const base = applyVertexTint(new CylinderGeometry(0.42 * scale, 0.5 * scale, 0.22 * scale, 8), rng, 0.06);
  base.translate(0, 0.11 * scale, 0);
  group.add(meshOf(base, stoneMat));

  const shaft = applyVertexTint(new CylinderGeometry(0.13 * scale, 0.16 * scale, 1.0 * scale, 8), rng, 0.06);
  shaft.translate(0, 0.72 * scale, 0);
  group.add(meshOf(shaft, stoneMat));

  const core = new Group();
  core.position.y = 1.45 * scale;
  group.add(core);

  const house = applyVertexTint(new CylinderGeometry(0.34 * scale, 0.34 * scale, 0.48 * scale, 8, 1, true), rng, 0.05);
  core.add(meshOf(house, surface(NATURE.stone, { roughness: 0.96, doubleSide: true })));

  const flame = new SphereGeometry(0.13 * scale, 7, 6);
  core.add(meshOf(flame, unlit(0xffd68a), false, false));

  const capSpec: RoofSpec = {
    ...DEFAULT_ROOF,
    ridgeHalf: 0.04 * scale,
    eaveHalfX: 0.62 * scale,
    eaveHalfZ: 0.62 * scale,
    drop: 0.26 * scale,
    angok: 0.24 * scale,
    anheorigok: 0.3,
    ribs: 0,
    ribDepth: 0,
    thatch: 0,
    uSegments: 16,
    vSegments: 6,
  };
  const cap = hipRoof(capSpec, rng.int(0, 9999));
  cap.translate(0, 0.28 * scale + capSpec.drop, 0);
  applyVertexTint(cap, rng, 0.05);
  core.add(meshOf(cap, surface(vary(NATURE.stone, -0.08).getHex(), { roughness: 0.96, doubleSide: true })));

  const finial = new SphereGeometry(0.08 * scale, 6, 5);
  finial.translate(0, 0.62 * scale, 0);
  core.add(meshOf(finial, stoneMat));

  const light = new PointLight(0xffc073, 3.2 * scale * scale, 9 * scale, 2);
  core.add(light);

  return { group, light, core };
}

/**
 * A hanging temple bell in its pavilion. Struck with a beam, not a clapper —
 * and the sound of it is the cue that ends Act 3 in the script.
 */
export function buildBell(rng: Rng, scale = 1): { group: Group; bell: Group } {
  const group = new Group();
  const bronze = surface(0x6e6a4f, { roughness: 0.42, metalness: 0.55, flat: false });

  const bell = new Group();
  bell.position.y = 2.3 * scale;
  group.add(bell);

  const profile: Vector2[] = [
    new Vector2(0.001, 1.1),
    new Vector2(0.2, 1.06),
    new Vector2(0.42, 0.9),
    new Vector2(0.52, 0.55),
    new Vector2(0.55, 0.16),
    new Vector2(0.58, 0.02),
    new Vector2(0.53, 0.0),
    new Vector2(0.5, 0.06),
    new Vector2(0.47, 0.5),
    new Vector2(0.001, 1.02),
  ].map((v) => new Vector2(v.x * scale, (v.y - 1.1) * scale));

  bell.add(meshOf(applyVertexTint(new LatheGeometry(profile, 18), rng, 0.03), bronze));

  // Yongnyu — the dragon-shaped loop a Korean bell hangs from.
  const loop = new TorusGeometry(0.11 * scale, 0.045 * scale, 6, 12);
  loop.rotateY(Math.PI / 2);
  loop.translate(0, 0.08 * scale, 0);
  bell.add(meshOf(loop, bronze));

  // Frame.
  const woodMat = surface(DANCHEONG.seokganju, { roughness: 0.9 });
  for (const sx of [1, -1] as const) {
    for (const sz of [1, -1] as const) {
      const post = applyVertexTint(new CylinderGeometry(0.11 * scale, 0.13 * scale, 3.0 * scale, 7), rng, 0.05);
      post.translate(sx * 1.15 * scale, 1.5 * scale, sz * 0.95 * scale);
      group.add(meshOf(post, woodMat));
    }
  }
  const lintel = new BoxGeometry(2.6 * scale, 0.2 * scale, 0.2 * scale);
  lintel.translate(0, 2.9 * scale, 0);
  group.add(meshOf(lintel, woodMat));

  // The striking beam, slung on ropes.
  const beam = applyVertexTint(new CylinderGeometry(0.1 * scale, 0.12 * scale, 1.9 * scale, 7), rng, 0.06);
  beam.rotateX(Math.PI / 2);
  beam.translate(0, 1.55 * scale, 1.5 * scale);
  group.add(meshOf(beam, surface(0x5a4128, { roughness: 0.94 })));

  return { group, bell };
}
