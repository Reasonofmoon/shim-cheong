import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import { applyVertexTint, groundShade, hanji, meshOf, stillWater, surface } from './materials';
import { DANCHEONG, NATURE, vary } from '../core/palette';
import { DEFAULT_ROOF, hipRoof, type RoofSpec } from './roof';
import type { Rng } from '../core/rng';

/**
 * Buildings.
 *
 * A hanok is a post-and-beam frame sitting on a raised stone platform, with
 * non-structural infill between the posts. Building it in that order — platform,
 * then posts, then infill, then roof — is not pedantry: it is what produces the
 * correct proportions automatically, because the roof overhang is derived from
 * the post spacing rather than guessed.
 *
 * The unit of a hanok's plan is the `kan` (칸), the bay between two posts,
 * roughly 2.4 m. A poor family's house is the proverbial `초가삼간` — a
 * three-kan thatched cottage — which is exactly what Sim Cheong grows up in.
 */

export interface CottageSpec {
  /** Number of bays along the front. Three is the canonical poor man's house. */
  readonly kan?: number;
  readonly kanWidth?: number;
  readonly depth?: number;
  readonly wallHeight?: number;
  /** Thatch for a cottage, tile for anyone who can afford it. */
  readonly roofing?: 'thatch' | 'tile';
  /** Adds the raised wooden floor (마루) between the rooms. */
  readonly maru?: boolean;
  /** Lights the paper doors from inside. */
  readonly litWindows?: number;
  readonly weathered?: number;
}

const KAN = 2.4;

