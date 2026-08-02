import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  PlaneGeometry,
  Vector3,
  type Mesh,
} from 'three';
import { applyVertexTint, meshOf, surface } from './materials';
import { CLOTH, NATURE, vary } from '../core/palette';
import type { Rng } from '../core/rng';

/**
 * The hanseon — a Korean merchant ship.
 *
 * It is worth being specific here, because the generic "East Asian boat" is a
 * Chinese junk and looks nothing like this. A hanseon is:
 *
 *   - flat-bottomed (평저선), built for tidal mudflats, so it sits *on* the
 *     water rather than knifing into it;
 *   - square at both bow and stern, with no keel and no stem post;
 *   - planked with heavy horizontal strakes pinned by through-beams (가룡목)
 *     whose ends stick right out through the hull sides — the single most
 *     recognisable detail, and the one that makes the silhouette read Korean;
 *   - rigged with one or two masts carrying a stiff square sail of woven mat.
 *
 * These are the merchants who buy Sim Cheong for three hundred sacks of rice.
 */

export interface ShipSpec {
  readonly length?: number;
  readonly beam?: number;
  readonly depth?: number;
  readonly masts?: number;
  readonly sailColor?: number;
  readonly hullColor?: number;
  /** Adds the stacked rice sacks that are the price paid for her. */
  readonly cargo?: number;
}

export interface ShipRig {
  readonly group: Group;
  /** Sail node — rotate for wind, scale Y to furl. */
  readonly sails: Group[];
  /** Steering oar at the stern; sweeps side to side. */
  readonly rudder: Group;
  /** Deck-level anchor points, in local space, for placing figures. */
  readonly deckY: number;
  readonly length: number;
  readonly beam: number;
  /** The prow point, used by Act 5 when Sim Cheong stands on it. */
  readonly prow: Vector3;
  /** Pennants at the masthead; they get wind applied per frame. */
  readonly pennants: Group[];
}

