import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Object3D,
  PointLight,
  SphereGeometry,
  Vector3,
} from 'three';
import { applyVertexTint, meshOf, surface } from './materials';
import { clamp, easeOutBack, smoothstep } from '../core/timeline';
import type { Rng } from '../core/rng';

/**
 * The lotus.
 *
 * Sim Cheong is returned to the world inside one: the Dragon King sends her up
 * from the sea bed sealed in a lotus bud, which the fishermen find floating and
 * carry to the palace, where it opens and she steps out. So the flower has to do
 * something no static model can — it has to open, convincingly, on cue.
 *
 * Each petal is a parametric surface with three independent controls: how far
 * it has unfurled, how much it cups, and how much it curls back at the tip.
 * Opening the flower drives all three at once, with the outer rings leading the
 * inner ones, which is how a real lotus opens and is the difference between
 * "petals rotating" and "a flower blooming".
 */

export interface LotusSpec {
  readonly rings?: number;
  readonly petalsPerRing?: number;
  readonly radius?: number;
  readonly petalColor?: number;
  readonly tipColor?: number;
  /** Adds a light inside — used when she is glowing within the closed bud. */
  readonly innerLight?: boolean;
}

export interface LotusRig {
  readonly group: Group;
  /** The flower head only, so acts can lift it clear of its stem. */
  readonly head: Group;
  /** Interior anchor: where a figure sits inside the bud. */
  readonly heart: Object3D;
  readonly light: PointLight | null;
  /** 0 is a sealed bud, 1 is fully open and reflexed. */
  setOpen(amount: number): void;
}

/**
 * One petal, as a parametric patch.
 *
 * `u` runs across the width, `v` from base to tip. The silhouette is widest at
 * about 55% of the length and comes to a point — a plain ellipse reads as a
 * daisy, and this profile is what makes it a lotus.
 */