/** A commoner's house. The single most-used building in the film. */
export function buildCottage(spec: CottageSpec, rng: Rng): Group {
  const kan = spec.kan ?? 3;
  const kanWidth = spec.kanWidth ?? KAN;
  const width = kan * kanWidth;
  const depth = spec.depth ?? 4.2;
  const wallH = spec.wallHeight ?? 2.05;
  const roofing = spec.roofing ?? 'thatch';
  const weathered = spec.weathered ?? 0.35;

  const group = new Group();
  const halfW = width / 2;
  const halfD = depth / 2;

  // ---- Gidan: the stone platform the whole house sits on ----------------
  const platformH = 0.42;
  const platform = applyVertexTint(
    new BoxGeometry(width + 1.1, platformH, depth + 1.0),
    rng,
    0.07,
  );
  platform.translate(0, platformH / 2, 0);
  group.add(meshOf(platform, surface(NATURE.stone, { roughness: 0.95 })));

  // Rough field stones packed around the platform edge — hanok platforms are
  // dry-stacked, and the irregular course is a strong texture cue up close.
  const stoneMat = surface(NATURE.stoneDark, { roughness: 0.97 });
  const stoneCount = Math.round((width + depth) * 1.6);
  for (let i = 0; i < stoneCount; i++) {
    const along = rng.next();
    const front = rng.chance(0.5);
    const s = rng.range(0.16, 0.30);
    const stone = applyVertexTint(new SphereGeometry(s, 5, 4), rng, 0.1);
    stone.scale(1.3, 0.7, 1);
    const mesh = meshOf(stone, stoneMat);
    if (front) {
      mesh.position.set((along - 0.5) * (width + 1.0), rng.range(0.06, platformH - 0.06), (halfD + 0.5) * (rng.chance(0.5) ? 1 : -1));
    } else {
      mesh.position.set((halfW + 0.55) * (rng.chance(0.5) ? 1 : -1), rng.range(0.06, platformH - 0.06), (along - 0.5) * (depth + 0.9));
    }
    mesh.rotation.y = rng.range(0, Math.PI);
    group.add(mesh);
  }

  // ---- Frame: posts on stone footings -----------------------------------
  const postMat = surface(NATURE.timber, { roughness: 0.9 });
  const postR = 0.105;
  const postXs: number[] = [];
  for (let i = 0; i <= kan; i++) postXs.push(-halfW + i * kanWidth);

  for (const px of postXs) {
    for (const pz of [halfD, -halfD]) {
      const footing = applyVertexTint(new CylinderGeometry(0.19, 0.22, 0.16, 7), rng, 0.06);
      footing.translate(px, platformH + 0.08, pz);
      group.add(meshOf(footing, surface(NATURE.stone, { roughness: 0.95 })));

      const post = applyVertexTint(new CylinderGeometry(postR, postR * 1.08, wallH, 8), rng, 0.05);
      post.translate(px, platformH + 0.16 + wallH / 2, pz);
      group.add(meshOf(groundShade(post, platformH, wallH * 0.6, 0.24), postMat));
    }
  }

  // Head beams tying the posts together at the top — this is what the roof
  // actually sits on, and the visible line of it reads as "timber frame".
  const beamY = platformH + 0.16 + wallH;
  for (const pz of [halfD, -halfD]) {
    const beam = applyVertexTint(new BoxGeometry(width + postR * 2, 0.16, 0.13), rng, 0.05);
    beam.translate(0, beamY + 0.08, pz);
    group.add(meshOf(beam, postMat));
  }
  for (const px of [halfW, -halfW]) {
    const beam = applyVertexTint(new BoxGeometry(0.13, 0.14, depth), rng, 0.05);
    beam.translate(px, beamY + 0.07, 0);
    group.add(meshOf(beam, postMat));
  }

  // ---- Infill: mud walls and paper doors ---------------------------------
  // Korean mud-and-straw walls are a pale ochre, not brown earth. Three
  // stacked darkenings (base + weathering + ground shade) had them reading
  // near-black in overcast light, so the base is lifted and the AO eased.
  const mudMat = surface(vary(0x9c8768, -weathered * 0.05).getHex(), { roughness: 0.99 });
  const paperMat = hanji(0xf1e4c8, spec.litWindows ?? 0, 1);
  const doorFrameMat = surface(vary(NATURE.timber, -0.06).getHex(), { roughness: 0.9 });

  for (let i = 0; i < kan; i++) {
    const cx = -halfW + (i + 0.5) * kanWidth;
    const isDoor = i !== 0 || kan === 1;

    // Front face: paper door in most bays, mud in the kitchen bay.
    if (isDoor) {
      const doorW = kanWidth - postR * 2 - 0.12;
      const doorH = wallH * 0.78;
      const sillH = platformH + 0.16 + wallH * 0.11;

      const panel = applyVertexTint(new BoxGeometry(doorW, doorH, 0.04), rng, 0.02);
      panel.translate(cx, sillH + doorH / 2, halfD + 0.06);
      group.add(meshOf(panel, paperMat, false, false));

      // The lattice (창살). Korean door lattice is a simple orthogonal grid,
      // and its shadow on the paper is half the reason the door reads at all.
      const latticeMat = doorFrameMat;
      const cols = 4;
      const rows = 5;
      for (let c = 1; c < cols; c++) {
        const bar = new BoxGeometry(0.028, doorH, 0.05);
        bar.translate(cx - doorW / 2 + (c / cols) * doorW, sillH + doorH / 2, halfD + 0.075);
        group.add(meshOf(bar, latticeMat, false, false));
      }
      for (let r = 1; r < rows; r++) {
        const bar = new BoxGeometry(doorW, 0.026, 0.05);
        bar.translate(cx, sillH + (r / rows) * doorH, halfD + 0.075);
        group.add(meshOf(bar, latticeMat, false, false));
      }
      // Frame and threshold.
      const frameTop = new BoxGeometry(doorW + 0.1, 0.07, 0.09);
      frameTop.translate(cx, sillH + doorH + 0.03, halfD + 0.07);
      group.add(meshOf(frameTop, doorFrameMat));
      const frameSill = new BoxGeometry(doorW + 0.1, 0.09, 0.11);
      frameSill.translate(cx, sillH - 0.04, halfD + 0.07);
      group.add(meshOf(frameSill, doorFrameMat));
      // Mud above the door.
      const above = applyVertexTint(new BoxGeometry(kanWidth, wallH - doorH - wallH * 0.11, 0.2), rng, 0.05);
      above.translate(cx, sillH + doorH + (wallH - doorH - wallH * 0.11) / 2 + 0.06, halfD);
      group.add(meshOf(above, mudMat));
    } else {
      const wall = applyVertexTint(new BoxGeometry(kanWidth, wallH, 0.22), rng, 0.06);
      wall.translate(cx, platformH + 0.16 + wallH / 2, halfD);
      group.add(meshOf(groundShade(wall, platformH, wallH, 0.2), mudMat));
    }

    // Back face is always solid.
    const back = applyVertexTint(new BoxGeometry(kanWidth, wallH, 0.22), rng, 0.06);
    back.translate(cx, platformH + 0.16 + wallH / 2, -halfD);
    group.add(meshOf(groundShade(back, platformH, wallH, 0.2), mudMat));
  }

  // Gable-end walls.
  for (const px of [halfW, -halfW]) {
    const wall = applyVertexTint(new BoxGeometry(0.22, wallH, depth), rng, 0.06);
    wall.translate(px, platformH + 0.16 + wallH / 2, 0);
    group.add(meshOf(groundShade(wall, platformH, wallH, 0.2), mudMat));
  }

  // ---- Maru: the raised wooden floor open to the yard --------------------
  if (spec.maru ?? true) {
    const maruMat = surface(vary(NATURE.timber, 0.1).getHex(), { roughness: 0.8 });
    const boards = Math.round(kanWidth * 6);
    for (let i = 0; i < boards; i++) {
      const board = applyVertexTint(
        new BoxGeometry(kanWidth / boards - 0.012, 0.05, 1.0),
        rng,
        0.05,
      );
      board.translate(
        -halfW + kanWidth * (kan - 1) + (i + 0.5) * (kanWidth / boards),
        platformH + 0.19,
        halfD + 0.55,
      );
      group.add(meshOf(board, maruMat));
    }
  }

  // ---- Roof ---------------------------------------------------------------
  const roofSpec: RoofSpec =
    roofing === 'thatch'
      ? {
          ...DEFAULT_ROOF,
          ridgeHalf: halfW * 0.46,
          eaveHalfX: halfW + 0.72,
          eaveHalfZ: halfD + 0.66,
          drop: 1.85,
          // Thatch sags rather than sweeps: much less angok than tile.
          angok: 0.16,
          anheorigok: 0.12,
          concavity: 0.45,
          // The rope net that holds a thatch roof down was originally modelled
          // as separate bars. They floated off the curved surface and read as
          // sticks. Folding them into the surface ripple instead makes them
          // *part of* the roof, and costs nothing.
          ribs: Math.max(8, Math.round(width * 1.6)),
          ribDepth: 0.032,
          thatch: 0.105,
          uSegments: Math.round(width * 9),
          vSegments: 16,
        }
      : {
          ...DEFAULT_ROOF,
          ridgeHalf: halfW * 0.52,
          eaveHalfX: halfW + 1.05,
          eaveHalfZ: halfD + 1.0,
          drop: 1.5,
          angok: 0.5,
          anheorigok: 0.4,
          ribs: Math.round(width * 3.2),
          ribDepth: 0.05,
          thatch: 0,
          uSegments: Math.round(width * 14),
          vSegments: 13,
        };

  const roofGeo = hipRoof(roofSpec, rng.int(0, 9999));
  roofGeo.translate(0, beamY + roofSpec.drop + 0.16, 0);
  applyVertexTint(roofGeo, rng, roofing === 'thatch' ? 0.1 : 0.06);

  const roofMat =
    roofing === 'thatch'
      ? surface(vary(NATURE.thatch, -weathered * 0.12, -weathered * 0.08).getHex(), {
          roughness: 1,
          doubleSide: true,
        })
      : surface(0x4a4f57, { roughness: 0.82, doubleSide: true });
  group.add(meshOf(roofGeo, roofMat));

  if (roofing === 'thatch') {
    // The ridge cap — a fat, slightly sagging bundle of straw laid along the
    // top and bound at intervals. This is the read that says "thatch" at
    // distance more than any surface detail does.
    const cap = applyVertexTint(
      new CylinderGeometry(0.27, 0.27, roofSpec.ridgeHalf * 2 + 0.5, 8),
      rng,
      0.11,
    );
    cap.rotateZ(Math.PI / 2);
    cap.translate(0, beamY + roofSpec.drop + 0.28, 0);
    group.add(meshOf(cap, roofMat));

    const bindingMat = surface(0x7d6840, { roughness: 1 });
    const bindings = Math.max(3, Math.round(roofSpec.ridgeHalf * 1.6));
    for (let i = 0; i < bindings; i++) {
      const x = ((i + 0.5) / bindings - 0.5) * (roofSpec.ridgeHalf * 2 + 0.4);
      const tie = new TorusGeometry(0.29, 0.028, 5, 10);
      tie.rotateY(Math.PI / 2);
      tie.translate(x, beamY + roofSpec.drop + 0.28, 0);
      group.add(meshOf(tie, bindingMat, false, false));
    }
  } else {
    // Yongmaru: the heavy tiled ridge, plus the descending hip ridges.
    const ridgeMat = surface(0x3c414a, { roughness: 0.8 });
    const ridge = applyVertexTint(new BoxGeometry(halfW * 1.05 * 2, 0.26, 0.34), rng, 0.05);
    ridge.translate(0, beamY + roofSpec.drop + 0.16 + 0.11, 0);
    group.add(meshOf(ridge, ridgeMat));
  }

  return group;
}