export function buildShip(spec: ShipSpec, rng: Rng): ShipRig {
  const L = spec.length ?? 14;
  const B = spec.beam ?? 4.6;
  const D = spec.depth ?? 1.7;
  const mastCount = spec.masts ?? 1;

  const group = new Group();
  const hullMat = surface(spec.hullColor ?? vary(NATURE.timber, -0.04).getHex(), { roughness: 0.94 });
  const darkMat = surface(0x4a3626, { roughness: 0.95 });
  const deckMat = surface(vary(NATURE.timber, 0.09).getHex(), { roughness: 0.88 });

  const halfL = L / 2;
  const halfB = B / 2;

  // ---- Bottom: heavy flat planks running fore and aft --------------------
  const bottomPlanks = 7;
  for (let i = 0; i < bottomPlanks; i++) {
    const w = B / bottomPlanks;
    const plank = applyVertexTint(new BoxGeometry(w - 0.02, 0.22, L), rng, 0.06);
    // A gentle rocker so the ends lift clear of the water.
    plank.translate(-halfB + (i + 0.5) * w, 0, 0);
    group.add(meshOf(plank, darkMat));
  }

  // ---- Sides: stacked strakes, tumbling slightly outward -----------------
  const strakes = 5;
  for (let s = 0; s < strakes; s++) {
    const k = s / (strakes - 1);
    const y = 0.11 + (s + 0.5) * (D / strakes);
    const flare = halfB + k * 0.34;
    const strakeL = L * (1 - k * 0.03);

    for (const side of [1, -1] as const) {
      const plank = applyVertexTint(new BoxGeometry(0.17, D / strakes - 0.015, strakeL), rng, 0.07);
      plank.translate(side * flare, y, 0);
      const mesh = meshOf(plank, hullMat);
      mesh.rotation.z = side * -0.055 * k;
      group.add(mesh);
    }
  }

  // ---- Transoms: the square bow and stern ---------------------------------
  for (const end of [1, -1] as const) {
    const transom = applyVertexTint(new BoxGeometry(B + 0.5, D * 1.02, 0.2), rng, 0.06);
    transom.translate(0, 0.11 + (D * 1.02) / 2, end * halfL);
    const mesh = meshOf(transom, hullMat);
    // Both ends rake outward — this is what gives a hanseon its blunt, boxy
    // profile instead of a pointed prow.
    mesh.rotation.x = end * 0.2;
    group.add(mesh);
  }

  // ---- Garyongmok: through-beams whose ends protrude ----------------------
  // The detail that sells the whole thing.
  const beams = 6;
  for (let i = 0; i < beams; i++) {
    const z = -halfL * 0.82 + (i / (beams - 1)) * halfL * 1.64;
    const beam = applyVertexTint(new BoxGeometry(B + 1.25, 0.19, 0.24), rng, 0.06);
    beam.translate(0, 0.11 + D * 0.78, z);
    group.add(meshOf(beam, darkMat));

    // Wedge pins driven through the protruding ends.
    for (const side of [1, -1] as const) {
      const pin = new BoxGeometry(0.07, 0.3, 0.09);
      pin.translate(side * (halfB + 0.44), 0.11 + D * 0.78, z);
      group.add(meshOf(pin, surface(0x342519, { roughness: 0.95 }), false, false));
    }
  }

  // ---- Deck ---------------------------------------------------------------
  const deckY = 0.11 + D * 0.72;
  const deckPlanks = 9;
  for (let i = 0; i < deckPlanks; i++) {
    const w = (B + 0.2) / deckPlanks;
    const plank = applyVertexTint(new BoxGeometry(w - 0.02, 0.08, L * 0.94), rng, 0.05);
    plank.translate(-(B + 0.2) / 2 + (i + 0.5) * w, deckY, 0);
    group.add(meshOf(plank, deckMat));
  }

  // Low bulwark rail around the deck.
  for (const side of [1, -1] as const) {
    const rail = applyVertexTint(new BoxGeometry(0.11, 0.36, L * 0.9), rng, 0.05);
    rail.translate(side * (halfB + 0.3), deckY + 0.2, 0);
    group.add(meshOf(rail, hullMat));
  }

  // ---- Masts and sails ----------------------------------------------------
  const sails: Group[] = [];
  const pennants: Group[] = [];

  for (let m = 0; m < mastCount; m++) {
    const z = mastCount === 1 ? -L * 0.06 : -L * 0.22 + m * L * 0.42;
    const mastH = D + (mastCount === 1 ? 8.2 : 6.6 - m * 1.1);

    const mast = applyVertexTint(new CylinderGeometry(0.13, 0.19, mastH, 8), rng, 0.06);
    mast.translate(0, deckY + mastH / 2, z);
    group.add(meshOf(mast, darkMat));

    // Sheer legs bracing the mast foot — real hanseon masts were struck for
    // rowing, so they sit in a hinged tabernacle rather than a fixed step.
    for (const side of [1, -1] as const) {
      const brace = applyVertexTint(new BoxGeometry(0.1, 1.3, 0.1), rng, 0.05);
      brace.translate(side * 0.5, deckY + 0.6, z);
      const mesh = meshOf(brace, darkMat);
      mesh.rotation.z = side * 0.36;
      group.add(mesh);
    }

    const sailNode = new Group();
    sailNode.position.set(0, deckY + mastH * 0.9, z);
    group.add(sailNode);
    sails.push(sailNode);

    const sailW = B * 1.55;
    const sailH = mastH * 0.66;

    // Yard and boom.
    const yardMat = surface(0x5a4229, { roughness: 0.92 });
    for (const y of [0, -sailH]) {
      const yard = new CylinderGeometry(0.07, 0.07, sailW * 1.08, 6);
      yard.rotateZ(Math.PI / 2);
      yard.translate(0, y, 0);
      sailNode.add(meshOf(yard, yardMat));
    }

    // The sail itself: woven mat, so it hangs stiff with visible battens
    // rather than billowing like canvas.
    const cloth = new PlaneGeometry(sailW, sailH, 8, 5);
    cloth.translate(0, -sailH / 2, 0);
    applyVertexTint(cloth, rng, 0.07);
    const sailMesh = meshOf(
      cloth,
      surface(spec.sailColor ?? 0xd5c49c, { roughness: 0.98, doubleSide: true }),
      true,
      false,
    );
    sailNode.add(sailMesh);

    const battens = 5;
    for (let b = 1; b < battens; b++) {
      const batten = new CylinderGeometry(0.035, 0.035, sailW, 5);
      batten.rotateZ(Math.PI / 2);
      batten.translate(0, -(b / battens) * sailH, 0.03);
      sailNode.add(meshOf(batten, yardMat, false, false));
    }

    // Masthead pennant.
    const pennant = new Group();
    pennant.position.set(0, deckY + mastH * 0.99, z);
    const flag = new PlaneGeometry(1.4, 0.34, 6, 1);
    flag.translate(0.7, 0, 0);
    pennant.add(
      meshOf(flag, surface(CLOTH.royalRed, { roughness: 0.95, doubleSide: true }), false, false),
    );
    group.add(pennant);
    pennants.push(pennant);
  }

  // ---- Steering oar -------------------------------------------------------
  const rudder = new Group();
  rudder.position.set(0, deckY + 0.5, -halfL - 0.1);
  const loom = applyVertexTint(new CylinderGeometry(0.09, 0.11, 4.6, 7), rng, 0.06);
  loom.translate(0, -1.6, -0.9);
  const loomMesh = meshOf(loom, darkMat);
  loomMesh.rotation.x = 0.55;
  rudder.add(loomMesh);

  const blade = applyVertexTint(new BoxGeometry(0.13, 1.9, 0.75), rng, 0.06);
  blade.translate(0, -3.3, -2.1);
  const bladeMesh = meshOf(blade, darkMat);
  bladeMesh.rotation.x = 0.55;
  rudder.add(bladeMesh);
  group.add(rudder);

  // ---- Cargo: the three hundred sacks of rice ------------------------------
  if (spec.cargo && spec.cargo > 0) {
    const sackMat = surface(0xbfae86, { roughness: 0.99 });
    const rows = Math.ceil(Math.sqrt(spec.cargo));
    let placed = 0;
    for (let layer = 0; layer < 3 && placed < spec.cargo; layer++) {
      for (let r = 0; r < rows && placed < spec.cargo; r++) {
        for (let c = 0; c < 3 && placed < spec.cargo; c++) {
          const sack = applyVertexTint(new BoxGeometry(0.72, 0.42, 0.5), rng, 0.09);
          const mesh = meshOf(sack, sackMat);
          mesh.position.set(
            -1.0 + c * 1.0 + rng.spread(0.05),
            deckY + 0.26 + layer * 0.42,
            halfL * 0.42 - r * 0.58 + rng.spread(0.04),
          );
          mesh.rotation.y = rng.spread(0.12);
          mesh.scale.setScalar(rng.range(0.92, 1.06));
          group.add(mesh);
          placed++;
        }
      }
    }
  }

  return {
    group,
    sails,
    rudder,
    deckY,
    length: L,
    beam: B,
    prow: new Vector3(0, deckY + 0.4, halfL - 0.4),
    pennants,
  };
}

