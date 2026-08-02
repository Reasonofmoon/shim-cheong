import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { applyVertexTint, meshOf, surface } from './materials';
import { NATURE, vary } from '../core/palette';
import { fbm1, type Rng } from '../core/rng';

/**
 * Landscape.
 *
 * Korean scenery in this film leans on two things: the red pine, whose trunk
 * leans and kinks rather than growing straight, and the receding ridgelines of
 * ink-wash painting, where each further range is paler and flatter until it
 * dissolves into the paper. The second is done here with flat billboard
 * silhouettes rather than real geometry — it is how the painters did it, it
 * costs almost nothing, and it produces far more depth than a modelled mountain
 * at the same triangle budget.
 */

/** Signature for the height function a terrain patch is generated from. */
export type HeightFn = (x: number, z: number) => number;

export interface TerrainSpec {
  readonly size: number;
  readonly segments: number;
  readonly height: HeightFn;
  /** Base colour; per-vertex variation is layered on top. */
  readonly color: number;
  /** Optional second colour blended in by height. */
  readonly highColor?: number;
  readonly highStart?: number;
  readonly highEnd?: number;
  readonly tint?: number;
}

/**
 * A displaced grid. Colour is baked per vertex from the height function so that
 * a rice paddy can go green in the valley and dry gold on the ridges without a
 * texture or a second material.
 */
