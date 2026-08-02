import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { applyVertexTint, hanji, meshOf, surface } from './materials';
import { CLOTH, DANCHEONG, NATURE, OBANG, vary } from '../core/palette';
import { DEFAULT_ROOF, hipRoof, type RoofSpec } from './roof';
import type { Rng } from '../core/rng';

/**
 * Props.
 *
 * Objects do most of the storytelling in a film with no dialogue. A begging
 * gourd says "they are destitute" faster than any staging; three hundred sacks
 * of rice on a deck say what she was worth. These are the things characters
 * carry, kneel in front of, and are buried under.
 */

/**
 * The sangyeo — a Korean funeral bier.
 *
 * It is not sombre. A sangyeo is a small, brilliantly painted palace on poles,
 * hung with paper flowers and crowned with carved phoenixes, carried at
 * shoulder height by a dozen men chanting. The contrast between its gaiety and
 * the occasion is the whole point, and it makes Act 1 far more striking than a
 * plain coffin would.
 */
export function buildBier(rng: Rng, scale = 1): { group: Group; poles: Group } {
  const group = new Group();
  const poles = new Group();
  group.add(poles);

  const bodyMat = surface(DANCHEONG.jangdan, { roughness: 0.85 });
  const trimMat = surface(DANCHEONG.samcheong, { roughness: 0.85 });
  const goldMat = surface(0xd8ad4a, { roughness: 0.35, metalness: 0.55, flat: false });

  const W = 1.5 * scale;
  const D = 2.9 * scale;
  const bodyY = 1.35 * scale;

  // Carrying poles: two long beams with cross bars for the bearers.
  const poleMat = surface(NATURE.timber, { roughness: 0.92 });
  for (const side of [1, -1] as const) {
    const pole = applyVertexTint(new CylinderGeometry(0.08 * scale, 0.09 * scale, 5.6 * scale, 7), rng, 0.06);
    pole.rotateX(Math.PI / 2);
    pole.translate(side * W * 0.42, bodyY - 0.34 * scale, 0);
    poles.add(meshOf(pole, poleMat));
  }
  for (let i = 0; i < 5; i++) {
    const z = -2.1 * scale + i * 1.05 * scale;
    const bar = applyVertexTint(new CylinderGeometry(0.055 * scale, 0.055 * scale, W * 1.5, 6), rng, 0.06);
    bar.rotateZ(Math.PI / 2);
    bar.translate(0, bodyY - 0.44 * scale, z);
    poles.add(meshOf(bar, poleMat));
  }

  // The palanquin body.
  const box = applyVertexTint(new BoxGeometry(W, 0.62 * scale, D * 0.72), rng, 0.05);
  box.translate(0, bodyY, 0);
  group.add(meshOf(box, bodyMat));

  const skirtBand = new BoxGeometry(W * 1.06, 0.14 * scale, D * 0.75);
  skirtBand.translate(0, bodyY - 0.3 * scale, 0);
  group.add(meshOf(skirtBand, trimMat, false, false));

  // Corner posts and a little tiled roof — it really is a miniature building.
  for (const sx of [1, -1] as const) {
    for (const sz of [1, -1] as const) {
      const post = applyVertexTint(new CylinderGeometry(0.05 * scale, 0.055 * scale, 0.9 * scale, 6), rng, 0.05);
      post.translate(sx * W * 0.44, bodyY + 0.76 * scale, sz * D * 0.32);
      group.add(meshOf(post, trimMat));
    }
  }

  const roofSpec: RoofSpec = {
    ...DEFAULT_ROOF,
    ridgeHalf: W * 0.18,
    eaveHalfX: W * 0.78,
    eaveHalfZ: D * 0.48,
    drop: 0.42 * scale,
    angok: 0.34 * scale,
    anheorigok: 0.42,
    ribs: 10,
    ribDepth: 0.02 * scale,
    thatch: 0,
    uSegments: 22,
    vSegments: 8,
  };
  const roof = hipRoof(roofSpec, rng.int(0, 9999));
  roof.translate(0, bodyY + 1.24 * scale + roofSpec.drop, 0);
  applyVertexTint(roof, rng, 0.05);
  group.add(meshOf(roof, surface(DANCHEONG.samcheong, { roughness: 0.8, doubleSide: true })));

  // Phoenix finials at the ridge ends.
  for (const end of [1, -1] as const) {
    const bird = new Group();
    bird.position.set(0, bodyY + 1.28 * scale + roofSpec.drop, end * D * 0.3);
    const body = new SphereGeometry(0.11 * scale, 7, 6);
    body.scale(0.8, 1, 1.7);
    bird.add(meshOf(body, goldMat, false, false));
    const tail = new CylinderGeometry(0.01 * scale, 0.07 * scale, 0.5 * scale, 5);
    tail.rotateX(end * 1.1);
    tail.translate(0, 0.16 * scale, -end * 0.22 * scale);
    bird.add(meshOf(tail, goldMat, false, false));
    group.add(bird);
  }

  // Paper flowers all over the eaves — white, red and yellow rosettes.
  const flowerColors = [0xf2ece0, OBANG.jeok, OBANG.hwang];
  for (let i = 0; i < 40; i++) {
    const color = flowerColors[i % flowerColors.length] ?? 0xf2ece0;
    const mat = surface(color, { roughness: 0.95, doubleSide: true });
    const flower = new Group();
    const petals = 5;
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2;
      const petal = new SphereGeometry(0.045 * scale, 5, 4);
      petal.scale(1, 0.35, 1.5);
      petal.translate(Math.cos(a) * 0.05 * scale, 0, Math.sin(a) * 0.05 * scale);
      flower.add(meshOf(petal, mat, false, false));
    }
    const edge = rng.next();
    if (edge < 0.5) {
      flower.position.set(
        rng.spread(W * 0.8),
        bodyY + 1.2 * scale + rng.spread(0.16 * scale),
        (rng.chance(0.5) ? 1 : -1) * D * 0.46,
      );
    } else {
      flower.position.set(
        (rng.chance(0.5) ? 1 : -1) * W * 0.78,
        bodyY + 1.2 * scale + rng.spread(0.16 * scale),
        rng.spread(D * 0.44),
      );
    }
    flower.rotation.set(rng.spread(0.6), rng.range(0, Math.PI), rng.spread(0.6));
    group.add(flower);
  }

  // Hanging tassels along the lower band.
  for (let i = 0; i < 14; i++) {
    const k = i / 13;
    const tassel = new CylinderGeometry(0.012 * scale, 0.04 * scale, 0.34 * scale, 5);
    tassel.translate(0, -0.17 * scale, 0);
    const mesh = meshOf(tassel, surface(i % 2 === 0 ? OBANG.jeok : OBANG.hwang, { roughness: 0.9 }), false, false);
    const side = k < 0.5 ? 1 : -1;
    mesh.position.set(side * W * 0.52, bodyY - 0.36 * scale, ((k % 0.5) * 2 - 0.5) * D * 0.7);
    group.add(mesh);
  }

  return { group, poles };
}

