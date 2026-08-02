import {
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { SEA } from '../core/palette';

/**
 * The sea.
 *
 * Four directional Gerstner waves, summed. The important design decision is
 * that the exact same wave function exists twice: once in GLSL for the surface,
 * and once in TypeScript as {@link Ocean.sample}. That duplication buys the one
 * thing that makes the water believable — the merchant ship in Act 4 and the
 * lotus in Act 7 are *actually* floating on the surface being drawn, pitching
 * and rolling with the real local slope, rather than bobbing on a sine wave that
 * happens to look about right.
 *
 * The constants below are shared by both implementations. If you change one,
 * change the other; a mismatch shows up immediately as a boat that hovers.
 */

interface WaveDef {
  /** Direction of travel, normalised. */
  readonly dx: number;
  readonly dz: number;
  /** Spatial frequency. */
  readonly k: number;
  /** Relative amplitude, scaled by the material's master amplitude. */
  readonly a: number;
  /** Temporal frequency. */
  readonly w: number;
  /** Gerstner sharpening — how much the crest pinches. */
  readonly q: number;
}

const WAVES: readonly WaveDef[] = [
  { dx: 1.0, dz: 0.0, k: 0.075, a: 1.0, w: 0.62, q: 0.85 },
  { dx: 0.62, dz: 0.78, k: 0.135, a: 0.55, w: 0.95, q: 0.7 },
  { dx: -0.42, dz: 0.9, k: 0.26, a: 0.28, w: 1.45, q: 0.5 },
  { dx: 0.88, dz: -0.47, k: 0.52, a: 0.14, w: 2.3, q: 0.35 },
];

const WAVE_GLSL = /* glsl */ `
  // Kept byte-for-byte equivalent to Ocean.sample() in water.ts.
  const int WAVE_COUNT = 4;
  uniform vec4 uWaveDir[WAVE_COUNT];   // xy = direction, z = k, w = a
  uniform vec2 uWaveTime[WAVE_COUNT];  // x = w, y = q

  vec3 waveDisplace(vec2 p, float t, float amp, float choppy) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < WAVE_COUNT; i++) {
      vec2 dir = uWaveDir[i].xy;
      float k = uWaveDir[i].z;
      float a = uWaveDir[i].w * amp;
      float w = uWaveTime[i].x;
      float q = uWaveTime[i].y * choppy;
      float phase = dot(dir, p) * k + t * w;
      acc.y += a * sin(phase);
      acc.xz += dir * (q * a * cos(phase));
    }
    return acc;
  }
`;

const OCEAN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uChoppy;

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  ${WAVE_GLSL}

  void main() {
    vec3 p = position;
    vec2 xz = vec2(p.x, p.z);

    vec3 d = waveDisplace(xz, uTime, uAmp, uChoppy);

    // Finite-difference the displaced surface to get a normal. Two extra wave
    // evaluations per vertex is cheaper and far more stable than trying to
    // differentiate the Gerstner sum analytically.
    float e = 1.2;
    vec3 dx = waveDisplace(xz + vec2(e, 0.0), uTime, uAmp, uChoppy);
    vec3 dz = waveDisplace(xz + vec2(0.0, e), uTime, uAmp, uChoppy);

    vec3 here = vec3(xz.x + d.x, d.y, xz.y + d.z);
    vec3 ax = vec3(xz.x + e + dx.x, dx.y, xz.y + dx.z) - here;
    vec3 az = vec3(xz.x + dz.x, dz.y, xz.y + e + dz.z) - here;

    vNormal = normalize(cross(az, ax));
    // A crest measure for foam: high where the surface is both up high and steep.
    vCrest = clamp(d.y / max(uAmp, 0.001) * 0.5 + 0.5, 0.0, 1.0);

    vec4 world = modelMatrix * vec4(here, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const OCEAN_FRAG = /* glsl */ `
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform float uFoamAmount;
  uniform float uGlossiness;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorld);

    // Fresnel: at grazing angles the sea is a mirror of the sky, head-on it is
    // its own body colour. Getting this ramp right does most of the work.
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.2);

    float facing = max(dot(n, uSunDir), 0.0);
    vec3 body = mix(uDeep, uShallow, facing * 0.55 + vCrest * 0.3);
    vec3 col = mix(body, uSkyColor, fresnel * 0.85);

    // Specular glitter. (Note: 'half' is a reserved word in GLSL ES — do not
    // name this variable that; it compiles on desktop and fails on mobile.)
    vec3 halfVec = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(n, halfVec), 0.0), uGlossiness);
    col += uSunColor * spec * 1.4;

    // Foam rides the crests and the steep faces.
    float steep = 1.0 - clamp(n.y, 0.0, 1.0);
    float foam = smoothstep(0.62, 0.95, vCrest) * 0.7 + smoothstep(0.18, 0.5, steep) * 0.8;
    col = mix(col, uFoam, clamp(foam * uFoamAmount, 0.0, 1.0));

    // Matched by hand to the scene's FogExp2 so the horizon does not tear.
    float dist = length(cameraPosition - vWorld);
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

    gl_FragColor = vec4(col, uOpacity);
  }
`;

/**
 * The slice of {@link Stage} the ocean needs. Declared structurally so water.ts
 * does not have to import the stage and create a cycle.
 */
export interface OceanAtmosphere {
  readonly fogColor: Color;
  readonly fogDensity: number;
  readonly sunDirection: Vector3;
  readonly sunColor: Color;
}

export interface OceanSpec {
  readonly size?: number;
  readonly segments?: number;
  readonly amplitude?: number;
  readonly choppy?: number;
  readonly shallow?: number;
  readonly deep?: number;
  readonly foam?: number;
  readonly foamAmount?: number;
  readonly glossiness?: number;
  readonly opacity?: number;
}

export class Ocean {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private amp: number;
  private choppy: number;
  private time = 0;

  constructor(spec: OceanSpec = {}) {
    const size = spec.size ?? 420;
    const segments = spec.segments ?? 220;
    this.amp = spec.amplitude ?? 0.42;
    this.choppy = spec.choppy ?? 1;

    const geo = new PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const dirs: Vector3[] = [];
    const times: Vector2[] = [];
    for (const w of WAVES) {
      const len = Math.hypot(w.dx, w.dz) || 1;
      dirs.push(new Vector3(w.dx / len, w.dz / len, w.k));
      times.push(new Vector2(w.w, w.q));
    }

    this.material = new ShaderMaterial({
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      side: DoubleSide,
      transparent: (spec.opacity ?? 1) < 1,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: this.amp },
        uChoppy: { value: this.choppy },
        // Packed as vec4(dirX, dirZ, k, a) / vec2(w, q) to keep the uniform
        // count low; struct arrays cost a uniform slot per member on some GPUs.
        uWaveDir: {
          value: WAVES.map((w, i) => {
            const d = dirs[i] ?? new Vector3(1, 0, 0.1);
            return [d.x, d.y, d.z, w.a];
          }).flat(),
        },
        uWaveTime: { value: times.map((v) => [v.x, v.y]).flat() },
        uShallow: { value: new Color(spec.shallow ?? SEA.shallow) },
        uDeep: { value: new Color(spec.deep ?? SEA.deep) },
        uFoam: { value: new Color(spec.foam ?? SEA.foam) },
        uSunDir: { value: new Vector3(0.4, 0.6, 0.5).normalize() },
        uSunColor: { value: new Color(0xfff0d8) },
        uSkyColor: { value: new Color(0x9fc0d8) },
        uFoamAmount: { value: spec.foamAmount ?? 0.6 },
        uGlossiness: { value: spec.glossiness ?? 120 },
        uOpacity: { value: spec.opacity ?? 1 },
        uFogColor: { value: new Color(0xbdbcb4) },
        uFogDensity: { value: 0.012 },
      },
    });

    this.mesh = new Mesh(geo, this.material);
    this.mesh.receiveShadow = false;
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  /**
   * Advance the surface, and pull the scene's atmosphere across.
   *
   * `stage` is a required argument on purpose. A `ShaderMaterial` gets none of
   * three's automatic fog or light uniforms, so this material carries its own
   * copies — and any act that forgot to push them got the constructor defaults
   * instead. That failure is silent and it looks like a beige stripe on the
   * horizon of a night storm. Taking the stage here makes the sync structural
   * rather than a thing to remember.
   */
  update(t: number, stage: OceanAtmosphere): void {
    this.time = t;
    this.material.uniforms['uTime']!.value = t;
    (this.material.uniforms['uFogColor']!.value as Color).copy(stage.fogColor);
    this.material.uniforms['uFogDensity']!.value = stage.fogDensity;
    (this.material.uniforms['uSunDir']!.value as Vector3).copy(stage.sunDirection).normalize();
    (this.material.uniforms['uSunColor']!.value as Color).copy(stage.sunColor);
  }

  /**
   * Storm intensity 0→1. Drives amplitude, chop, and how much foam shows.
   *
   * The amplitude coefficient is the sum of the four wave amplitudes (about
   * 1.97), so a master amplitude of 1.9 gives crests of roughly 3.8 units.
   * That is already taller than the merchant ship's freeboard and reads as a
   * serious sea. The first pass used 4.6, which produced ten-metre waves that
   * swallowed both the ship and the camera — the frame was solid water.
   */
  setStorm(intensity: number): void {
    this.amp = 0.42 + intensity * 1.55;
    this.choppy = 1 + intensity * 0.9;
    this.material.uniforms['uAmp']!.value = this.amp;
    this.material.uniforms['uChoppy']!.value = this.choppy;
    this.material.uniforms['uFoamAmount']!.value = 0.45 + intensity * 0.9;
  }

  setColors(shallow: number, deep: number, sky: number): void {
    (this.material.uniforms['uShallow']!.value as Color).setHex(shallow);
    (this.material.uniforms['uDeep']!.value as Color).setHex(deep);
    (this.material.uniforms['uSkyColor']!.value as Color).setHex(sky);
  }

  setOpacity(opacity: number): void {
    this.material.uniforms['uOpacity']!.value = opacity;
    this.material.transparent = opacity < 1;
  }

  /**
   * Evaluate the surface on the CPU. Mirrors `waveDisplace` in the shader
   * exactly. Returns the *displaced* world point for the given rest position —
   * note that Gerstner waves move horizontally too, which is why this returns a
   * full vector rather than just a height.
   */
  sample(x: number, z: number, out = new Vector3()): Vector3 {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    for (const w of WAVES) {
      const len = Math.hypot(w.dx, w.dz) || 1;
      const ux = w.dx / len;
      const uz = w.dz / len;
      const a = w.a * this.amp;
      const q = w.q * this.choppy;
      const phase = (ux * x + uz * z) * w.k + this.time * w.w;
      dy += a * Math.sin(phase);
      const c = q * a * Math.cos(phase);
      dx += ux * c;
      dz += uz * c;
    }
    return out.set(x + dx, dy, z + dz);
  }

  /** Surface height at a rest position — the common case. */
  heightAt(x: number, z: number): number {
    return this.sample(x, z).y;
  }

  /**
   * Surface normal by finite difference, using the same epsilon as the shader
   * so a floating object's tilt matches the shading under it.
   */
  normalAt(x: number, z: number, out = new Vector3()): Vector3 {
    const e = 1.2;
    const here = this.sample(x, z, new Vector3());
    const ax = this.sample(x + e, z, new Vector3()).sub(here);
    const az = this.sample(x, z + e, new Vector3()).sub(here);
    return out.crossVectors(az, ax).normalize();
  }

  /**
   * Sit an object on the water: position it at the displaced surface point and
   * tilt it to the local slope, damped so a boat rolls rather than snapping
   * flat to every ripple.
   */
  float(
    object: { position: Vector3; rotation: { x: number; z: number } },
    x: number,
    z: number,
    lift = 0,
    tiltDamping = 0.55,
    heaveDamping = 1,
  ): void {
    const p = this.sample(x, z);
    const n = this.normalAt(x, z);
    // Damping the heave lets a heavy hull cut through a crest rather than being
    // carried over every one of them. It also keeps a ship inside a fixed
    // camera frame in a big sea, which matters more than it should.
    object.position.set(p.x, p.y * heaveDamping + lift, p.z);
    object.rotation.x = Math.atan2(n.z, n.y) * tiltDamping;
    object.rotation.z = -Math.atan2(n.x, n.y) * tiltDamping;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