/** A brushwood fence — split branches lashed between forked stakes. */
export function buildFence(length: number, rng: Rng, height = 1.05): Group {
  const group = new Group();
  const stakeMat = surface(0x6a563c, { roughness: 0.98 });
  const twigMat = surface(0x8b7550, { roughness: 1 });

  const posts = Math.max(2, Math.round(length / 1.6));
  for (let i = 0; i <= posts; i++) {
    const x = -length / 2 + (i / posts) * length;
    const h = height * rng.range(0.94, 1.1);
    const stake = applyVertexTint(new CylinderGeometry(0.045, 0.06, h, 5), rng, 0.09);
    stake.translate(x, h / 2, rng.spread(0.03));
    const mesh = meshOf(stake, stakeMat);
    mesh.rotation.z = rng.spread(0.05);
    group.add(mesh);
  }

  const twigs = Math.round(length * 5);
  for (let i = 0; i < twigs; i++) {
    const y = rng.range(0.12, height * 0.95);
    const seg = rng.range(0.9, 1.9);
    const twig = applyVertexTint(new CylinderGeometry(0.018, 0.026, seg, 4), rng, 0.12);
    twig.rotateZ(Math.PI / 2);
    twig.translate(rng.spread(length / 2 - seg / 2), y, rng.spread(0.05));
    const mesh = meshOf(twig, twigMat, false, false);
    mesh.rotation.y = rng.spread(0.06);
    mesh.rotation.z = rng.spread(0.045);
    group.add(mesh);
  }
  return group;
}