function buildPetal(
  length: number,
  width: number,
  uSegs: number,
  vSegs: number,
): BufferGeometry {
  const positions: number[] = [];

  const at = (u: number, v: number, out: Vector3): Vector3 => {
    const halfWidth = width * Math.pow(Math.sin(Math.pow(v, 0.78) * Math.PI * 0.96), 0.7);
    const x = (u * 2 - 1) * halfWidth;
    const y = v * length;
    // Cup: the petal curls inward across its width, more so near the base.
    const cup = -Math.pow(u * 2 - 1, 2) * width * 0.55 * (1 - v * 0.45);
    // Spine: a gentle lengthwise arc so the petal is not flat.
    const arc = -Math.pow(v, 1.6) * length * 0.16;
    return out.set(x, y, cup + arc);
  };

  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const d = new Vector3();

  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      at(i / uSegs, j / vSegs, a);
      at((i + 1) / uSegs, j / vSegs, b);
      at((i + 1) / uSegs, (j + 1) / vSegs, c);
      at(i / uSegs, (j + 1) / vSegs, d);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildLotus(spec: LotusSpec, rng: Rng): LotusRig {
  const rings = spec.rings ?? 4;
  const perRing = spec.petalsPerRing ?? 7;
  const radius = spec.radius ?? 1;
  const petalColor = spec.petalColor ?? 0xf2d3dd;
  const tipColor = spec.tipColor ?? 0xd9758f;

  const group = new Group();
  const head = new Group();
  group.add(head);

  const heart = new Object3D();
  heart.position.y = radius * 0.35;
  head.add(heart);

  // Petals are stored per ring so the opening can lead from the outside in.
  const pivots: Array<{ node: Group; ring: number; jitter: number }> = [];

  for (let ring = 0; ring < rings; ring++) {
    const k = ring / Math.max(1, rings - 1);
    // Outer rings are longer and broader; inner ones are short and upright.
    const len = radius * (1.55 - k * 0.72);
    const wid = radius * (0.46 - k * 0.16);

    const mat = surface(
      ring === 0 ? petalColor : ring === rings - 1 ? tipColor : petalColor,
      {
        roughness: 0.86,
        doubleSide: true,
        flat: false,
        emissive: tipColor,
        emissiveIntensity: 0.08,
      },
    );

    const count = Math.max(4, perRing - ring);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.42 + rng.spread(0.06);

      const pivot = new Group();
      pivot.position.set(
        Math.cos(a) * radius * 0.14 * (1 - k * 0.5),
        radius * (0.05 + k * 0.12),
        Math.sin(a) * radius * 0.14 * (1 - k * 0.5),
      );
      // The pivot must be oriented so its local X axis is *tangential* to the
      // flower — opening a petal is a rotation about the tangent, not about the
      // radius. With `-a` the local X pointed radially outward instead, so
      // "opening" twisted each petal sideways and the bloom never opened: the
      // flower stayed a closed lump with a head poking out of the top.
      pivot.rotation.y = -a - Math.PI / 2;

      const geo = buildPetal(len, wid, 5, 9);
      applyVertexTint(geo, rng, 0.06);
      const mesh = meshOf(geo, mat, true, false);
      pivot.add(mesh);

      head.add(pivot);
      pivots.push({ node: pivot, ring, jitter: rng.spread(0.09) });
    }
  }

  // Yeonbap — the flat-topped seed pod at the centre, with its sunken seeds.
  const pod = new Group();
  pod.position.y = radius * 0.2;
  head.add(pod);

  const podGeo = applyVertexTint(new CylinderGeometry(radius * 0.26, radius * 0.14, radius * 0.22, 12), rng, 0.05);
  pod.add(meshOf(podGeo, surface(0xa8bb63, { roughness: 0.85 }), true, false));

  const seedMat = surface(0x6f8a3f, { roughness: 0.8 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = radius * (i % 3 === 0 ? 0.05 : 0.15);
    const seed = new SphereGeometry(radius * 0.035, 6, 5);
    seed.translate(Math.cos(a) * r, radius * 0.11, Math.sin(a) * r);
    pod.add(meshOf(seed, seedMat, false, false));
  }

  // Stamens: a fringe of fine gold filaments around the pod.
  const stamenMat = surface(0xe3c65c, { roughness: 0.6, emissive: 0xe3c65c, emissiveIntensity: 0.3 });
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rng.spread(0.1);
    const r = radius * rng.range(0.24, 0.32);
    const h = radius * rng.range(0.22, 0.34);
    const filament = new CylinderGeometry(radius * 0.007, radius * 0.011, h, 4);
    filament.translate(0, h / 2, 0);
    const mesh = meshOf(filament, stamenMat, false, false);
    mesh.position.set(Math.cos(a) * r, radius * 0.14, Math.sin(a) * r);
    mesh.rotation.z = Math.cos(a) * -0.35;
    mesh.rotation.x = Math.sin(a) * 0.35;
    pod.add(mesh);
  }

  let light: PointLight | null = null;
  if (spec.innerLight) {
    light = new PointLight(0xffe0ea, 0, radius * 14, 2);
    light.position.y = radius * 0.4;
    head.add(light);
  }

  const setOpen = (amount: number): void => {
    const a = clamp(amount, 0, 1);
    for (const { node, ring, jitter } of pivots) {
      const k = ring / Math.max(1, rings - 1);
      // Outer rings lead: ring 0 is fully open by the time the flower is 70%
      // through its bloom, the innermost only at the very end.
      const local = clamp(smoothstep(k * 0.42, 0.55 + k * 0.45, a), 0, 1);
      const eased = easeOutBack(local);

      // Positive X rotation tips a petal *inwards* in this frame, so a bud is a
      // small positive angle and a bloom is a large negative one.
      const closed = 0.1 + k * 0.16;
      const open = -1.28 + k * 0.52;
      node.rotation.x = closed + (open - closed) * eased - jitter * local;
      node.rotation.z = jitter * 0.5 * local;

      // Petals also spread outward slightly as they open.
      const spread = 1 + eased * 0.22;
      node.scale.set(spread, 1, 1);
    }

    pod.scale.setScalar(0.55 + a * 0.45);
    if (light) light.intensity = (1 - a) * 26 + a * 8;
  };

  setOpen(0);

  return { group, head, heart, light, setOpen };
}

