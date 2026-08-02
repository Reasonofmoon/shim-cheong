import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { fbm1 } from '../core/rng';

/**
 * Korean roofs, parametrically.
 *
 * A hanok roof is not a pair of flat planes. Three superimposed curves are what
 * make it read as Korean rather than generically East Asian, and all three are
 * expressed here as terms in one surface function:
 *
 *   1. `concavity` — the slope is steep at the ridge and flattens towards the
 *      eaves, so the roof section is a concave curve, not a straight line.
 *   2. `angok` (앙곡) — the eave line sweeps *upward* towards the corners.
 *   3. `anheorigok` (안허리곡) — in plan, the eave line also bows *outward*
 *      towards the corners, so the corner projects further than the mid-span.
 *
 * Tiles are not separate objects. The surface is displaced along its own normal
 * by a `cos²` ripple across `u`, which produces the alternating convex/concave
 * courses of Korean tile at zero extra draw calls. Thatch uses smooth noise in
 * the same slot.
 */

export interface RoofSpec {
  /** Half-length of the ridge beam along X. */
  readonly ridgeHalf: number;
  /** Half-extent of the eave line along X, at mid-span. */
  readonly eaveHalfX: number;
  /** Half-extent of the eave line along Z. */
  readonly eaveHalfZ: number;
  /** Vertical drop from ridge to eave. */
  readonly drop: number;
  /** How much the corners lift above the mid-span eave line. */
  readonly angok: number;
  /** How much further the corners project in plan. */
  readonly anheorigok: number;
  /** 0 is a straight slope; 1 is a fully concave Korean profile. */
  readonly concavity: number;
  /** Number of tile courses across the slope. 0 disables ribbing. */
  readonly ribs: number;
  /** Depth of the tile ribbing, in world units. */
  readonly ribDepth: number;
  /** Adds smooth noise to the surface — used for thatch instead of tiles. */
  readonly thatch: number;
  readonly uSegments: number;
  readonly vSegments: number;
}

export const DEFAULT_ROOF: RoofSpec = {
  ridgeHalf: 2,
  eaveHalfX: 3.4,
  eaveHalfZ: 2.6,
  drop: 1.5,
  angok: 0.42,
  anheorigok: 0.35,
  concavity: 1,
  ribs: 18,
  ribDepth: 0.045,
  thatch: 0,
  uSegments: 40,
  vSegments: 12,
};

/**
 * The shared height profile. `v` runs 0 at the ridge to 1 at the eave.
 * `edge` is -1..1 across the span, used for the corner lift.
 */
function slopeY(spec: RoofSpec, v: number, edge: number): number {
  // Concave: drop fast near the ridge, flatten near the eaves.
  const straight = v;
  const concave = 1 - (1 - v) * (1 - v);
  const fall = straight * (1 - spec.concavity) + concave * spec.concavity;
  // The corner lift only bites in the outer quarter of the span and the outer
  // third of the slope, which is where a real eave actually turns up.
  const lift = spec.angok * Math.pow(Math.abs(edge), 4) * Math.pow(v, 2.6);
  return -spec.drop * fall + lift;
}

/** Plan-space outward bow of the eave towards the corners. */
function planFlare(spec: RoofSpec, v: number, edge: number): number {
  return 1 + spec.anheorigok * Math.pow(Math.abs(edge), 3) * v * v;
}

/** Surface displacement: tile courses, or thatch lumps. */
function ripple(spec: RoofSpec, u: number, v: number, seed: number): number {
  let d = 0;
  if (spec.ribs > 0) {
    const phase = u * spec.ribs * Math.PI;
    const s = Math.sin(phase);
    // Squaring keeps the ribs entirely above the base surface, so the courses
    // sit proud of the sheathing the way real tile does.
    d += s * s * spec.ribDepth;
    // The eave course is a fraction thicker — that heavy bottom edge is very
    // characteristic and it catches the light.
    d += Math.pow(v, 8) * spec.ribDepth * 1.6;
  }
  if (spec.thatch > 0) {
    d += fbm1(u * 9 + v * 3.5, seed) * spec.thatch;
    d += fbm1(u * 26 + v * 11, seed + 17) * spec.thatch * 0.35;
  }
  return d;
}

type SurfaceFn = (u: number, v: number) => Vector3;

/**
 * Tessellate a parametric patch into a non-indexed geometry. Non-indexed is
 * deliberate: every quad gets its own vertices and therefore its own face
 * normal, which is exactly what makes flat shading carve the tile courses into
 * visible facets.
 */