/** Manjang — the tall inscribed banners carried in a funeral procession. */
export function buildFuneralBanner(color: number, rng: Rng, scale = 1): Group {
  const group = new Group();

  const pole = applyVertexTint(new CylinderGeometry(0.03 * scale, 0.04 * scale, 3.2 * scale, 6), rng, 0.06);
  pole.translate(0, 1.6 * scale, 0);
  group.add(meshOf(pole, surface(NATURE.timber, { roughness: 0.94 }), false, false));

  const cloth = new PlaneGeometry(0.42 * scale, 1.9 * scale, 3, 8);
  cloth.translate(0.21 * scale, 2.05 * scale, 0);
  applyVertexTint(cloth, rng, 0.07);
  group.add(
    meshOf(cloth, surface(color, { roughness: 0.96, doubleSide: true }), false, false),
  );

  // Ink columns, suggested rather than written.
  const inkMat = surface(0x2a2622, { roughness: 0.9 });
  for (let i = 0; i < 7; i++) {
    const glyph = new BoxGeometry(0.11 * scale, 0.11 * scale, 0.006 * scale);
    glyph.translate(0.21 * scale, 2.75 * scale - i * 0.23 * scale, 0.006 * scale);
    group.add(meshOf(glyph, inkMat, false, false));
  }

  const tip = new SphereGeometry(0.05 * scale, 6, 5);
  tip.translate(0, 3.24 * scale, 0);
  group.add(meshOf(tip, surface(OBANG.jeok, { roughness: 0.8 }), false, false));

  return group;
}