/**
 * Jangdokdae — the raised terrace of fermentation jars every Korean house has.
 * It is pure set dressing and it does more for "this is a Korean village" than
 * another building would.
 */
export function buildJangdokdae(rng: Rng, jars = 7): Group {
  const group = new Group();

  const base = applyVertexTint(new BoxGeometry(3.0, 0.28, 2.0), rng, 0.07);
  base.translate(0, 0.14, 0);
  group.add(meshOf(base, surface(NATURE.stone, { roughness: 0.95 })));

  for (let i = 0; i < jars; i++) {
    const scale = rng.range(0.55, 1.15);
    const jar = buildOnggi(scale, rng);
    jar.position.set(
      rng.range(-1.25, 1.25),
      0.28,
      rng.range(-0.7, 0.7),
    );
    jar.rotation.y = rng.range(0, Math.PI * 2);
    group.add(jar);
  }
  return group;
}

/** A single onggi jar: a lathe of the classic bulging Korean profile. */
export function buildOnggi(scale: number, rng: Rng): Group {
  const group = new Group();
  const profile: Vector2[] = [
    new Vector2(0.001, 0),
    new Vector2(0.20, 0.0),
    new Vector2(0.26, 0.10),
    new Vector2(0.34, 0.30),
    new Vector2(0.36, 0.48),
    new Vector2(0.31, 0.66),
    new Vector2(0.24, 0.78),
    new Vector2(0.245, 0.82),
    new Vector2(0.225, 0.83),
  ].map((v) => new Vector2(v.x * scale, v.y * scale));

  const body = applyVertexTint(new LatheGeometry(profile, 14), rng, 0.06);
  group.add(
    meshOf(
      body,
      surface(0x4a3126, { roughness: 0.55, metalness: 0.08, flat: false, doubleSide: true }),
    ),
  );

  // Straw lid, because a real jangdokdae is always half covered.
  if (rng.chance(0.45)) {
    const lid = applyVertexTint(new CylinderGeometry(0.26 * scale, 0.20 * scale, 0.06 * scale, 10), rng, 0.1);
    lid.translate(0, 0.85 * scale, 0);
    group.add(meshOf(lid, surface(0xb09a68, { roughness: 1 })));
  }
  return group;
}

