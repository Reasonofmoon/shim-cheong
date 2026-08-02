import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { applyVertexTint, meshOf, surface, unlit } from './materials';
import { SEA } from '../core/palette';
import { fbm1, type Rng } from '../core/rng';

/**
 * The Dragon King's palace, and the water around it.
 *
 * Act 6 has a hard problem: it is set inside an undifferentiated volume of dark
 * water, which is the least readable space in the whole film. Everything here
 * exists to give that volume structure — light shafts to establish "up",
 * bioluminescence to establish scale, kelp to establish a floor, and drifting
 * particulate to establish that there is a medium at all.
 */

/**
 * God rays. Long, very soft cones with additive blending, aimed downward from
 * the surface. Real volumetrics would need a second render pass; this reads
 * better than it has any right to and costs four triangles a shaft.
 */
export function buildLightShafts(
  count: number,
  spread: number,
  height: number,
  color: number,
  rng: Rng,
): { group: Group; update: (t: number) => void } {
  const group = new Group();
  const shafts: Array<{ mesh: Mesh; phase: number; baseOpacity: number }> = [];

  for (let i = 0; i < count; i++) {
    const topR = rng.range(1.4, 4.2);
    const botR = topR * rng.range(2.2, 4.0);
    const geo = new ConeGeometry(botR, height, 7, 1, true);
    // Fade the shaft out towards its base by writing a vertical alpha ramp into
    // the vertex colours; the material multiplies by them.
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const k = (pos.getY(v) + height / 2) / height;
      const fade = Math.pow(k, 1.6);
      colors[v * 3] = fade;
      colors[v * 3 + 1] = fade;
      colors[v * 3 + 2] = fade;
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3));

    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: rng.range(0.05, 0.13),
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      vertexColors: true,
      fog: false,
    });

    const mesh = new Mesh(geo, mat);
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * spread;
    mesh.position.set(Math.cos(a) * r, height / 2, Math.sin(a) * r);
    mesh.rotation.z = rng.spread(0.16);
    mesh.rotation.x = rng.spread(0.16);
    mesh.renderOrder = 900;
    group.add(mesh);
    shafts.push({ mesh, phase: rng.range(0, Math.PI * 2), baseOpacity: mat.opacity });
  }

  const update = (t: number): void => {
    for (const shaft of shafts) {
      const mat = shaft.mesh.material as MeshBasicMaterial;
      // Shafts breathe as the surface above them moves.
      mat.opacity = shaft.baseOpacity * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.6 + shaft.phase)));
      shaft.mesh.rotation.z = Math.sin(t * 0.25 + shaft.phase) * 0.08;
    }
  };

  return { group, update };
}

/** A kelp forest. Each frond is a ribbon that sways as a travelling wave. */
export function buildKelp(
  count: number,
  radius: number,
  rng: Rng,
): { group: Group; update: (t: number) => void } {
  const group = new Group();
  const strands: Array<{ segments: Object3D[]; phase: number; height: number }> = [];

  const kelpMat = surface(0x2c5b45, {
    roughness: 0.9,
    doubleSide: true,
    emissive: 0x0d3326,
    emissiveIntensity: 0.5,
  });

  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * radius;
    const height = rng.range(5, 15);
    const links = Math.max(5, Math.round(height / 1.6));

    const root = new Group();
    root.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    root.rotation.y = rng.range(0, Math.PI * 2);
    group.add(root);

    const segments: Object3D[] = [];
    let parent: Object3D = root;
    for (let l = 0; l < links; l++) {
      const k = l / links;
      const segH = height / links;
      const node = new Group();
      node.position.y = l === 0 ? 0 : height / links;
      parent.add(node);

      const blade = new BufferGeometry();
      const w = (0.34 - k * 0.2) * rng.range(0.8, 1.2);
      const positions = new Float32Array([
        -w, 0, 0, w, 0, 0, w * 0.8, segH, 0,
        -w, 0, 0, w * 0.8, segH, 0, -w * 0.8, segH, 0,
      ]);
      blade.setAttribute('position', new BufferAttribute(positions, 3));
      blade.computeVertexNormals();
      applyVertexTint(blade, rng, 0.1);
      const mesh = new Mesh(blade, kelpMat);
      mesh.castShadow = false;
      node.add(mesh);

      segments.push(node);
      parent = node;
    }

    strands.push({ segments, phase: rng.range(0, Math.PI * 2), height });
  }

  const update = (t: number): void => {
    for (const strand of strands) {
      for (let i = 0; i < strand.segments.length; i++) {
        const node = strand.segments[i];
        if (!node) continue;
        const k = i / strand.segments.length;
        // Amplitude grows towards the tip, which is what makes it look like it
        // is being dragged by a current rather than wagged from the base.
        const amp = 0.04 + k * 0.14;
        node.rotation.x = Math.sin(t * 0.9 - i * 0.4 + strand.phase) * amp;
        node.rotation.z = Math.cos(t * 0.7 - i * 0.35 + strand.phase * 1.7) * amp * 0.7;
      }
    }
  };

  return { group, update };
}

