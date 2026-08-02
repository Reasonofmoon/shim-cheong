import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Object3D,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { applyVertexTint, meshOf, surface, unlit } from './materials';
import { OBANG, SEA } from '../core/palette';
import { fbm1, type Rng } from '../core/rng';

/**
 * The Dragon King of the Southern Sea.
 *
 * A Korean dragon (용) has no wings and is not a lizard. It is a long serpent
 * with four short clawed legs, deer antlers, a carp's whiskers trailing from
 * the snout, and a mane running the length of its spine. It swims through air
 * and water alike, and it carries the yeouiju — the wish-fulfilling pearl —
 * which here is the light source for the whole of Act 6.
 *
 * The body is a chain of segments placed along a parametric path each frame.
 * Nothing is skinned: each segment is an independent mesh that gets positioned
 * and oriented from the path's tangent. At this scale that is both simpler than
 * a skeleton and — because the segments overlap — visually indistinguishable.
 */

/** A path in space, parameterised by arc position `s` in [0, 1] and time. */
export type SwimPath = (s: number, t: number, out: Vector3) => Vector3;

export interface DragonSpec {
  readonly segments?: number;
  readonly length?: number;
  readonly radius?: number;
  readonly bodyColor?: number;
  readonly maneColor?: number;
  readonly bellyColor?: number;
  readonly pearl?: boolean;
}

export class Dragon {
  readonly group: Group;
  readonly head: Group;
  /** The wish-fulfilling pearl. Acts reposition and brighten it. */
  readonly pearl: Group | null;
  readonly pearlLight: PointLight | null;

  private readonly segments: Object3D[];
  private readonly maneNodes: Object3D[];
  private readonly whiskers: Object3D[];
  private readonly count: number;
  private readonly scratch = new Vector3();
  private readonly ahead = new Vector3();
  private readonly up = new Vector3(0, 1, 0);