/**
 * A village well with a windlass. Used in Act 2 as the place the neighbours
 * gather, which is where the story's community actually lives.
 */
export function buildWell(rng: Rng): Group {
  const group = new Group();
  const stoneMat = surface(NATURE.stone, { roughness: 0.96 });

  const rim = applyVertexTint(new CylinderGeometry(0.82, 0.9, 0.62, 14, 1, true), rng, 0.08);
  rim.translate(0, 0.31, 0);
  group.add(meshOf(rim, surface(NATURE.stoneDark, { roughness: 0.96, doubleSide: true })));

  const cap = applyVertexTint(new CylinderGeometry(0.92, 0.92, 0.12, 14), rng, 0.06);
  cap.translate(0, 0.66, 0);
  group.add(meshOf(cap, stoneMat));

  // Dark water disc, sunk just far enough to catch a highlight.
  const water = new CylinderGeometry(0.78, 0.78, 0.02, 14);
  water.translate(0, 0.2, 0);
  group.add(meshOf(water, stillWater(0x10222c, 0x5a7a92, 0.25), false, false));

  const postMat = surface(NATURE.timber, { roughness: 0.9 });
  for (const side of [1, -1] as const) {
    const post = applyVertexTint(new CylinderGeometry(0.07, 0.08, 1.6, 6), rng, 0.06);
    post.translate(side * 0.85, 0.8, 0);
    group.add(meshOf(post, postMat));
  }
  const bar = new CylinderGeometry(0.05, 0.05, 1.9, 6);
  bar.rotateZ(Math.PI / 2);
  bar.translate(0, 1.58, 0);
  group.add(meshOf(bar, postMat));

  const bucket = applyVertexTint(new CylinderGeometry(0.16, 0.13, 0.22, 8, 1, true), rng, 0.07);
  bucket.translate(0, 1.05, 0);
  group.add(meshOf(bucket, surface(0x5c4530, { roughness: 0.9, doubleSide: true })));
  const rope = new CylinderGeometry(0.012, 0.012, 0.42, 4);
  rope.translate(0, 1.37, 0);
  group.add(meshOf(rope, surface(0x8a7448, { roughness: 1 }), false, false));

  return group;
}