/** A grave mound — a simple turfed dome with a low stone table before it. */
export function buildGraveMound(rng: Rng, scale = 1): Group {
  const group = new Group();

  const mound = applyVertexTint(new SphereGeometry(1.5 * scale, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), rng, 0.07);
  mound.scale(1, 0.62, 1);
  group.add(meshOf(mound, surface(vary(NATURE.grassWinter, -0.02).getHex(), { roughness: 1, flat: false })));

  const table = applyVertexTint(new BoxGeometry(1.5 * scale, 0.14 * scale, 0.7 * scale), rng, 0.05);
  table.translate(0, 0.28 * scale, 1.85 * scale);
  group.add(meshOf(table, surface(NATURE.stone, { roughness: 0.96 })));

  for (const side of [1, -1] as const) {
    const leg = new BoxGeometry(0.2 * scale, 0.28 * scale, 0.2 * scale);
    leg.translate(side * 0.5 * scale, 0.14 * scale, 1.85 * scale);
    group.add(meshOf(leg, surface(NATURE.stoneDark, { roughness: 0.96 }), false, false));
  }

  const stele = applyVertexTint(new BoxGeometry(0.36 * scale, 1.0 * scale, 0.14 * scale), rng, 0.05);
  stele.translate(-1.1 * scale, 0.5 * scale, 1.5 * scale);
  group.add(meshOf(stele, surface(vary(NATURE.stone, 0.05).getHex(), { roughness: 0.95 })));

  return group;
}

/**
 * A jige — the wooden A-frame back carrier. Ubiquitous in rural Korea and
 * completely distinctive; a figure wearing one is instantly a farmer.
 */
export function buildJige(rng: Rng, scale = 1, load = true): Group {
  const group = new Group();
  const woodMat = surface(0x6a5238, { roughness: 0.95 });

  for (const side of [1, -1] as const) {
    const leg = applyVertexTint(new CylinderGeometry(0.035 * scale, 0.05 * scale, 1.25 * scale, 5), rng, 0.08);
    leg.translate(side * 0.22 * scale, 0.62 * scale, 0);
    const mesh = meshOf(leg, woodMat);
    mesh.rotation.z = side * -0.11;
    group.add(mesh);

    // The forward-projecting arms the load rests on.
    const arm = applyVertexTint(new CylinderGeometry(0.03 * scale, 0.04 * scale, 0.6 * scale, 5), rng, 0.08);
    arm.rotateX(Math.PI / 2);
    arm.translate(side * 0.24 * scale, 0.72 * scale, -0.24 * scale);
    const armMesh = meshOf(arm, woodMat, true, false);
    armMesh.rotation.x = -0.35;
    group.add(armMesh);
  }

  for (let i = 0; i < 3; i++) {
    const rung = new CylinderGeometry(0.025 * scale, 0.025 * scale, 0.55 * scale, 5);
    rung.rotateZ(Math.PI / 2);
    rung.translate(0, (0.3 + i * 0.34) * scale, 0);
    group.add(meshOf(rung, woodMat, false, false));
  }

  if (load) {
    const bundleMat = surface(0xa8935e, { roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const stick = applyVertexTint(new CylinderGeometry(0.04 * scale, 0.05 * scale, 1.3 * scale, 5), rng, 0.12);
      stick.rotateZ(Math.PI / 2);
      const mesh = meshOf(stick, bundleMat);
      mesh.position.set(rng.spread(0.06 * scale), (0.9 + (i % 3) * 0.11) * scale, (-0.35 - Math.floor(i / 3) * 0.13) * scale);
      mesh.rotation.y = rng.spread(0.14);
      group.add(mesh);
    }
  }

  return group;
}

/** A water jar, carried on the head — the reason for that upright village walk. */
export function buildWaterJar(rng: Rng, scale = 1): Group {
  const group = new Group();
  const profile: Vector2[] = [
    new Vector2(0.001, 0),
    new Vector2(0.16, 0.01),
    new Vector2(0.25, 0.1),
    new Vector2(0.29, 0.24),
    new Vector2(0.24, 0.38),
    new Vector2(0.19, 0.44),
    new Vector2(0.2, 0.47),
    new Vector2(0.18, 0.48),
  ].map((v) => new Vector2(v.x * scale, v.y * scale));

  group.add(
    meshOf(
      applyVertexTint(new LatheGeometry(profile, 13), rng, 0.06),
      surface(0x51392b, { roughness: 0.6, metalness: 0.08, flat: false, doubleSide: true }),
    ),
  );

  // The twisted cloth ring that pads the head.
  const ring = new TorusGeometry(0.13 * scale, 0.045 * scale, 6, 12);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, -0.03 * scale, 0);
  group.add(meshOf(ring, surface(CLOTH.hempWhite, { roughness: 0.96 }), false, false));

  return group;
}