/**
 * A lotus pad. Round, cupped, with radial veins and the characteristic notch
 * where the leaf edge folds in towards the stem.
 */
export function buildLotusPad(radius: number, rng: Rng): Group {
  const group = new Group();
  const segments = 26;
  const rings = 5;
  const positions: number[] = [];
  const p = new Vector3();

  const at = (a: number, r: number, out: Vector3): Vector3 => {
    // The notch: a wedge cut towards the centre at one angle.
    const notch = smoothstep(0.34, 0.0, Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI));
    const rr = r * (1 - notch * 0.92);
    // Cupped: the rim lifts, the centre dips.
    const y = Math.pow(rr / radius, 2.4) * radius * 0.16 - radius * 0.03;
    const ripple = Math.cos(a * 11) * radius * 0.012 * (rr / radius);
    return out.set(Math.cos(a) * rr, y + ripple, Math.sin(a) * rr);
  };

  const a0 = new Vector3();
  const b0 = new Vector3();
  const c0 = new Vector3();
  const d0 = new Vector3();

  for (let i = 0; i < segments; i++) {
    const angA = (i / segments) * Math.PI * 2;
    const angB = ((i + 1) / segments) * Math.PI * 2;
    for (let j = 0; j < rings; j++) {
      const rA = (j / rings) * radius;
      const rB = ((j + 1) / rings) * radius;
      at(angA, rA, a0);
      at(angB, rA, b0);
      at(angB, rB, c0);
      at(angA, rB, d0);
      positions.push(a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, c0.x, c0.y, c0.z);
      positions.push(a0.x, a0.y, a0.z, c0.x, c0.y, c0.z, d0.x, d0.y, d0.z);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  applyVertexTint(geo, rng, 0.07);

  group.add(
    meshOf(geo, surface(0x5d8a49, { roughness: 0.88, doubleSide: true, flat: false }), false, true),
  );

  // Radial veins, raised just above the surface.
  const veinMat = surface(0x486e39, { roughness: 0.9 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const vein = new CylinderGeometry(radius * 0.006, radius * 0.011, radius * 0.95, 4);
    vein.rotateZ(Math.PI / 2);
    vein.translate(radius * 0.47, 0, 0);
    const mesh = meshOf(vein, veinMat, false, false);
    mesh.rotation.y = -a;
    at(a, radius * 0.5, p);
    mesh.position.y = p.y + radius * 0.012;
    group.add(mesh);
  }

  return group;
}

/**
 * A stand of lotus: pads, buds and open flowers on their stems. Used to dress
 * the palace pond in Act 8 and the shallows in Act 7.
 */
export function buildLotusBed(count: number, radius: number, rng: Rng): Group {
  const group = new Group();
  const stemMat = surface(0x6d8a45, { roughness: 0.9 });

  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * radius;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (rng.chance(0.62)) {
      const pad = buildLotusPad(rng.range(0.5, 1.1), rng);
      pad.position.set(x, rng.range(-0.02, 0.06), z);
      pad.rotation.y = rng.range(0, Math.PI * 2);
      group.add(pad);
    } else {
      const h = rng.range(0.7, 1.6);
      const stem = new CylinderGeometry(0.022, 0.03, h, 5);
      stem.translate(0, h / 2, 0);
      const stemMesh = meshOf(stem, stemMat, false, false);
      stemMesh.position.set(x, 0, z);
      stemMesh.rotation.z = rng.spread(0.12);
      group.add(stemMesh);

      const flower = buildLotus(
        { radius: rng.range(0.28, 0.46), rings: 3, petalsPerRing: 6 },
        rng,
      );
      flower.group.position.set(x, h, z);
      flower.setOpen(rng.chance(0.5) ? rng.range(0.75, 1) : rng.range(0, 0.12));
      group.add(flower.group);
    }
  }

  return group;
}