/**
 * Sotdae — the tall pole with a carved wooden bird that marks a village
 * boundary, and its squat companions the jangseung totems. Instantly legible as
 * a Korean village entrance.
 */
export function buildVillageMarker(rng: Rng): Group {
  const group = new Group();
  const woodMat = surface(0x5f4a33, { roughness: 0.96 });

  const pole = applyVertexTint(new CylinderGeometry(0.055, 0.085, 4.6, 7), rng, 0.07);
  pole.translate(0, 2.3, 0);
  group.add(meshOf(pole, woodMat));

  // The duck on top, three boxes and a wedge.
  const bird = new Group();
  bird.position.y = 4.62;
  const bodyGeo = applyVertexTint(new SphereGeometry(0.17, 7, 6), rng, 0.06);
  bodyGeo.scale(1.7, 0.85, 0.7);
  bird.add(meshOf(bodyGeo, woodMat));
  const neck = applyVertexTint(new CylinderGeometry(0.05, 0.065, 0.26, 5), rng, 0.06);
  neck.translate(0.2, 0.14, 0);
  const neckMesh = meshOf(neck, woodMat);
  neckMesh.rotation.z = -0.4;
  bird.add(neckMesh);
  const head = applyVertexTint(new SphereGeometry(0.085, 6, 5), rng, 0.06);
  head.scale(1.5, 1, 1);
  head.translate(0.33, 0.26, 0);
  bird.add(meshOf(head, woodMat));
  group.add(bird);

  // Two jangseung: forked logs with faces gouged into them.
  for (const side of [1, -1] as const) {
    const h = rng.range(2.0, 2.5);
    const totem = applyVertexTint(new CylinderGeometry(0.16, 0.2, h, 7), rng, 0.09);
    totem.translate(side * 1.3, h / 2, 0);
    const mesh = meshOf(totem, surface(0x54402c, { roughness: 0.98 }));
    mesh.rotation.z = rng.spread(0.04);
    group.add(mesh);

    const paintMat = surface(side > 0 ? DANCHEONG.jangdan : DANCHEONG.samcheong, { roughness: 0.9 });
    for (const eye of [-1, 1] as const) {
      const e = new SphereGeometry(0.036, 6, 5);
      e.scale(1, 1.3, 0.5);
      e.translate(side * 1.3 + eye * 0.062, h - 0.34, 0.155);
      group.add(meshOf(e, paintMat, false, false));
    }
    const mouth = new BoxGeometry(0.13, 0.035, 0.03);
    mouth.translate(side * 1.3, h - 0.55, 0.16);
    group.add(meshOf(mouth, paintMat, false, false));
  }

  return group;
}

/**
 * Compose a whole homestead: house, fence, jars, and the beaten yard.
 * Returns the group plus the world-space point of the front door, so acts can
 * stand characters there without hard-coding offsets.
 */
export function buildHomestead(
  rng: Rng,
  spec: CottageSpec = {},
): { group: Group; door: Vector3; yard: Vector3 } {
  const group = new Group();
  const house = buildCottage(spec, rng);
  group.add(house);

  const kan = spec.kan ?? 3;
  const kanWidth = spec.kanWidth ?? KAN;
  const depth = spec.depth ?? 4.2;
  const halfD = depth / 2;

  const jars = buildJangdokdae(rng, rng.int(4, 7));
  jars.position.set(kan * kanWidth * 0.5 + 1.9, 0, -0.6);
  jars.rotation.y = rng.spread(0.3);
  group.add(jars);

  const fence = buildFence(kan * kanWidth + 5.5, rng, 1.0);
  fence.position.set(0, 0, halfD + 5.2);
  group.add(fence);

  // The swept-earth yard (마당) — a flat, slightly lighter disc of soil.
  const yardGeo = applyVertexTint(new CylinderGeometry(5.4, 5.6, 0.06, 18), rng, 0.055);
  yardGeo.translate(0, 0.03, halfD + 2.6);
  group.add(meshOf(yardGeo, surface(vary(NATURE.soilDry, 0.05).getHex(), { roughness: 1 }), false, true));

  return {
    group,
    door: new Vector3(kanWidth * 0.5, 0.58, halfD + 0.4),
    yard: new Vector3(0, 0.06, halfD + 2.8),
  };
}