/** The blind man's cane, and the begging gourd that hangs from his belt. */
export function buildCane(rng: Rng, length = 1.25): Group {
  const group = new Group();
  const stick = applyVertexTint(new CylinderGeometry(0.018, 0.028, length, 6), rng, 0.1);
  stick.translate(0, -length / 2, 0);
  const mesh = meshOf(stick, surface(0x6d5537, { roughness: 0.96 }));
  mesh.rotation.z = 0.06;
  group.add(mesh);

  const knob = new SphereGeometry(0.038, 7, 6);
  group.add(meshOf(knob, surface(0x5c4529, { roughness: 0.9 }), false, false));
  return group;
}

/** A dried-gourd begging bowl. */
export function buildGourdBowl(rng: Rng, scale = 1): Group {
  const group = new Group();
  const bowl = new SphereGeometry(0.19 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  bowl.scale(1, 0.85, 1);
  applyVertexTint(bowl, rng, 0.07);
  group.add(
    meshOf(
      bowl,
      surface(0xc7ab72, { roughness: 0.9, doubleSide: true, flat: false }),
      false,
      false,
    ),
  );
  return group;
}

/**
 * A soban — the small individual dining table Koreans ate from, one per person.
 * A banquet is not one long table; it is a hall full of these.
 */
export function buildSoban(rng: Rng, scale = 1, laden = true): Group {
  const group = new Group();
  const lacquerMat = surface(0x7d2f22, { roughness: 0.35, metalness: 0.1, flat: false });

  const top = applyVertexTint(new CylinderGeometry(0.4 * scale, 0.42 * scale, 0.05 * scale, 14), rng, 0.04);
  top.translate(0, 0.34 * scale, 0);
  group.add(meshOf(top, lacquerMat));

  const rim = new TorusGeometry(0.41 * scale, 0.022 * scale, 6, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 0.36 * scale, 0);
  group.add(meshOf(rim, surface(0x5c1f16, { roughness: 0.4, flat: false }), false, false));

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = applyVertexTint(new CylinderGeometry(0.022 * scale, 0.035 * scale, 0.34 * scale, 5), rng, 0.06);
    leg.translate(Math.cos(a) * 0.3 * scale, 0.17 * scale, Math.sin(a) * 0.3 * scale);
    const mesh = meshOf(leg, lacquerMat, true, false);
    mesh.rotation.z = -Math.cos(a) * 0.12;
    mesh.rotation.x = Math.sin(a) * 0.12;
    group.add(mesh);
  }

  if (laden) {
    const bowlColors = [0xe8e2d2, 0xd8cfba, 0xf0ece0];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const r = i === 0 ? 0 : 0.22 * scale;
      const bowl = new CylinderGeometry(0.07 * scale, 0.055 * scale, 0.06 * scale, 10);
      bowl.translate(Math.cos(a) * r, 0.395 * scale, Math.sin(a) * r);
      group.add(meshOf(bowl, surface(bowlColors[i % 3] ?? 0xe8e2d2, { roughness: 0.5, flat: false }), false, false));

      const food = new SphereGeometry(0.05 * scale, 7, 5);
      food.scale(1, 0.5, 1);
      food.translate(Math.cos(a) * r, 0.425 * scale, Math.sin(a) * r);
      group.add(
        meshOf(
          food,
          surface(i % 2 === 0 ? 0xf2ede0 : 0xb8632f, { roughness: 0.75, flat: false }),
          false,
          false,
        ),
      );
    }
  }

  return group;
}

/**
 * A byeongpung — the folding screen that stands behind anyone important.
 * Painted here with the sun-moon-and-five-peaks motif reserved for the throne.
 */