function tessellate(fn: SurfaceFn, uSegs: number, vSegs: number): BufferGeometry {
  const positions: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const d = new Vector3();

  for (let i = 0; i < uSegs; i++) {
    const u0 = i / uSegs;
    const u1 = (i + 1) / uSegs;
    for (let j = 0; j < vSegs; j++) {
      const v0 = j / vSegs;
      const v1 = (j + 1) / vSegs;

      a.copy(fn(u0, v0));
      b.copy(fn(u1, v0));
      c.copy(fn(u1, v1));
      d.copy(fn(u0, v1));

      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

const scratch = new Vector3();

/**
 * A hipped roof (우진각), the form used on thatched cottages and on the lower
 * storey of every larger building here. Four slopes: two long trapezoids and
 * two triangular hips. The two are generated by the same height function so the
 * corner seams match exactly.
 */
export function hipRoof(spec: RoofSpec, seed = 7): BufferGeometry {
  const geos: BufferGeometry[] = [];

  // The two long slopes, front (+Z) and back (-Z).
  for (const side of [1, -1] as const) {
    geos.push(
      tessellate(
        (u, v) => {
          const edge = u * 2 - 1;
          const flare = planFlare(spec, v, edge);
          const halfX = spec.ridgeHalf + (spec.eaveHalfX - spec.ridgeHalf) * v;
          const x = edge * halfX * flare;
          const z = side * spec.eaveHalfZ * v;
          const y = slopeY(spec, v, edge) + ripple(spec, u, v, seed);
          return scratch.set(x, y, z);
        },
        spec.uSegments,
        spec.vSegments,
      ),
    );
  }

  // The two hip ends, +X and -X. These collapse to the ridge endpoint at v = 0.
  for (const end of [1, -1] as const) {
    geos.push(
      tessellate(
        (u, v) => {
          const across = u * 2 - 1;
          const x = end * (spec.ridgeHalf + (spec.eaveHalfX - spec.ridgeHalf) * v);
          const z = across * spec.eaveHalfZ * v;
          // At the hip, the "edge" that drives the corner lift is how far along
          // the hip we are — full lift at the corners, none at the ridge tip.
          const y = slopeY(spec, v, across * v) + ripple(spec, u * 0.5, v, seed + 3);
          return scratch.set(x, y, z);
        },
        Math.max(8, Math.round(spec.uSegments * 0.5)),
        spec.vSegments,
      ),
    );
  }

  return mergePositions(geos);
}

/**
 * A gabled roof (맞배 / the upper storey of a 팔작). Two slopes only, with open
 * triangular gable ends that the caller fills with a wall or a bargeboard.
 */
export function gableRoof(spec: RoofSpec, seed = 11): BufferGeometry {
  const geos: BufferGeometry[] = [];
  for (const side of [1, -1] as const) {
    geos.push(
      tessellate(
        (u, v) => {
          const edge = u * 2 - 1;
          const flare = planFlare(spec, v, edge);
          const x = edge * spec.eaveHalfX * flare;
          const z = side * spec.eaveHalfZ * v;
          const y = slopeY(spec, v, edge) + ripple(spec, u, v, seed);
          return scratch.set(x, y, z);
        },
        spec.uSegments,
        spec.vSegments,
      ),
    );
  }
  return mergePositions(geos);
}

/**
 * Sample the eave line so callers can hang lanterns, gutters, or the little
 * clay figurines that sit on a palace ridge. `t` runs 0→1 along the front eave.
 */
export function frontEavePoint(spec: RoofSpec, t: number, out = new Vector3()): Vector3 {
  const edge = t * 2 - 1;
  const flare = planFlare(spec, 1, edge);
  return out.set(edge * spec.eaveHalfX * flare, slopeY(spec, 1, edge), spec.eaveHalfZ);
}

/** Ridge height above the eave datum — useful for stacking storeys. */
export function ridgeHeight(spec: RoofSpec): number {
  return spec.drop;
}

/**
 * Concatenate position-only geometries. Three's own merge utility lives in
 * addons and insists on matching attribute sets; every patch here is
 * position-only and freshly normal-computed, so this is both simpler and
 * cheaper than pulling that in.
 */
function mergePositions(geos: readonly BufferGeometry[]): BufferGeometry {
  let total = 0;
  for (const g of geos) total += g.getAttribute('position').count;

  const positions = new Float32Array(total * 3);
  let offset = 0;
  for (const g of geos) {
    const attr = g.getAttribute('position');
    positions.set(attr.array as Float32Array, offset);
    offset += attr.count * 3;
    g.dispose();
  }

  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  return merged;
}