export function buildTerrain(spec: TerrainSpec, rng: Rng): Mesh {
  const geo = new PlaneGeometry(spec.size, spec.size, spec.segments, spec.segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const base = new Color(spec.color);
  const high = new Color(spec.highColor ?? spec.color);
  const c = new Color();
  const tint = spec.tint ?? 0.06;
  const highStart = spec.highStart ?? 0;
  const highEnd = spec.highEnd ?? 1;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = spec.height(x, z);
    pos.setY(i, y);

    const k =
      highEnd === highStart
        ? 0
        : Math.min(1, Math.max(0, (y - highStart) / (highEnd - highStart)));
    c.copy(base).lerp(high, k);
    const jitter = 1 + (fbm1(x * 0.7 + z * 1.31, 17) + rng.spread(0.4)) * tint;
    c.multiplyScalar(jitter);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  pos.needsUpdate = true;
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = meshOf(geo, surface(0xffffff, { roughness: 1, flat: false }), false, true);
  mesh.name = 'terrain';
  return mesh;
}

/** Rolling ground with a few octaves of value noise. The default landscape. */
export function rollingHills(amplitude: number, scale: number, seed: number): HeightFn {
  return (x, z) =>
    (fbm1(x * scale + z * scale * 0.37, seed) * 0.6 +
      fbm1(z * scale * 1.7 - x * scale * 0.21, seed + 31) * 0.4) *
    amplitude;
}

/** Combine height functions additively. */
export function addHeights(...fns: readonly HeightFn[]): HeightFn {
  return (x, z) => {
    let sum = 0;
    for (const fn of fns) sum += fn(x, z);
    return sum;
  };
}

/**
 * The Korean red pine. The trunk leans, kinks once or twice, and the canopy is
 * a set of flattened, layered cushions rather than a cone — that layering is the
 * whole reason a pine reads as a pine in silhouette.
 */
export function buildPine(rng: Rng, scale = 1): Group {
  const group = new Group();
  const barkMat = surface(vary(NATURE.pineBark, rng.spread(0.05)).getHex(), { roughness: 0.98 });
  const needleMat = surface(vary(NATURE.pineNeedle, rng.spread(0.06)).getHex(), { roughness: 0.95 });

  const height = scale * rng.range(4.2, 6.4);
  const segments = rng.int(3, 5);
  const lean = rng.spread(0.28);

  let y = 0;
  let x = 0;
  let z = 0;
  let angle = lean;
  const canopyAnchors: Vector3[] = [];

  for (let i = 0; i < segments; i++) {
    const segH = (height / segments) * rng.range(0.8, 1.2);
    const r0 = scale * (0.20 - i * 0.032);
    const r1 = scale * (0.20 - (i + 1) * 0.032);

    const trunk = applyVertexTint(
      new CylinderGeometry(Math.max(0.03, r1), Math.max(0.04, r0), segH, 7),
      rng,
      0.09,
    );
    const mesh = meshOf(trunk, barkMat);
    const dx = Math.sin(angle) * segH * 0.5;
    const dz = Math.cos(angle * 1.7) * segH * 0.18;
    mesh.position.set(x + dx, y + segH / 2, z + dz);
    mesh.rotation.z = -angle;
    mesh.rotation.x = angle * 0.4;
    group.add(mesh);

    x += dx * 2;
    y += segH * Math.cos(angle);
    z += dz * 2;
    angle += rng.spread(0.34);

    if (i >= 1) canopyAnchors.push(new Vector3(x, y, z));
  }

  // Canopy: flattened ellipsoids stacked with a slight downward droop.
  for (let i = 0; i < canopyAnchors.length; i++) {
    const anchor = canopyAnchors[i] ?? new Vector3(0, height, 0);
    const k = i / Math.max(1, canopyAnchors.length - 1);
    const pads = rng.int(2, 3);
    for (let p = 0; p < pads; p++) {
      const r = scale * rng.range(0.85, 1.5) * (1.05 - k * 0.3);
      const pad = applyVertexTint(new IcosahedronGeometry(r, 1), rng, 0.1);
      pad.scale(1, rng.range(0.32, 0.46), 1);
      const mesh = meshOf(pad, needleMat);
      mesh.position.set(
        anchor.x + rng.spread(scale * 0.7),
        anchor.y + rng.range(-0.1, 0.5) * scale,
        anchor.z + rng.spread(scale * 0.7),
      );
      mesh.rotation.set(rng.spread(0.15), rng.range(0, Math.PI), rng.spread(0.15));
      group.add(mesh);
    }
  }

  return group;
}

/**
 * A willow. Drooping strands are the point; they get their own node so wind can
 * be applied to them per frame.
 */
export function buildWillow(rng: Rng, scale = 1): { group: Group; fronds: Group } {
  const group = new Group();
  const trunkMat = surface(0x5a4732, { roughness: 0.96 });
  const leafMat = surface(vary(NATURE.willowLeaf, rng.spread(0.05)).getHex(), {
    roughness: 0.94,
    doubleSide: true,
  });

  const height = scale * rng.range(3.6, 5.0);
  const trunk = applyVertexTint(new CylinderGeometry(scale * 0.13, scale * 0.26, height, 8), rng, 0.09);
  trunk.translate(0, height / 2, 0);
  const trunkMesh = meshOf(trunk, trunkMat);
  trunkMesh.rotation.z = rng.spread(0.1);
  group.add(trunkMesh);

  const fronds = new Group();
  fronds.position.y = height * 0.92;
  group.add(fronds);

  const strandCount = rng.int(26, 38);
  for (let i = 0; i < strandCount; i++) {
    const a = (i / strandCount) * Math.PI * 2 + rng.spread(0.2);
    const reach = scale * rng.range(1.1, 2.3);
    const drop = scale * rng.range(1.6, 3.0);

    // Each strand is a narrow tapering ribbon, curved by moving each segment
    // further out and further down. Six segments is enough for the read.
    const segs = 6;
    const points: number[] = [];
    const width = scale * 0.075;
    for (let s = 0; s <= segs; s++) {
      const k = s / segs;
      const px = Math.cos(a) * reach * Math.sqrt(k);
      const pz = Math.sin(a) * reach * Math.sqrt(k);
      const py = -drop * k * k;
      const w = width * (1 - k * 0.7);
      points.push(px - Math.sin(a) * w, py, pz + Math.cos(a) * w);
      points.push(px + Math.sin(a) * w, py, pz - Math.cos(a) * w);
    }

    const positions: number[] = [];
    for (let s = 0; s < segs; s++) {
      const i0 = s * 6;
      const i1 = i0 + 3;
      const i2 = i0 + 6;
      const i3 = i0 + 9;
      const push = (base: number): void => {
        positions.push(points[base] ?? 0, points[base + 1] ?? 0, points[base + 2] ?? 0);
      };
      push(i0); push(i1); push(i2);
      push(i1); push(i3); push(i2);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geo.computeVertexNormals();
    applyVertexTint(geo, rng, 0.12);

    const strand = new Mesh(geo, leafMat);
    strand.castShadow = false;
    strand.receiveShadow = false;
    fronds.add(strand);
  }

  return { group, fronds };
}

/** A bamboo clump. Straight, segmented, and always in groups. */
export function buildBamboo(rng: Rng, culms = 9, scale = 1): Group {
  const group = new Group();
  const culmMat = surface(0x7d9448, { roughness: 0.8 });
  const nodeMat = surface(0x63783a, { roughness: 0.85 });
  const leafMat = surface(0x5f7f3c, { roughness: 0.9, doubleSide: true });

  for (let i = 0; i < culms; i++) {
    const h = scale * rng.range(3.2, 5.6);
    const r = scale * rng.range(0.035, 0.06);
    const x = rng.gaussian(0, scale * 0.55);
    const z = rng.gaussian(0, scale * 0.55);
    const lean = rng.spread(0.07);

    const stalk = applyVertexTint(new CylinderGeometry(r * 0.7, r, h, 6), rng, 0.07);
    stalk.translate(0, h / 2, 0);
    const mesh = meshOf(stalk, culmMat);
    mesh.position.set(x, 0, z);
    mesh.rotation.z = lean;
    group.add(mesh);

    const nodes = Math.floor(h / (scale * 0.55));
    for (let n = 1; n < nodes; n++) {
      const ny = (n / nodes) * h;
      const ring = new CylinderGeometry(r * 1.15, r * 1.15, scale * 0.035, 6);
      ring.translate(0, ny, 0);
      const ringMesh = meshOf(ring, nodeMat, false, false);
      ringMesh.position.set(x, 0, z);
      ringMesh.rotation.z = lean;
      group.add(ringMesh);
    }

    // Leaves only in the top third, which is where bamboo actually carries them.
    const leaves = rng.int(5, 9);
    for (let l = 0; l < leaves; l++) {
      const ly = h * rng.range(0.62, 1.0);
      const a = rng.range(0, Math.PI * 2);
      const len = scale * rng.range(0.4, 0.8);
      const leaf = new PlaneGeometry(scale * 0.07, len);
      leaf.translate(0, -len / 2, 0);
      applyVertexTint(leaf, rng, 0.12);
      const leafMesh = new Mesh(leaf, leafMat);
      leafMesh.position.set(x + Math.cos(a) * r * 2, ly, z + Math.sin(a) * r * 2);
      leafMesh.rotation.set(rng.range(0.5, 1.3), a, rng.spread(0.5));
      leafMesh.castShadow = false;
      group.add(leafMesh);
    }
  }
  return group;
}

/**
 * A persimmon tree. In Korean visual shorthand a bare tree hung with orange
 * fruit means late autumn and, by extension, hardship coming — which is exactly
 * the register Act 1 needs.
 */
export function buildPersimmon(rng: Rng, scale = 1, fruit = true): Group {
  const group = new Group();
  const barkMat = surface(0x4e3b2c, { roughness: 0.97 });
  const fruitMat = surface(0xd9702a, { roughness: 0.55, flat: false });

  const trunkH = scale * rng.range(1.6, 2.2);
  const trunk = applyVertexTint(new CylinderGeometry(scale * 0.15, scale * 0.24, trunkH, 8), rng, 0.09);
  trunk.translate(0, trunkH / 2, 0);
  group.add(meshOf(trunk, barkMat));

  const branchTips: Vector3[] = [];
  const primaries = rng.int(4, 6);
  for (let i = 0; i < primaries; i++) {
    const a = (i / primaries) * Math.PI * 2 + rng.spread(0.4);
    const pitch = rng.range(0.5, 0.95);
    let origin = new Vector3(0, trunkH, 0);
    let dir = new Vector3(Math.cos(a) * Math.cos(pitch), Math.sin(pitch), Math.sin(a) * Math.cos(pitch));

    for (let level = 0; level < 3; level++) {
      const len = scale * rng.range(0.7, 1.3) * (1 - level * 0.24);
      const r = scale * (0.09 - level * 0.025);
      const end = origin.clone().addScaledVector(dir, len);

      const branch = applyVertexTint(new CylinderGeometry(Math.max(0.015, r * 0.7), r, len, 5), rng, 0.1);
      const mesh = meshOf(branch, barkMat, level === 0, false);
      mesh.position.copy(origin).addScaledVector(dir, len / 2);
      mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
      group.add(mesh);

      if (level === 2) branchTips.push(end.clone());
      origin = end;
      dir = dir
        .clone()
        .add(new Vector3(rng.spread(0.5), rng.range(-0.1, 0.3), rng.spread(0.5)))
        .normalize();
    }
  }

  if (fruit) {
    for (const tip of branchTips) {
      if (!rng.chance(0.75)) continue;
      const count = rng.int(2, 4);
      for (let f = 0; f < count; f++) {
        // Sized up after the first render: at the distances Act I shoots from,
        // a botanically correct persimmon is three pixels and simply is not
        // there. The fruit has to be legible or the tree says nothing.
        const berry = new SphereGeometry(scale * rng.range(0.15, 0.21), 7, 6);
        berry.scale(1, 0.85, 1);
        const mesh = meshOf(berry, fruitMat, false, false);
        mesh.position.set(
          tip.x + rng.spread(scale * 0.28),
          tip.y - rng.range(0.05, 0.3) * scale,
          tip.z + rng.spread(scale * 0.28),
        );
        group.add(mesh);
      }
    }
  }

  return group;
}

/** Reeds along a shoreline. Instanced, because a marsh needs hundreds. */
export function buildReeds(count: number, radius: number, rng: Rng, scale = 1): InstancedMesh {
  const blade = new BufferGeometry();
  const h = scale;
  const w = scale * 0.035;
  const positions = new Float32Array([
    -w, 0, 0, w, 0, 0, w * 0.25, h * 0.6, 0,
    -w, 0, 0, w * 0.25, h * 0.6, 0, -w * 0.35, h * 0.6, 0,
    -w * 0.35, h * 0.6, 0, w * 0.25, h * 0.6, 0, 0, h, w * 0.12,
  ]);
  blade.setAttribute('position', new BufferAttribute(positions, 3));
  blade.computeVertexNormals();

  const mesh = new InstancedMesh(
    blade,
    surface(0xa39657, { roughness: 0.95, doubleSide: true, vertexColors: false }),
    count,
  );
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const dummy = new Object3D();
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * radius;
    dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    dummy.rotation.set(rng.spread(0.18), rng.range(0, Math.PI * 2), rng.spread(0.18));
    dummy.scale.setScalar(rng.range(0.7, 1.5));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** Scattered boulders. */
export function buildRocks(count: number, radius: number, rng: Rng, scale = 1): Group {
  const group = new Group();
  const mats = [
    surface(NATURE.stone, { roughness: 0.97 }),
    surface(NATURE.stoneDark, { roughness: 0.97 }),
    surface(vary(NATURE.stone, -0.08, -0.02).getHex(), { roughness: 0.97 }),
  ];

  for (let i = 0; i < count; i++) {
    const s = scale * rng.range(0.3, 1.3);
    const geo = applyVertexTint(new IcosahedronGeometry(s, rng.chance(0.4) ? 1 : 0), rng, 0.12);
    geo.scale(rng.range(0.8, 1.5), rng.range(0.45, 0.9), rng.range(0.8, 1.5));
    const mesh = meshOf(geo, mats[i % mats.length] ?? mats[0]!);
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * radius;
    mesh.position.set(Math.cos(a) * r, -s * 0.18, Math.sin(a) * r);
    mesh.rotation.set(rng.spread(0.4), rng.range(0, Math.PI * 2), rng.spread(0.4));
    group.add(mesh);
  }
  return group;
}

/**
 * Receding mountain ridges, the way an ink painter would lay them in: flat
 * cut-out silhouettes, each further range paler and lower-contrast, with the
 * fog doing the rest. Vastly more atmospheric per triangle than real terrain.
 */
export function buildRidgelines(
  layers: number,
  spread: number,
  rng: Rng,
  near: number,
  far: number,
): Group {
  const group = new Group();
  group.name = 'ridgelines';
  const nearColor = new Color(near);
  const farColor = new Color(far);

  for (let l = 0; l < layers; l++) {
    const k = l / Math.max(1, layers - 1);
    // These must sit well beyond the terrain patch (half-size ~170) or the
    // "distant" range ends up 130 units from camera, towering over the frame.
    // Learned the hard way: the nearest layer filled the top-right quadrant.
    const distance = 240 + k * 540;
    const width = spread * (2.4 + k * 2.6);
    // Height is tuned so the nearest ridge subtends roughly 6° from a camera at
    // eye height — a horizon feature, not a wall.
    const baseHeight = 26 + k * 78;
    const points = Math.round(52 + k * 30);

    const positions: number[] = [];
    const seed = rng.int(0, 99999);
    const heightAt = (t: number): number => {
      const x = t * (5 + k * 3);
      return (
        baseHeight *
        (0.42 +
          fbm1(x, seed) * 0.34 +
          fbm1(x * 2.7 + 9, seed + 5) * 0.18 +
          fbm1(x * 6.1 + 21, seed + 11) * 0.08)
      );
    };

    for (let i = 0; i < points; i++) {
      const t0 = i / points;
      const t1 = (i + 1) / points;
      const x0 = (t0 - 0.5) * width;
      const x1 = (t1 - 0.5) * width;
      const y0 = heightAt(t0);
      const y1 = heightAt(t1);
      // A modest skirt below the ground plane. It must not be deep: the world
      // floor hides it, but a very deep skirt reappears the moment a shot looks
      // down from height.
      positions.push(x0, -6, 0, x1, -6, 0, x1, y1, 0);
      positions.push(x0, -6, 0, x1, y1, 0, x0, y0, 0);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));

    const color = nearColor.clone().lerp(farColor, Math.pow(k, 0.7));
    const mesh = new Mesh(
      geo,
      new MeshBasicMaterial({ color, side: DoubleSide, fog: true, depthWrite: true }),
    );
    mesh.position.z = -distance;
    mesh.renderOrder = -500 + l;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

/**
 * Falling particles — snow in Act 1, ash and spray elsewhere. One instanced mesh
 * with the animation done on the CPU, because at a few hundred particles the
 * matrix upload is cheaper than a custom shader and far easier to art-direct.
 */
export class Particles {
  readonly mesh: InstancedMesh;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly spins: Float32Array;
  private readonly count: number;
  private readonly bounds: Vector3;
  private readonly dummy = new Object3D();
  private readonly quat = new Quaternion();
  private readonly matrix = new Matrix4();

  constructor(
    count: number,
    bounds: Vector3,
    size: number,
    color: number,
    rng: Rng,
    opacity = 1,
  ) {
    const geo = new PlaneGeometry(size, size);
    const mat = new MeshBasicMaterial({
      color,
      side: DoubleSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      fog: true,
    });
    this.mesh = new InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.count = count;
    this.bounds = bounds;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.spins = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = rng.spread(bounds.x);
      this.positions[i * 3 + 1] = rng.range(0, bounds.y);
      this.positions[i * 3 + 2] = rng.spread(bounds.z);
      this.velocities[i * 3] = rng.spread(0.35);
      this.velocities[i * 3 + 1] = -rng.range(0.5, 1.6);
      this.velocities[i * 3 + 2] = rng.spread(0.35);
      this.spins[i * 2] = rng.range(0, Math.PI * 2);
      this.spins[i * 2 + 1] = rng.spread(2.2);
    }
    this.sync(0);
  }

  /** `wind` shifts the whole field sideways — the storm act cranks this hard. */
  update(dt: number, t: number, wind = 0): void {
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.positions[i3] =
        (this.positions[i3] ?? 0) + ((this.velocities[i3] ?? 0) + wind) * dt;
      this.positions[i3 + 1] = (this.positions[i3 + 1] ?? 0) + (this.velocities[i3 + 1] ?? 0) * dt;
      this.positions[i3 + 2] = (this.positions[i3 + 2] ?? 0) + (this.velocities[i3 + 2] ?? 0) * dt;

      if ((this.positions[i3 + 1] ?? 0) < 0) {
        this.positions[i3 + 1] = this.bounds.y;
        this.positions[i3] = ((Math.random() * 2 - 1) * this.bounds.x);
        this.positions[i3 + 2] = ((Math.random() * 2 - 1) * this.bounds.z);
      }
      // Wrap horizontally so a strong wind never empties the field.
      if (Math.abs(this.positions[i3] ?? 0) > this.bounds.x) {
        this.positions[i3] = -(this.positions[i3] ?? 0);
      }
    }
    this.sync(t);
  }

  private sync(t: number): void {
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.dummy.position.set(
        this.positions[i3] ?? 0,
        this.positions[i3 + 1] ?? 0,
        this.positions[i3 + 2] ?? 0,
      );
      const phase = (this.spins[i * 2] ?? 0) + t * (this.spins[i * 2 + 1] ?? 1);
      this.quat.setFromAxisAngle(new Vector3(0.3, 1, 0.2).normalize(), phase);
      this.dummy.quaternion.copy(this.quat);
      this.dummy.updateMatrix();
      this.matrix.copy(this.dummy.matrix);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setOpacity(opacity: number): void {
    const mat = this.mesh.material as MeshBasicMaterial;
    mat.opacity = opacity;
    mat.transparent = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}

/** A stand of pines scattered over a height field, for filling middle distance. */
export function scatterPines(
  count: number,
  radius: number,
  height: HeightFn,
  rng: Rng,
  innerRadius = 0,
): Group {
  const group = new Group();
  group.name = 'pines';
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = innerRadius + Math.sqrt(rng.next()) * (radius - innerRadius);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const tree = buildPine(rng, rng.range(0.7, 1.5));
    tree.position.set(x, height(x, z) - 0.1, z);
    tree.rotation.y = rng.range(0, Math.PI * 2);
    group.add(tree);
  }
  return group;
}

/** Snow-dust the upward faces of a subtree by biasing its vertex colours. */
export function frostTree(root: Object3D, amount: number): void {
  root.traverse((obj) => {
    const mesh = obj as Partial<Mesh>;
    const geo = mesh.geometry;
    if (!geo) return;
    const normal = geo.getAttribute('normal');
    const color = geo.getAttribute('color');
    if (!normal || !color) return;
    for (let i = 0; i < color.count; i++) {
      const up = Math.max(0, normal.getY(i));
      const k = Math.pow(up, 2.5) * amount;
      color.setXYZ(
        i,
        color.getX(i) * (1 - k) + k * 1.6,
        color.getY(i) * (1 - k) + k * 1.65,
        color.getZ(i) * (1 - k) + k * 1.7,
      );
    }
    color.needsUpdate = true;
  });
}