export function buildFoldingScreen(
  panels: number,
  height: number,
  rng: Rng,
  royal = false,
): Group {
  const group = new Group();
  const frameMat = surface(0x3a2a1e, { roughness: 0.8 });
  const silkMat = surface(royal ? 0x1c3a5e : 0xe2d8c2, { roughness: 0.92, doubleSide: true });

  const panelW = 1.05;
  const totalW = panels * panelW;

  for (let i = 0; i < panels; i++) {
    const node = new Group();
    // Zig-zag the panels so the screen actually stands up.
    const fold = (i % 2 === 0 ? 1 : -1) * 0.22;
    node.position.set(-totalW / 2 + (i + 0.5) * panelW * 0.97, 0, Math.abs(fold) * 0.4 * (i % 2 === 0 ? 1 : -1));
    node.rotation.y = fold;

    const silk = applyVertexTint(new BoxGeometry(panelW - 0.06, height, 0.03), rng, 0.03);
    silk.translate(0, height / 2, 0);
    node.add(meshOf(silk, silkMat));

    const border = new BoxGeometry(panelW, height + 0.08, 0.05);
    border.translate(0, height / 2, -0.015);
    node.add(meshOf(border, frameMat, false, false));

    if (royal) {
      // Irworobongdo: red sun on the left, white moon on the right, five peaks,
      // two waterfalls, and a pair of pines. Only the king may sit before it.
      const peaks = 5;
      for (let p = 0; p < peaks; p++) {
        const px = (p / (peaks - 1) - 0.5) * (panelW - 0.2);
        const ph = height * (0.2 + Math.sin((p / (peaks - 1)) * Math.PI) * 0.16);
        const peak = new CylinderGeometry(0.001, 0.15, ph, 3);
        peak.translate(px, height * 0.3 + ph / 2, 0.02);
        node.add(meshOf(peak, surface(0x2f6b5e, { roughness: 0.9 }), false, false));
      }
      if (i === Math.floor(panels / 2)) {
        const sun = new CylinderGeometry(0.11, 0.11, 0.01, 14);
        sun.rotateX(Math.PI / 2);
        sun.translate(-0.28, height * 0.78, 0.03);
        node.add(meshOf(sun, surface(0xc8402f, { roughness: 0.7 }), false, false));

        const moon = new CylinderGeometry(0.09, 0.09, 0.01, 14);
        moon.rotateX(Math.PI / 2);
        moon.translate(0.28, height * 0.78, 0.03);
        node.add(meshOf(moon, surface(0xf0ece0, { roughness: 0.7 }), false, false));
      }
      const water = new BoxGeometry(0.05, height * 0.22, 0.01);
      water.translate(rng.spread(0.3), height * 0.32, 0.03);
      node.add(meshOf(water, surface(0xdfe8ec, { roughness: 0.6 }), false, false));
    } else {
      // A plainer screen: ink brushwork suggested by a few strokes.
      const inkMat = surface(0x2f2b26, { roughness: 0.9 });
      for (let s = 0; s < 4; s++) {
        const stroke = new BoxGeometry(rng.range(0.05, 0.3), rng.range(0.03, 0.5), 0.008);
        stroke.translate(rng.spread(panelW * 0.3), height * rng.range(0.2, 0.8), 0.022);
        node.add(meshOf(stroke, inkMat, false, false));
      }
    }

    group.add(node);
  }

  return group;
}

/** The throne itself, for Act 8. */
export function buildThrone(rng: Rng): Group {
  const group = new Group();
  const lacquer = surface(0x8c2318, { roughness: 0.3, metalness: 0.12, flat: false });
  const gold = surface(0xd8ad4a, { roughness: 0.28, metalness: 0.7, flat: false });

  const dais = applyVertexTint(new BoxGeometry(3.4, 0.36, 2.8), rng, 0.04);
  dais.translate(0, 0.18, 0);
  group.add(meshOf(dais, surface(0x6d2a1c, { roughness: 0.5, flat: false })));

  const seat = applyVertexTint(new BoxGeometry(1.5, 0.16, 1.2), rng, 0.03);
  seat.translate(0, 0.72, 0);
  group.add(meshOf(seat, lacquer));

  const back = applyVertexTint(new BoxGeometry(1.5, 1.5, 0.14), rng, 0.03);
  back.translate(0, 1.5, -0.55);
  group.add(meshOf(back, lacquer));

  for (const sx of [1, -1] as const) {
    const leg = new BoxGeometry(0.16, 0.6, 0.16);
    leg.translate(sx * 0.6, 0.34, 0.45);
    group.add(meshOf(leg, lacquer, true, false));
    const legB = new BoxGeometry(0.16, 0.6, 0.16);
    legB.translate(sx * 0.6, 0.34, -0.45);
    group.add(meshOf(legB, lacquer, true, false));

    const arm = new BoxGeometry(0.14, 0.12, 1.1);
    arm.translate(sx * 0.68, 1.02, -0.05);
    group.add(meshOf(arm, gold, true, false));

    const finial = new SphereGeometry(0.11, 8, 7);
    finial.translate(sx * 0.68, 1.12, 0.5);
    group.add(meshOf(finial, gold, false, false));
  }

  // Dragon medallion on the backrest.
  const medallion = new TorusGeometry(0.4, 0.06, 8, 20);
  medallion.translate(0, 1.6, -0.46);
  group.add(meshOf(medallion, gold, false, false));
  const inner = new CylinderGeometry(0.34, 0.34, 0.03, 16);
  inner.rotateX(Math.PI / 2);
  inner.translate(0, 1.6, -0.47);
  group.add(meshOf(inner, surface(0x1e2c4a, { roughness: 0.5, flat: false }), false, false));

  return group;
}

