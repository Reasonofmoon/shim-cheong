import {
  BufferAttribute,
  Color,
  DoubleSide,
  FrontSide,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type BufferGeometry,
  type Object3D,
} from 'three';
import type { Rng } from '../core/rng';

/**
 * Material factory and cache.
 *
 * There is no texture anywhere in this film, so surfaces get their character
 * from three things: flat shading (which turns a smooth lathe into something
 * carved), per-vertex colour jitter, and roughness. Materials are cached by
 * their full parameter signature because a village of forty roofs would
 * otherwise allocate forty identical `MeshStandardMaterial`s and force forty
 * redundant shader-program binds per frame.
 *
 * Materials are deliberately never disposed: there are on the order of a hundred
 * distinct ones across all eight acts, they are tiny, and keeping them alive
 * means an act re-entered from the scrubber rebinds an already-compiled program
 * instead of stalling to compile a new one. Geometries — which run to tens of
 * thousands of vertices per act — are disposed properly by `disposeTree`.
 */

export interface SurfaceOptions {
  readonly roughness?: number;
  readonly metalness?: number;
  readonly flat?: boolean;
  readonly emissive?: number;
  readonly emissiveIntensity?: number;
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly doubleSide?: boolean;
  readonly vertexColors?: boolean;
  readonly depthWrite?: boolean;
}

const cache = new Map<string, MeshStandardMaterial>();
const basicCache = new Map<string, MeshBasicMaterial>();

export function surface(color: number, options: SurfaceOptions = {}): MeshStandardMaterial {
  const {
    roughness = 0.85,
    metalness = 0,
    flat = true,
    emissive = 0x000000,
    emissiveIntensity = 1,
    transparent = false,
    opacity = 1,
    doubleSide = false,
    vertexColors = true,
    depthWrite = true,
  } = options;

  const key = [
    color,
    roughness,
    metalness,
    flat,
    emissive,
    emissiveIntensity,
    transparent,
    opacity,
    doubleSide,
    vertexColors,
    depthWrite,
  ].join('|');

  const hit = cache.get(key);
  if (hit) return hit;

  const mat = new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: flat,
    emissive,
    emissiveIntensity,
    transparent,
    opacity,
    side: doubleSide ? DoubleSide : FrontSide,
    vertexColors,
    depthWrite,
  });
  cache.set(key, mat);
  return mat;
}

/** Unlit fill. For glows, lantern cores, and anything that must not take light. */
export function unlit(color: number, opacity = 1, doubleSide = false): MeshBasicMaterial {
  const key = `${color}|${opacity}|${doubleSide}`;
  const hit = basicCache.get(key);
  if (hit) return hit;
  const mat = new MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: doubleSide ? DoubleSide : FrontSide,
    depthWrite: opacity >= 1,
  });
  basicCache.set(key, mat);
  return mat;
}

/**
 * Still water: a pond, a stream, a well.
 *
 * A physically sensible water material is `metalness: 0.7, roughness: 0.05` —
 * and in a scene with no environment map that renders as a **black hole**,
 * because a metal with nothing to reflect has no diffuse term to fall back on.
 * The palace pond in Act VIII was a void in the corner of the frame until this
 * was understood.
 *
 * The fix is to keep metalness low and fake the reflection instead: a dark body
 * colour, a modest specular from roughness, and an emissive lift tinted towards
 * whatever the sky is doing. It is not correct, and it is the only version that
 * reads as water here.
 */
export function stillWater(body: number, skyTint: number, glow = 0.28): MeshStandardMaterial {
  return surface(body, {
    roughness: 0.18,
    metalness: 0.2,
    flat: false,
    vertexColors: false,
    emissive: skyTint,
    emissiveIntensity: glow,
  });
}

/**
 * Oiled hanji — the paper stretched over every door and lantern in the film.
 * It is lit from behind more often than in front, so it carries its own
 * emissive term and always renders double-sided.
 */
export function hanji(tint = 0xf3e7cc, glow = 0.35, opacity = 0.9): MeshStandardMaterial {
  return surface(tint, {
    roughness: 0.95,
    emissive: tint,
    emissiveIntensity: glow,
    transparent: opacity < 1,
    opacity,
    doubleSide: true,
    flat: false,
  });
}