/** Shared by the temple and the palace: a dancheong-painted column. */
export function buildPaintedColumn(height: number, radius: number, rng: Rng): Group {
  const group = new Group();

  const shaft = applyVertexTint(new CylinderGeometry(radius * 0.94, radius, height, 12), rng, 0.045);
  shaft.translate(0, height / 2, 0);
  group.add(meshOf(shaft, surface(DANCHEONG.jangdan, { roughness: 0.88 })));

  // Banded decoration at top and bottom — the meoricho pattern, abstracted.
  const bands: Array<[number, number, number]> = [
    [height * 0.92, 0.1, DANCHEONG.noerok],
    [height * 0.86, 0.05, DANCHEONG.hobun],
    [height * 0.80, 0.08, DANCHEONG.samcheong],
    [height * 0.08, 0.09, DANCHEONG.noerok],
    [height * 0.03, 0.05, DANCHEONG.hobun],
  ];
  for (const [y, h, color] of bands) {
    const band = new CylinderGeometry(radius * 1.03, radius * 1.03, h, 12);
    band.translate(0, y, 0);
    group.add(meshOf(band, surface(color, { roughness: 0.85 }), false, false));
  }

  // Stone footing.
  const footing = applyVertexTint(new CylinderGeometry(radius * 1.5, radius * 1.7, 0.22, 10), rng, 0.06);
  footing.translate(0, 0.11, 0);
  group.add(meshOf(footing, surface(NATURE.stone, { roughness: 0.95 })));

  return group;
}

/** A stack of bracket sets (공포) under an eave — the signature temple detail. */
export function buildBracketSet(scale: number, rng: Rng): Group {
  const group = new Group();
  const colors = [DANCHEONG.noerok, DANCHEONG.samcheong, DANCHEONG.jangdan];

  for (let tier = 0; tier < 3; tier++) {
    const w = scale * (0.55 + tier * 0.28);
    const y = scale * (0.1 + tier * 0.19);
    const arm = applyVertexTint(new BoxGeometry(w, scale * 0.11, scale * 0.16), rng, 0.05);
    arm.translate(0, y, 0);
    group.add(meshOf(arm, surface(colors[tier % colors.length] ?? DANCHEONG.noerok, { roughness: 0.86 })));

    const cross = applyVertexTint(new BoxGeometry(scale * 0.16, scale * 0.11, w * 0.8), rng, 0.05);
    cross.translate(0, y + scale * 0.055, 0);
    group.add(
      meshOf(cross, surface(colors[(tier + 1) % colors.length] ?? DANCHEONG.jangdan, { roughness: 0.86 })),
    );

    for (const side of [-1, 1] as const) {
      const block = new BoxGeometry(scale * 0.15, scale * 0.09, scale * 0.15);
      block.translate(side * w * 0.42, y + scale * 0.1, 0);
      group.add(meshOf(block, surface(DANCHEONG.hobun, { roughness: 0.9 }), false, false));
    }
  }
  return group;
}

/** Tiny helper the temple and palace share for their stepped stone stairs. */
export function buildStairs(
  width: number,
  steps: number,
  rise: number,
  run: number,
  rng: Rng,
): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  for (let i = 0; i < steps; i++) {
    const geo = applyVertexTint(new BoxGeometry(width, rise, run * (steps - i)), rng, 0.05);
    geo.translate(0, rise * (i + 0.5), (run * (steps - i)) / 2);
    out.push(geo);
  }
  return out;
}