/** Coral and anemone clusters for the sea floor. */
export function buildCoral(count: number, radius: number, rng: Rng): Group {
  const group = new Group();
  const palette = [0xd4736a, 0xdda45c, 0x8f6bb5, 0x4fa8a0, 0xd9648f];

  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * radius;
    const color = palette[rng.int(0, palette.length - 1)] ?? 0xd4736a;
    const mat = surface(color, {
      roughness: 0.8,
      emissive: color,
      emissiveIntensity: 0.35,
    });

    const cluster = new Group();
    cluster.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);

    if (rng.chance(0.5)) {
      // Branching coral: a small recursive fan.
      const branches = rng.int(4, 8);
      for (let b = 0; b < branches; b++) {
        const ba = (b / branches) * Math.PI * 2 + rng.spread(0.4);
        const len = rng.range(0.5, 1.6);
        const branch = applyVertexTint(new CylinderGeometry(0.03, 0.08, len, 5), rng, 0.1);
        branch.translate(0, len / 2, 0);
        const mesh = meshOf(branch, mat, false, false);
        mesh.rotation.z = Math.cos(ba) * 0.5;
        mesh.rotation.x = Math.sin(ba) * 0.5;
        cluster.add(mesh);

        const tip = new SphereGeometry(0.07, 6, 5);
        tip.translate(
          Math.sin(Math.cos(ba) * 0.5) * len,
          len * 0.95,
          -Math.sin(Math.sin(ba) * 0.5) * len,
        );
        cluster.add(meshOf(tip, mat, false, false));
      }
    } else {
      // Brain coral: a lumpy dome.
      const dome = applyVertexTint(new IcosahedronGeometry(rng.range(0.4, 1.0), 1), rng, 0.14);
      dome.scale(1.2, 0.6, 1.1);
      cluster.add(meshOf(dome, mat, false, true));

      for (let g = 0; g < 5; g++) {
        const ring = new TorusGeometry(rng.range(0.12, 0.3), 0.03, 5, 10);
        ring.rotateX(Math.PI / 2);
        ring.translate(rng.spread(0.4), rng.range(0.2, 0.45), rng.spread(0.4));
        cluster.add(meshOf(ring, mat, false, false));
      }
    }

    cluster.rotation.y = rng.range(0, Math.PI * 2);
    cluster.scale.setScalar(rng.range(0.7, 1.5));
    group.add(cluster);
  }
  return group;
}

/**
 * A school of fish. One instanced mesh; each fish swims a slightly detuned
 * ellipse around the school centre, which gives a convincing shoal for the
 * price of one draw call.
 */
export class FishSchool {
  readonly mesh: InstancedMesh;
  private readonly count: number;
  private readonly phases: Float32Array;
  private readonly radii: Float32Array;
  private readonly heights: Float32Array;
  private readonly speeds: Float32Array;
  private readonly dummy = new Object3D();
  private readonly center = new Vector3();
  private readonly next = new Vector3();