/**
 * Write a per-vertex colour multiplier into a geometry.
 *
 * This is the single most load-bearing trick in the whole renderer. Without it a
 * thatched roof is one uniform brown lozenge; with a ±5% value jitter keyed to
 * position it reads as bundled straw. The jitter is spatially smooth-ish rather
 * than pure per-vertex noise, because fully random vertices produce a confetti
 * look on low-poly geometry.
 */
export function applyVertexTint(
  geometry: BufferGeometry,
  rng: Rng,
  amount = 0.05,
  hueShift = 0,
  base: Color = new Color(1, 1, 1),
): BufferGeometry {
  const pos = geometry.getAttribute('position');
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const c = new Color();

  for (let i = 0; i < count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    // Hash position so vertices that share a location share a tint; this keeps
    // welded seams from showing a hard colour break.
    const h = Math.sin(px * 12.9898 + py * 78.233 + pz * 37.719) * 43758.5453;
    const n = (h - Math.floor(h)) * 2 - 1;
    const jitter = 1 + n * amount + rng.spread(amount * 0.35);

    c.copy(base).multiplyScalar(jitter);
    if (hueShift !== 0) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL((hsl.h + n * hueShift + 1) % 1, hsl.s, hsl.l);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Darken a geometry's lower vertices. Fakes ambient occlusion where an object
 * meets the ground for a tenth of the cost of a real AO pass, and reads
 * surprisingly well on low-poly forms.
 */
export function groundShade(
  geometry: BufferGeometry,
  floor: number,
  height: number,
  strength = 0.45,
): BufferGeometry {
  const pos = geometry.getAttribute('position');
  let colorAttr = geometry.getAttribute('color') as BufferAttribute | undefined;
  if (!colorAttr) {
    const filled = new Float32Array(pos.count * 3).fill(1);
    colorAttr = new BufferAttribute(filled, 3);
    geometry.setAttribute('color', colorAttr);
  }

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = Math.min(1, Math.max(0, (y - floor) / height));
    const shade = 1 - (1 - k) * strength;
    colorAttr.setXYZ(
      i,
      colorAttr.getX(i) * shade,
      colorAttr.getY(i) * shade,
      colorAttr.getZ(i) * shade,
    );
  }
  colorAttr.needsUpdate = true;
  return geometry;
}

/**
 * Guarantee that a geometry has a `color` attribute if its material reads one.
 *
 * This exists because of a genuinely nasty failure mode. WebGL supplies
 * `(0, 0, 0, 1)` for any vertex attribute the geometry does not provide, so a
 * material with `vertexColors: true` drawn on a geometry with no colour
 * attribute multiplies its albedo by zero and renders **pure black**, in every
 * light, with no warning from three.js and nothing in the console.
 *
 * Since `surface()` enables vertex colours by default, every mesh built from a
 * raw `BoxGeometry` without going through `applyVertexTint` silently turned
 * black — door lattices, window frames, persimmons on a tree. It was invisible
 * in code review and obvious the instant a frame was actually looked at.
 *
 * Rather than ask a hundred call sites to remember, the invariant is enforced
 * here, at the one gate every mesh in the film passes through.
 */
function ensureVertexColors(geometry: BufferGeometry, material: Material): void {
  const usesVertexColors = (material as { vertexColors?: boolean }).vertexColors;
  if (!usesVertexColors) return;
  if (geometry.getAttribute('color')) return;

  const position = geometry.getAttribute('position');
  if (!position) return;
  const white = new Float32Array(position.count * 3).fill(1);
  geometry.setAttribute('color', new BufferAttribute(white, 3));
}

/** Every mesh in the film goes through here so shadow flags stay consistent. */
export function meshOf(
  geometry: BufferGeometry,
  material: Material,
  castShadow = true,
  receiveShadow = true,
): Mesh {
  ensureVertexColors(geometry, material);
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/**
 * Release every geometry under `root`. Materials are intentionally left in the
 * cache — see the note at the top of this file.
 */
export function disposeTree(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Partial<Mesh>;
    if (mesh.geometry) mesh.geometry.dispose();
  });
}

/** Dispose a specific material — for the handful an act builds uncached. */
export function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) material.forEach((m) => m.dispose());
  else material.dispose();
}