/**
 * Animate a ship's soft parts. Called every frame by the acts that carry one.
 * `wind` is a signed strength; `t` is act-local time.
 */
export function animateShip(rig: ShipRig, t: number, wind: number, heel = 0): void {
  for (let i = 0; i < rig.sails.length; i++) {
    const sail = rig.sails[i];
    if (!sail) continue;
    sail.rotation.y = wind * 0.22 + Math.sin(t * 0.7 + i) * 0.05 * Math.abs(wind);
    sail.rotation.z = Math.sin(t * 1.4 + i * 1.7) * 0.03 * Math.abs(wind);
  }
  for (let i = 0; i < rig.pennants.length; i++) {
    const pennant = rig.pennants[i];
    if (!pennant) continue;
    pennant.rotation.y = wind * 0.5 + Math.sin(t * 2.1 + i) * 0.25;
    pennant.rotation.z = Math.sin(t * 3.3 + i * 2.1) * 0.22 * Math.min(1, Math.abs(wind) + 0.2);
  }
  rig.rudder.rotation.y = Math.sin(t * 0.45) * 0.12 + heel * 0.3;
}

/** Convenience for acts that just want the hull mesh list to fade or tint. */
export function shipMeshes(rig: ShipRig): Mesh[] {
  const out: Mesh[] = [];
  rig.group.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh) out.push(mesh);
  });
  return out;
}