  constructor(count: number, color: number, rng: Rng, size = 0.3) {
    // A fish is a diamond: two triangles for the body, one for the tail.
    const geo = new BufferGeometry();
    const s = size;
    const positions = new Float32Array([
      0, 0, s * 2, s * 0.5, 0, 0, 0, s * 0.45, 0,
      0, 0, s * 2, 0, s * 0.45, 0, -s * 0.5, 0, 0,
      0, 0, s * 2, -s * 0.5, 0, 0, 0, -s * 0.4, 0,
      0, 0, s * 2, 0, -s * 0.4, 0, s * 0.5, 0, 0,
      s * 0.5, 0, 0, 0, s * 0.45, 0, 0, s * 0.7, -s * 1.1,
      -s * 0.5, 0, 0, 0, s * 0.7, -s * 1.1, 0, s * 0.45, 0,
      s * 0.5, 0, 0, 0, -s * 0.7, -s * 1.1, 0, -s * 0.4, 0,
      -s * 0.5, 0, 0, 0, -s * 0.4, 0, 0, -s * 0.7, -s * 1.1,
    ]);
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    this.mesh = new InstancedMesh(
      geo,
      surface(color, {
        roughness: 0.4,
        metalness: 0.4,
        vertexColors: false,
        emissive: color,
        emissiveIntensity: 0.25,
        doubleSide: true,
      }),
      count,
    );
    this.mesh.frustumCulled = false;
    this.count = count;

    this.phases = new Float32Array(count);
    this.radii = new Float32Array(count);
    this.heights = new Float32Array(count);
    this.speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.phases[i] = rng.range(0, Math.PI * 2);
      this.radii[i] = rng.range(2.5, 9);
      this.heights[i] = rng.spread(3.5);
      this.speeds[i] = rng.range(0.28, 0.5);
    }
  }

  setCenter(x: number, y: number, z: number): void {
    this.center.set(x, y, z);
  }

  update(t: number): void {
    for (let i = 0; i < this.count; i++) {
      const phase = this.phases[i] ?? 0;
      const radius = this.radii[i] ?? 4;
      const speed = this.speeds[i] ?? 0.35;
      const a = phase + t * speed;

      // Ellipse plus a slow vertical wander, and a little noise so the school
      // is not a set of perfect concentric rings.
      const wobble = fbm1(t * 0.5 + phase * 3, i) * 1.6;
      const x = this.center.x + Math.cos(a) * radius * 1.3 + wobble;
      const y = this.center.y + (this.heights[i] ?? 0) + Math.sin(t * 0.7 + phase) * 0.9;
      const z = this.center.z + Math.sin(a) * radius;

      const aNext = a + 0.05;
      this.next.set(
        this.center.x + Math.cos(aNext) * radius * 1.3 + wobble,
        y,
        this.center.z + Math.sin(aNext) * radius,
      );

      this.dummy.position.set(x, y, z);
      this.dummy.lookAt(this.next);
      // Tail beat, applied as a roll so it costs nothing.
      this.dummy.rotateZ(Math.sin(t * 9 + phase) * 0.22);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}

/** Rising bubbles and suspended particulate. */
export class Motes {
  readonly mesh: InstancedMesh;
  private readonly count: number;
  private readonly data: Float32Array;
  private readonly bounds: Vector3;
  private readonly dummy = new Object3D();
  private readonly rise: number;

  constructor(count: number, bounds: Vector3, size: number, color: number, rng: Rng, rise = 0.5) {
    const geo = new SphereGeometry(size, 5, 4);
    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: true,
    });
    this.mesh = new InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.count = count;
    this.bounds = bounds;
    this.rise = rise;
    // Packed as [x, y, z, scale] per mote.
    this.data = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      this.data[i * 4] = rng.spread(bounds.x);
      this.data[i * 4 + 1] = rng.range(0, bounds.y);
      this.data[i * 4 + 2] = rng.spread(bounds.z);
      this.data[i * 4 + 3] = rng.range(0.4, 1.8);
    }
  }

  update(dt: number, t: number): void {
    for (let i = 0; i < this.count; i++) {
      const i4 = i * 4;
      const scale = this.data[i4 + 3] ?? 1;
      let y = (this.data[i4 + 1] ?? 0) + this.rise * dt * scale;
      if (y > this.bounds.y) y -= this.bounds.y;
      this.data[i4 + 1] = y;

      const x = (this.data[i4] ?? 0) + Math.sin(t * 0.6 + i) * 0.004;
      this.dummy.position.set(x, y, this.data[i4 + 2] ?? 0);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setOpacity(opacity: number): void {
    (this.mesh.material as MeshBasicMaterial).opacity = opacity;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}

/**
 * A giant clam, pearl-lined. Sim Cheong's mother is found sitting in one of
 * these in Act 6, which is a liberty the film takes and a very legible image.
 */
export function buildClam(rng: Rng, scale = 1): { group: Group; upper: Group; light: PointLight } {
  const group = new Group();
  const shellMat = surface(0xb8a68c, { roughness: 0.65, metalness: 0.2 });
  const nacreMat = surface(0xf0e6f2, {
    roughness: 0.12,
    metalness: 0.7,
    emissive: 0xcfe6ee,
    emissiveIntensity: 0.5,
    flat: false,
  });

  const makeShell = (): Group => {
    const shell = new Group();
    const outer = new SphereGeometry(scale, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    outer.scale(1, 0.42, 1.15);
    applyVertexTint(outer, rng, 0.06);
    shell.add(meshOf(outer, shellMat));

    const inner = new SphereGeometry(scale * 0.94, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    inner.scale(1, 0.4, 1.15);
    shell.add(meshOf(inner, nacreMat, false, false));

    // Radial ribs.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rib = new SphereGeometry(scale * 0.055, 5, 4);
      rib.scale(1, 1, 9);
      const mesh = meshOf(rib, shellMat, false, false);
      mesh.position.set(Math.cos(a) * scale * 0.6, scale * 0.16, Math.sin(a) * scale * 0.6);
      mesh.rotation.y = -a;
      shell.add(mesh);
    }
    return shell;
  };

  const lower = makeShell();
  lower.rotation.x = Math.PI;
  lower.position.y = scale * 0.02;
  group.add(lower);

  const upper = makeShell();
  upper.position.set(0, scale * 0.04, -scale * 1.05);
  upper.rotation.x = -1.05;
  group.add(upper);

  const light = new PointLight(0xd6f2ff, 12 * scale, 22 * scale, 2);
  light.position.y = scale * 0.5;
  group.add(light);

  const pearl = new SphereGeometry(scale * 0.16, 10, 8);
  pearl.translate(0, scale * 0.2, scale * 0.4);
  group.add(meshOf(pearl, unlit(0xfdf6ff), false, false));

  return { group, upper, light };
}

/**
 * The Dragon King's gate: a coral arch flanked by glowing pillars. Placing a
 * threshold like this at the entrance to the palace is what tells the audience
 * they have arrived somewhere rather than merely gone deeper.
 */
export function buildSeaGate(rng: Rng, span = 14, height = 11): Group {
  const group = new Group();
  const pillarMat = surface(0x3d6f7a, {
    roughness: 0.55,
    metalness: 0.25,
    emissive: SEA.palaceGlow,
    emissiveIntensity: 0.22,
  });
  const glowMat = surface(SEA.palaceGlow, {
    emissive: SEA.palaceGlow,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });

  for (const side of [1, -1] as const) {
    const pillar = applyVertexTint(new CylinderGeometry(0.85, 1.15, height, 10), rng, 0.07);
    pillar.translate(side * span * 0.5, height / 2, 0);
    group.add(meshOf(pillar, pillarMat));

    // Encrusting growth up the shaft.
    for (let i = 0; i < 9; i++) {
      const y = rng.range(0.5, height - 0.6);
      const lump = applyVertexTint(new IcosahedronGeometry(rng.range(0.2, 0.5), 0), rng, 0.15);
      const a = rng.range(0, Math.PI * 2);
      lump.translate(
        side * span * 0.5 + Math.cos(a) * 0.95,
        y,
        Math.sin(a) * 0.95,
      );
      group.add(meshOf(lump, glowMat, false, false));
    }

    const light = new PointLight(SEA.palaceGlow, 22, 34, 2);
    light.position.set(side * span * 0.5, height * 0.8, 0);
    group.add(light);
  }

  // The arch itself: a torus segment spanning the pillars.
  const arch = new TorusGeometry(span * 0.5, 0.7, 8, 24, Math.PI);
  arch.translate(0, height, 0);
  applyVertexTint(arch, rng, 0.06);
  group.add(meshOf(arch, pillarMat));

  // Hanging strands of pearls. Deliberately small and dim: at full brightness
  // and 0.13 radius they read as a grid of white dots pasted over the shot
  // rather than as beadwork on an arch.
  const pearlMat = surface(0xbfd8de, {
    roughness: 0.25,
    metalness: 0.4,
    emissive: 0x6fa8b0,
    emissiveIntensity: 0.5,
    flat: false,
  });
  for (let i = 0; i < 9; i++) {
    const k = i / 8;
    const x = (k - 0.5) * span * 0.9;
    // Follow the arch, so the strands hang from the curve rather than from a
    // straight line drawn across it.
    const archDrop = (1 - Math.cos((k - 0.5) * Math.PI)) * span * 0.28;
    const beads = 3 + Math.round(Math.sin(k * Math.PI) * 3);
    for (let b = 0; b < beads; b++) {
      const bead = new SphereGeometry(0.075, 7, 6);
      bead.translate(x, height - archDrop - 0.5 - b * 0.34, 0);
      group.add(meshOf(bead, pearlMat, false, false));
    }
  }

  return group;
}