/** Straw mats, for kneeling on and for stacking cargo. */
export function buildStrawMat(width: number, depth: number, rng: Rng): Group {
  const group = new Group();
  const mat = surface(0xbfa872, { roughness: 1 });
  const strands = Math.round(depth * 8);
  for (let i = 0; i < strands; i++) {
    const strip = applyVertexTint(new BoxGeometry(width, 0.018, depth / strands - 0.004), rng, 0.09);
    strip.translate(0, 0.01, -depth / 2 + (i + 0.5) * (depth / strands));
    group.add(meshOf(strip, mat, false, true));
  }
  const border = surface(0x2f2a22, { roughness: 0.95 });
  for (const side of [1, -1] as const) {
    const edge = new BoxGeometry(width, 0.026, 0.05);
    edge.translate(0, 0.012, side * depth * 0.5);
    group.add(meshOf(edge, border, false, false));
  }
  return group;
}

/** A stack of rice sacks — the price of Sim Cheong. */
export function buildRiceStack(count: number, rng: Rng): Group {
  const group = new Group();
  const sackMat = surface(0xc4b389, { roughness: 0.99 });
  const ropeMat = surface(0x8a7448, { roughness: 1 });

  const perRow = 4;
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / (perRow * 2));
    const idx = i % (perRow * 2);
    const row = Math.floor(idx / perRow);
    const col = idx % perRow;

    const sack = applyVertexTint(new BoxGeometry(0.78, 0.44, 0.54), rng, 0.09);
    const mesh = meshOf(sack, sackMat);
    mesh.position.set(
      (col - (perRow - 1) / 2) * 0.86 + rng.spread(0.04),
      0.22 + layer * 0.44,
      (row - 0.5) * 0.62 + rng.spread(0.04),
    );
    mesh.rotation.y = rng.spread(0.1) + (layer % 2 === 0 ? 0 : Math.PI / 2) * 0.06;
    group.add(mesh);

    const tie = new CylinderGeometry(0.012, 0.012, 0.58, 4);
    tie.rotateX(Math.PI / 2);
    const tieMesh = meshOf(tie, ropeMat, false, false);
    tieMesh.position.copy(mesh.position);
    tieMesh.position.y += 0.23;
    group.add(tieMesh);
  }
  return group;
}

/**
 * A paper lantern on a pole, carried by hand. Used in the night scenes and by
 * the crowd at the feast.
 */
export function buildHandLantern(color: number, rng: Rng, scale = 1): Group {
  const group = new Group();

  const pole = new CylinderGeometry(0.02 * scale, 0.025 * scale, 1.6 * scale, 6);
  pole.translate(0, 0.8 * scale, 0);
  group.add(meshOf(pole, surface(NATURE.timber, { roughness: 0.94 }), false, false));

  const arm = new CylinderGeometry(0.015 * scale, 0.015 * scale, 0.4 * scale, 5);
  arm.rotateZ(Math.PI / 2);
  arm.translate(0.2 * scale, 1.58 * scale, 0);
  group.add(meshOf(arm, surface(NATURE.timber, { roughness: 0.94 }), false, false));

  const shell = applyVertexTint(new CylinderGeometry(0.16 * scale, 0.16 * scale, 0.34 * scale, 10, 1, true), rng, 0.03);
  shell.translate(0.4 * scale, 1.32 * scale, 0);
  group.add(meshOf(shell, hanji(color, 1.4, 0.9), false, false));

  for (const y of [1.49, 1.15]) {
    const hoop = new TorusGeometry(0.165 * scale, 0.012 * scale, 5, 12);
    hoop.rotateX(Math.PI / 2);
    hoop.translate(0.4 * scale, y * scale, 0);
    group.add(meshOf(hoop, surface(0x3a2a1e, { roughness: 0.9 }), false, false));
  }

  return group;
}

/** Where a prop should sit relative to a figure's hand, for a given height. */
export function handAnchor(figureHeight: number): Vector3 {
  return new Vector3(figureHeight * 0.13, figureHeight * 0.44, figureHeight * 0.05);
}