  constructor(spec: DragonSpec, rng: Rng) {
    const count = spec.segments ?? 42;
    const radius = spec.radius ?? 0.62;
    const bodyColor = spec.bodyColor ?? 0x2f7f6b;
    const bellyColor = spec.bellyColor ?? 0xc9b46a;
    const maneColor = spec.maneColor ?? OBANG.jeok;

    this.group = new Group();
    this.count = count;
    this.segments = [];
    this.maneNodes = [];
    this.whiskers = [];

    const scaleMat = surface(bodyColor, { roughness: 0.42, metalness: 0.25 });
    const bellyMat = surface(bellyColor, { roughness: 0.5, metalness: 0.15 });
    const maneMat = surface(maneColor, { roughness: 0.85, doubleSide: true });

    // ---- Body -------------------------------------------------------------
    for (let i = 0; i < count; i++) {
      const k = i / (count - 1);
      // Thickest a third of the way back, tapering to a whip tail — a uniform
      // tube reads as a hose, and this profile is what makes it read as alive.
      const taper =
        Math.pow(Math.sin(Math.pow(k, 0.62) * Math.PI * 0.92 + 0.18), 0.85) * (1 - k * 0.25);
      const r = radius * Math.max(0.08, taper);

      const node = new Group();
      const seg = applyVertexTint(new IcosahedronGeometry(r, 1), rng, 0.07);
      seg.scale(1, 0.88, 1.25);
      node.add(meshOf(seg, scaleMat));

      // Belly plates, so the underside reads differently from the back.
      const belly = applyVertexTint(new SphereGeometry(r * 0.72, 6, 4, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), rng, 0.06);
      belly.translate(0, -r * 0.34, 0);
      node.add(meshOf(belly, bellyMat, false, false));

      // Dorsal mane — a saw of triangular fins the whole way down the spine.
      if (i > 1 && i < count - 2 && i % 1 === 0) {
        const fin = new ConeGeometry(r * 0.46, r * 1.5, 3);
        fin.rotateX(-0.35);
        fin.translate(0, r * 0.95, 0);
        const finMesh = meshOf(fin, maneMat, false, false);
        node.add(finMesh);
        this.maneNodes.push(finMesh);
      }

      // Four short legs, at the shoulders and hips of a very long animal.
      if (i === 5 || i === 6 || i === Math.floor(count * 0.52) || i === Math.floor(count * 0.52) + 1) {
        for (const side of [1, -1] as const) {
          const leg = buildLeg(r, scaleMat, bellyMat, rng);
          leg.position.set(side * r * 0.85, -r * 0.3, 0);
          leg.rotation.z = side * 0.75;
          node.add(leg);
        }
      }

      this.group.add(node);
      this.segments.push(node);
    }

    // ---- Head ---------------------------------------------------------------
    this.head = new Group();
    const headR = radius * 1.15;

    const skull = applyVertexTint(new IcosahedronGeometry(headR, 1), rng, 0.06);
    skull.scale(0.95, 0.85, 1.6);
    this.head.add(meshOf(skull, scaleMat));

    const snout = applyVertexTint(new IcosahedronGeometry(headR * 0.6, 1), rng, 0.06);
    snout.scale(0.9, 0.72, 1.5);
    snout.translate(0, -headR * 0.18, headR * 1.5);
    this.head.add(meshOf(snout, scaleMat));

    // Jaw, hanging slightly open.
    const jaw = applyVertexTint(new IcosahedronGeometry(headR * 0.48, 1), rng, 0.06);
    jaw.scale(0.85, 0.5, 1.7);
    jaw.translate(0, -headR * 0.55, headR * 1.25);
    this.head.add(meshOf(jaw, bellyMat));

    // Teeth.
    const toothMat = surface(0xf0ebdc, { roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = headR * (1.0 + Math.floor(i / 2) * 0.42);
      const tooth = new ConeGeometry(headR * 0.075, headR * 0.3, 4);
      tooth.rotateX(Math.PI);
      tooth.translate(side * headR * 0.36, -headR * 0.34, z);
      this.head.add(meshOf(tooth, toothMat, false, false));
    }

    // Eyes: big, gold, and lit, because they are the only thing the audience
    // will actually look at when the dragon fills the frame.
    for (const side of [1, -1] as const) {
      const eye = new SphereGeometry(headR * 0.2, 8, 7);
      eye.translate(side * headR * 0.6, headR * 0.24, headR * 0.62);
      this.head.add(meshOf(eye, unlit(0xffcf52), false, false));

      const pupil = new SphereGeometry(headR * 0.085, 6, 5);
      pupil.scale(0.5, 1.4, 0.5);
      pupil.translate(side * headR * 0.7, headR * 0.26, headR * 0.76);
      this.head.add(meshOf(pupil, unlit(0x1a0f06), false, false));

      // Antlers — branched, like a deer's, never like a bull's.
      const antler = buildAntler(headR, maneMat, rng);
      antler.position.set(side * headR * 0.45, headR * 0.7, -headR * 0.15);
      antler.rotation.z = side * 0.5;
      antler.rotation.x = -0.45;
      antler.scale.x = side;
      this.head.add(antler);

      // Whiskers: long, curling barbels that trail behind in the current.
      const whisker = new Group();
      whisker.position.set(side * headR * 0.5, -headR * 0.05, headR * 2.0);
      const strands = 7;
      for (let i = 0; i < strands; i++) {
        const k = i / (strands - 1);
        const seg = new CylinderGeometry(headR * (0.05 - k * 0.035), headR * (0.06 - k * 0.04), headR * 0.5, 4);
        seg.rotateX(Math.PI / 2);
        const mesh = meshOf(seg, maneMat, false, false);
        mesh.position.set(side * k * headR * 0.5, -k * k * headR * 0.9, k * headR * 1.9);
        whisker.add(mesh);
      }
      this.head.add(whisker);
      this.whiskers.push(whisker);
    }

    // Chin beard.
    const beard = new ConeGeometry(headR * 0.3, headR * 1.1, 5);
    beard.rotateX(Math.PI * 0.42);
    beard.translate(0, -headR * 0.72, headR * 0.9);
    this.head.add(meshOf(beard, maneMat, false, false));

    // Nose horn.
    const horn = new ConeGeometry(headR * 0.12, headR * 0.5, 5);
    horn.rotateX(-0.6);
    horn.translate(0, headR * 0.42, headR * 1.75);
    this.head.add(meshOf(horn, surface(0xe8dcb0, { roughness: 0.6 }), false, false));

    this.group.add(this.head);

    // ---- Yeouiju ------------------------------------------------------------
    if (spec.pearl ?? true) {
      this.pearl = new Group();
      const orb = new SphereGeometry(radius * 0.72, 16, 14);
      this.pearl.add(meshOf(orb, unlit(0xd8fff4), false, false));

      const halo = new SphereGeometry(radius * 1.15, 14, 12);
      this.pearl.add(
        meshOf(
          halo,
          surface(SEA.palaceGlow, {
            transparent: true,
            opacity: 0.22,
            emissive: SEA.palaceGlow,
            emissiveIntensity: 2.4,
            depthWrite: false,
            flat: false,
          }),
          false,
          false,
        ),
      );

      this.pearlLight = new PointLight(SEA.palaceGlow, 40, 55, 2);
      this.pearl.add(this.pearlLight);
      this.group.add(this.pearl);
    } else {
      this.pearl = null;
      this.pearlLight = null;
    }
  }

  /**
   * Lay the body out along `path` for time `t`. The head takes the tangent at
   * s = 0, and each segment trails behind it — so the animation is entirely
   * determined by the path function, and acts can fly the dragon anywhere by
   * writing one closure.
   */
  follow(path: SwimPath, t: number): void {
    const head = path(0, t, this.scratch.clone());
    path(0.02, t, this.ahead);

    this.head.position.copy(head);
    this.head.lookAt(this.ahead.multiplyScalar(2).sub(head));
    // lookAt aims -Z; the head is modelled facing +Z.
    this.head.rotateY(Math.PI);

    for (let i = 0; i < this.count; i++) {
      const s = (i + 1) / (this.count + 1);
      const node = this.segments[i];
      if (!node) continue;
      const p = path(s, t, this.scratch);
      node.position.copy(p);

      path(Math.min(1, s + 0.02), t, this.ahead);
      node.lookAt(this.ahead);
      // Keep the mane pointing up rather than corkscrewing with the path.
      node.up.copy(this.up);
    }

    // Whiskers stream backwards with a lag proportional to speed.
    for (let i = 0; i < this.whiskers.length; i++) {
      const w = this.whiskers[i];
      if (!w) continue;
      w.rotation.x = 0.3 + Math.sin(t * 1.7 + i * 2.1) * 0.22;
      w.rotation.y = Math.sin(t * 1.1 + i * 3.3) * 0.3;
    }

    // The mane ripples as a travelling wave down the spine.
    for (let i = 0; i < this.maneNodes.length; i++) {
      const fin = this.maneNodes[i];
      if (!fin) continue;
      fin.rotation.z = Math.sin(t * 4 - i * 0.35) * 0.16;
    }
  }

  /** Park the pearl in front of the snout, where the dragon usually holds it. */
  holdPearl(t: number, distance = 2.4): void {
    if (!this.pearl) return;
    const offset = new Vector3(
      Math.sin(t * 0.9) * 0.35,
      0.4 + Math.sin(t * 1.3) * 0.25,
      distance,
    );
    offset.applyQuaternion(this.head.quaternion);
    this.pearl.position.copy(this.head.position).add(offset);
    this.pearl.scale.setScalar(1 + Math.sin(t * 2.6) * 0.05);
  }

  setPearlIntensity(intensity: number): void {
    if (this.pearlLight) this.pearlLight.intensity = intensity;
  }
}

function buildLeg(
  radius: number,
  scaleMat: ReturnType<typeof surface>,
  clawMatSource: ReturnType<typeof surface>,
  rng: Rng,
): Group {
  const leg = new Group();

  const upper = applyVertexTint(new CylinderGeometry(radius * 0.3, radius * 0.4, radius * 1.1, 6), rng, 0.07);
  upper.translate(0, -radius * 0.55, 0);
  leg.add(meshOf(upper, scaleMat));

  const lower = applyVertexTint(new CylinderGeometry(radius * 0.2, radius * 0.3, radius * 0.9, 6), rng, 0.07);
  lower.translate(0, -radius * 1.5, radius * 0.18);
  const lowerMesh = meshOf(lower, scaleMat);
  lowerMesh.rotation.x = -0.4;
  leg.add(lowerMesh);

  // Four claws — a Korean dragon has four, which is the traditional count for
  // anyone below the Chinese emperor's five.
  const clawMat = surface(0xf0e6c8, { roughness: 0.55 });
  for (let i = 0; i < 4; i++) {
    const a = -0.6 + (i / 3) * 1.2;
    const claw = new ConeGeometry(radius * 0.09, radius * 0.42, 4);
    claw.rotateX(Math.PI * 0.62);
    claw.translate(Math.sin(a) * radius * 0.32, -radius * 1.98, radius * 0.5 + Math.cos(a) * radius * 0.12);
    leg.add(meshOf(claw, clawMat, false, false));
  }

  const pad = new SphereGeometry(radius * 0.26, 6, 5);
  pad.scale(1.2, 0.6, 1.1);
  pad.translate(0, -radius * 1.92, radius * 0.34);
  leg.add(meshOf(pad, clawMatSource, false, false));

  return leg;
}

function buildAntler(scale: number, mat: ReturnType<typeof surface>, rng: Rng): Group {
  const antler = new Group();
  const boneMat = surface(0xd8c78e, { roughness: 0.7 });

  const main = applyVertexTint(new CylinderGeometry(scale * 0.05, scale * 0.1, scale * 1.0, 5), rng, 0.08);
  main.translate(0, scale * 0.5, 0);
  antler.add(meshOf(main, boneMat, false, false));

  for (let i = 0; i < 3; i++) {
    const k = 0.35 + i * 0.24;
    const len = scale * (0.55 - i * 0.1);
    const branch = applyVertexTint(new CylinderGeometry(scale * 0.03, scale * 0.055, len, 5), rng, 0.08);
    branch.translate(0, len / 2, 0);
    const mesh = meshOf(branch, boneMat, false, false);
    mesh.position.y = scale * k;
    mesh.rotation.z = -0.75 - i * 0.12;
    mesh.rotation.x = 0.3 - i * 0.25;
    antler.add(mesh);
  }

  // A tuft of mane at the base.
  const tuft = new ConeGeometry(scale * 0.16, scale * 0.42, 4);
  tuft.rotateX(0.6);
  tuft.translate(0, scale * 0.1, -scale * 0.15);
  antler.add(meshOf(tuft, mat, false, false));

  return antler;
}

/**
 * The default swim: a long sine travelling down the body, with a slow drift.
 * Acts wrap this to route the dragon along a specific course.
 */
export function serpentPath(
  origin: Vector3,
  heading: Vector3,
  length: number,
  amplitude: number,
  waves: number,
  speed: number,
): SwimPath {
  const forward = heading.clone().normalize();
  const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();

  return (s, t, out) => {
    const along = -s * length;
    const phase = s * waves * Math.PI * 2 - t * speed;
    const lateral = Math.sin(phase) * amplitude;
    const vertical = Math.sin(phase * 0.62 + 1.2) * amplitude * 0.45;
    return out
      .copy(origin)
      .addScaledVector(forward, along)
      .addScaledVector(right, lateral)
      .addScaledVector(up, vertical);
  };
}

/**
 * A path that coils around a point — used when the dragon circles Sim Cheong
 * as she sinks, which is the emotional centre of Act 6.
 */
export function coilPath(
  center: Vector3,
  radius: number,
  height: number,
  turns: number,
  speed: number,
  wobble = 0.4,
): SwimPath {
  return (s, t, out) => {
    const a = s * turns * Math.PI * 2 - t * speed;
    const r = radius * (1 + Math.sin(s * Math.PI) * 0.25);
    const y = center.y + (s - 0.5) * height + fbm1(s * 6 + t * 0.6, 3) * wobble;
    return out.set(center.x + Math.cos(a) * r, y, center.z + Math.sin(a) * r);
  };
}

/**
 * Bioluminescent jellyfish. Cheap, and they do an enormous amount to establish
 * scale and depth in an otherwise featureless volume of water.
 */
export function buildJellyfish(color: number, rng: Rng, scale = 1): { group: Group; bell: Object3D; tentacles: Object3D[] } {
  const group = new Group();

  const bellGeo = new SphereGeometry(scale * 0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  applyVertexTint(bellGeo, rng, 0.05);
  const bell = meshOf(
    bellGeo,
    surface(color, {
      transparent: true,
      opacity: 0.42,
      emissive: color,
      emissiveIntensity: 1.6,
      doubleSide: true,
      depthWrite: false,
      flat: false,
    }),
    false,
    false,
  );
  group.add(bell);

  const rim = new TorusGeometry(scale * 0.49, scale * 0.03, 6, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, scale * 0.02, 0);
  group.add(
    meshOf(
      rim,
      surface(color, { emissive: color, emissiveIntensity: 3, roughness: 0.4, flat: false }),
      false,
      false,
    ),
  );

  const tentacles: Object3D[] = [];
  const count = rng.int(7, 11);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const strand = new Group();
    strand.position.set(Math.cos(a) * scale * 0.36, 0, Math.sin(a) * scale * 0.36);
    const links = 5;
    for (let l = 0; l < links; l++) {
      const seg = new CylinderGeometry(scale * 0.012, scale * 0.018, scale * 0.34, 4);
      const mesh = meshOf(
        seg,
        surface(color, {
          transparent: true,
          opacity: 0.5,
          emissive: color,
          emissiveIntensity: 1.2,
          depthWrite: false,
          flat: false,
        }),
        false,
        false,
      );
      mesh.position.y = -scale * 0.17 - l * scale * 0.32;
      strand.add(mesh);
    }
    group.add(strand);
    tentacles.push(strand);
  }

  return { group, bell, tentacles };
}

/** Pulse a jellyfish. Called per frame with its own phase offset. */
export function animateJellyfish(
  jelly: { bell: Object3D; tentacles: Object3D[] },
  t: number,
  phase: number,
): void {
  const pulse = Math.sin(t * 1.6 + phase);
  jelly.bell.scale.set(1 + pulse * 0.13, 1 - pulse * 0.2, 1 + pulse * 0.13);
  for (let i = 0; i < jelly.tentacles.length; i++) {
    const strand = jelly.tentacles[i];
    if (!strand) continue;
    strand.rotation.x = Math.sin(t * 1.4 + phase + i) * 0.22 - pulse * 0.15;
    strand.rotation.z = Math.cos(t * 1.2 + phase + i * 1.7) * 0.22;
  }
}
