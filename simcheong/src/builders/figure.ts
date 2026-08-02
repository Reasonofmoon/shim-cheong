import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';
import { applyVertexTint, meshOf, surface, unlit } from './materials';
import { CLOTH } from '../core/palette';
import type { Rng } from '../core/rng';
import { fbm1 } from '../core/rng';

/**
 * The hanbok figure.
 *
 * Every human in the film — Sim Cheong, her blind father, monks, sailors,
 * courtiers, the crowd at the feast — is this one rig with different cloth
 * colours and headwear. Getting the silhouette right matters more than detail,
 * because at the distances this film shoots from, silhouette is all you have.
 *
 * The two silhouettes that read as unmistakably Korean:
 *
 *   - Women: a very short `jeogori` ending just under the bust, and a `chima`
 *     that starts at the chest and falls in a bell to the ankles. The waist is
 *     never visible. Getting the jeogori short enough is the single change that
 *     flips a figure from "generic robe" to "hanbok".
 *   - Men: jeogori to the hip over `baji` that balloon at the thigh and cinch
 *     at the ankle, plus the wide-brimmed `gat` if they are anyone at all.
 *
 * Poses are applied declaratively from a plain object so that acts stay pure
 * functions of time and the scrubber keeps working.
 */

export type Sex = 'male' | 'female';
export type Headwear = 'none' | 'gat' | 'monk' | 'crown' | 'headband' | 'kerchief';
export type Hair = 'topknot' | 'braid' | 'bun' | 'shaved' | 'loose' | 'child';

export interface FigureSpec {
  readonly height?: number;
  readonly sex?: Sex;
  /** Upper garment colour. */
  readonly jeogori?: number;
  /** Skirt or trouser colour. */
  readonly lower?: number;
  /** Collar trim and ribbon colour; defaults to a contrast against the jeogori. */
  readonly accent?: number;
  readonly headwear?: Headwear;
  readonly hair?: Hair;
  readonly skin?: number;
  /** Sim's father. Draws closed eyes and gives him a slight forward lean. */
  readonly blind?: boolean;
  /** Adds an outer sleeveless vest — used for merchants and officials. */
  readonly overcoat?: number;
  /** Diagonal kasaya sash for monks. */
  readonly kasaya?: number;
}

export interface Pose {
  /** Rotation of the whole body around Y, radians. */
  bodyTurn?: number;
  /** Forward bend at the waist. Positive folds forward. */
  spineBend?: number;
  /** Side lean at the waist. */
  spineLean?: number;
  headTurn?: number;
  headTilt?: number;
  /** Shoulder pitch. Positive swings the arm forward. */
  armLSwing?: number;
  armRSwing?: number;
  /** Shoulder abduction — lifts the arm away from the body. */
  armLRaise?: number;
  armRRaise?: number;
  elbowL?: number;
  elbowR?: number;
  legLSwing?: number;
  legRSwing?: number;
  kneeL?: number;
  kneeR?: number;
  /** Drops the hips. 1 is a full kneel. */
  crouch?: number;
  /** Vertical offset applied to the root, for bobbing and floating. */
  lift?: number;
}

interface EyeStates {
  readonly closed: Group;
  readonly open: Group;
}

interface Joints {
  readonly root: Group;
  readonly hips: Group;
  readonly spine: Group;
  readonly neck: Group;
  readonly shoulderL: Group;
  readonly shoulderR: Group;
  readonly elbowL: Group;
  readonly elbowR: Group;
  readonly hipL: Group;
  readonly hipR: Group;
  readonly kneeL: Group;
  readonly kneeR: Group;
}

export class Figure {
  readonly root: Group;
  readonly height: number;
  readonly sex: Sex;

  private readonly joints: Joints;
  private readonly baseHipY: number;
  private readonly seed: number;
  private readonly eyes: EyeStates;

  constructor(joints: Joints, height: number, sex: Sex, seed: number, eyes: EyeStates) {
    this.joints = joints;
    this.root = joints.root;
    this.height = height;
    this.sex = sex;
    this.baseHipY = joints.hips.position.y;
    this.seed = seed;
    this.eyes = eyes;
  }

  /**
   * Open or close the eyes. Act VIII exists for this one call: when Sim Cheong
   * cries out, her father's eyes open, and so do every blind guest's in the
   * hall behind him.
   */
  setEyesOpen(open: boolean): void {
    this.eyes.open.visible = open;
    this.eyes.closed.visible = !open;
  }

  /** Apply a pose. Anything omitted resets to neutral, so poses never leak. */
  setPose(pose: Pose): void {
    const j = this.joints;
    const crouch = pose.crouch ?? 0;

    j.root.rotation.y = pose.bodyTurn ?? 0;
    // 0.3 of body height was not enough drop to read as kneeling at
    // distance; a seated Korean figure sits back on the heels, which is
    // closer to 0.42.
    j.hips.position.y = this.baseHipY - crouch * this.height * 0.42 + (pose.lift ?? 0);

    j.spine.rotation.x = pose.spineBend ?? 0;
    j.spine.rotation.z = pose.spineLean ?? 0;

    j.neck.rotation.y = pose.headTurn ?? 0;
    j.neck.rotation.x = pose.headTilt ?? 0;

    j.shoulderL.rotation.x = pose.armLSwing ?? 0;
    j.shoulderL.rotation.z = -(pose.armLRaise ?? 0);
    j.shoulderR.rotation.x = pose.armRSwing ?? 0;
    j.shoulderR.rotation.z = pose.armRRaise ?? 0;

    j.elbowL.rotation.x = -(pose.elbowL ?? 0);
    j.elbowR.rotation.x = -(pose.elbowR ?? 0);

    j.hipL.rotation.x = pose.legLSwing ?? -crouch * 0.9;
    j.hipR.rotation.x = pose.legRSwing ?? -crouch * 0.9;
    j.kneeL.rotation.x = pose.kneeL ?? crouch * 1.8;
    j.kneeR.rotation.x = pose.kneeR ?? crouch * 1.8;
  }

  /**
   * A walk cycle as a pure function of phase (0→1 per stride pair).
   * `stride` scales how far the limbs travel — 0.4 is an old man's shuffle,
   * 1.2 is a sailor hauling rope.
   */
  walk(phase: number, stride = 1, extra: Pose = {}): void {
    const a = phase * Math.PI * 2;
    const swing = Math.sin(a) * 0.55 * stride;
    const counter = Math.sin(a + Math.PI) * 0.42 * stride;
    // Knees only bend on the recovery half of each leg's cycle.
    const kneeL = Math.max(0, -Math.sin(a - 0.6)) * 0.95 * stride;
    const kneeR = Math.max(0, -Math.sin(a + Math.PI - 0.6)) * 0.95 * stride;
    const bob = Math.abs(Math.sin(a)) * 0.02 * this.height * stride;

    this.setPose({
      legLSwing: swing,
      legRSwing: -swing,
      kneeL,
      kneeR,
      armLSwing: counter * 0.75,
      armRSwing: -counter * 0.75,
      elbowL: 0.25 + Math.max(0, counter) * 0.4,
      elbowR: 0.25 + Math.max(0, -counter) * 0.4,
      lift: bob,
      spineLean: Math.sin(a * 2) * 0.02,
      ...extra,
    });
  }

  /** Small, continuous life so a standing figure never looks like a statue. */
  idle(t: number, amount = 1, extra: Pose = {}): void {
    const s = this.seed;
    this.setPose({
      spineBend: fbm1(t * 0.5, s) * 0.035 * amount,
      spineLean: fbm1(t * 0.42 + 11, s + 3) * 0.03 * amount,
      headTurn: fbm1(t * 0.33 + 5, s + 1) * 0.22 * amount,
      headTilt: fbm1(t * 0.29 + 19, s + 2) * 0.1 * amount,
      armLSwing: 0.04 + fbm1(t * 0.4 + 31, s + 4) * 0.07 * amount,
      armRSwing: 0.04 + fbm1(t * 0.4 + 47, s + 5) * 0.07 * amount,
      elbowL: 0.2,
      elbowR: 0.2,
      lift: fbm1(t * 0.7 + 3, s + 6) * 0.006 * this.height * amount,
      ...extra,
    });
  }

  /** A formal Korean bow. `amount` 0→1 goes from a nod to a deep waist bow. */
  bow(amount: number, extra: Pose = {}): void {
    this.setPose({
      spineBend: amount * 1.15,
      headTilt: amount * 0.3,
      armLSwing: amount * 0.55,
      armRSwing: amount * 0.55,
      armLRaise: amount * 0.28,
      armRRaise: amount * 0.28,
      elbowL: 1.5 * amount + 0.2,
      elbowR: 1.5 * amount + 0.2,
      ...extra,
    });
  }

  /** Full kneeling prostration — the great bow, used at the temple and court. */
  kneel(amount: number, extra: Pose = {}): void {
    this.setPose({
      crouch: amount,
      spineBend: amount * 1.35,
      headTilt: amount * 0.45,
      armLSwing: amount * 1.25,
      armRSwing: amount * 1.25,
      elbowL: 0.35,
      elbowR: 0.35,
      ...extra,
    });
  }

  /** Both arms reaching forward — Sim's father groping for her, and the finale. */
  reach(amount: number, spread = 0.3, extra: Pose = {}): void {
    this.setPose({
      armLSwing: amount * 1.5,
      armRSwing: amount * 1.5,
      armLRaise: spread * amount,
      armRRaise: spread * amount,
      elbowL: (1 - amount) * 0.7 + 0.12,
      elbowR: (1 - amount) * 0.7 + 0.12,
      spineBend: amount * 0.16,
      ...extra,
    });
  }

  setPosition(x: number, y: number, z: number): this {
    this.root.position.set(x, y, z);
    return this;
  }

  setFacing(radians: number): this {
    this.root.rotation.y = radians;
    return this;
  }
}

/** Build a figure. The returned rig is positioned with its feet at y = 0. */
export function buildFigure(spec: FigureSpec, rng: Rng): Figure {
  const h = spec.height ?? 1.68;
  const sex: Sex = spec.sex ?? 'female';
  const skin = spec.skin ?? CLOTH.skin;
  const jeogoriColor = spec.jeogori ?? CLOTH.hempWhite;
  const lowerColor = spec.lower ?? CLOTH.hempGrey;
  const accent = spec.accent ?? CLOTH.royalRed;
  const seed = rng.int(0, 100000);

  const clothMat = surface(jeogoriColor, { roughness: 0.95 });
  const lowerMat = surface(lowerColor, { roughness: 0.95 });
  const skinMat = surface(skin, { roughness: 0.75, flat: false });
  const accentMat = surface(accent, { roughness: 0.9 });
  const hairMat = surface(CLOTH.hair, { roughness: 0.6, flat: false });

  const root = new Group();

  // ---- Skeleton ---------------------------------------------------------
  // Proportions are keyed off total height so one rig serves a child of 1.1 m
  // and a sailor of 1.78 m without any special cases.
  const hipY = h * 0.5;
  const shoulderY = h * 0.3; // measured up from the hips
  const headY = h * 0.42;

  const hips = new Group();
  hips.position.y = hipY;
  root.add(hips);

  const spine = new Group();
  hips.add(spine);

  const neck = new Group();
  neck.position.y = headY;
  spine.add(neck);

  const shoulderL = new Group();
  shoulderL.position.set(h * 0.105, shoulderY, 0);
  spine.add(shoulderL);

  const shoulderR = new Group();
  shoulderR.position.set(-h * 0.105, shoulderY, 0);
  spine.add(shoulderR);

  const elbowL = new Group();
  elbowL.position.y = -h * 0.155;
  shoulderL.add(elbowL);

  const elbowR = new Group();
  elbowR.position.y = -h * 0.155;
  shoulderR.add(elbowR);

  const hipL = new Group();
  hipL.position.set(h * 0.055, 0, 0);
  hips.add(hipL);

  const hipR = new Group();
  hipR.position.set(-h * 0.055, 0, 0);
  hips.add(hipR);

  const kneeL = new Group();
  kneeL.position.y = -h * 0.24;
  hipL.add(kneeL);

  const kneeR = new Group();
  kneeR.position.y = -h * 0.24;
  hipR.add(kneeR);

  // ---- Legs -------------------------------------------------------------
  if (sex === 'male') {
    // Baji: full at the thigh, gathered at the ankle by the daenim ties.
    const thigh = tinted(new CylinderGeometry(h * 0.062, h * 0.052, h * 0.24, 7), rng);
    thigh.translate(0, -h * 0.12, 0);
    hipL.add(meshOf(thigh, lowerMat));
    hipR.add(meshOf(thigh.clone(), lowerMat));

    const calf = tinted(new CylinderGeometry(h * 0.052, h * 0.028, h * 0.22, 7), rng);
    calf.translate(0, -h * 0.11, 0);
    kneeL.add(meshOf(calf, lowerMat));
    kneeR.add(meshOf(calf.clone(), lowerMat));

    const tie = tinted(new TorusGeometry(h * 0.028, h * 0.007, 4, 8), rng);
    tie.rotateX(Math.PI / 2);
    tie.translate(0, -h * 0.215, 0);
    kneeL.add(meshOf(tie, accentMat));
    kneeR.add(meshOf(tie.clone(), accentMat));
  } else {
    // Under the chima the legs are never seen; simple pillars are enough and
    // they keep the skirt from clipping through itself when she walks.
    const leg = tinted(new CylinderGeometry(h * 0.045, h * 0.035, h * 0.25, 6), rng);
    leg.translate(0, -h * 0.125, 0);
    hipL.add(meshOf(leg, lowerMat, false, false));
    hipR.add(meshOf(leg.clone(), lowerMat, false, false));

    const shin = tinted(new CylinderGeometry(h * 0.035, h * 0.026, h * 0.22, 6), rng);
    shin.translate(0, -h * 0.11, 0);
    kneeL.add(meshOf(shin, lowerMat, false, false));
    kneeR.add(meshOf(shin.clone(), lowerMat, false, false));
  }

  // Straw sandals, or the upturned toe of a court shoe.
  const shoeMat = surface(sex === 'female' ? accent : 0x4a3a2c, { roughness: 0.9 });
  const shoe = tinted(new BoxGeometry(h * 0.055, h * 0.028, h * 0.11), rng);
  shoe.translate(0, -h * 0.235, h * 0.012);
  kneeL.add(meshOf(shoe, shoeMat));
  kneeR.add(meshOf(shoe.clone(), shoeMat));

  // ---- Torso ------------------------------------------------------------
  if (sex === 'female') {
    // The chima hangs from the chest, not the waist. Its top edge sits above
    // the bust line, which is what makes the proportion read as hanbok.
    const skirtTop = shoulderY - h * 0.08;
    // Hem radius matters a lot: at h * 0.30 the chima is a metre across at the
    // floor and every woman in a crowd reads as a traffic cone. A real chima
    // falls closer to the body than photographs of court dress suggest.
    const skirt = pleatedSkirt(h * 0.115, h * 0.235, h * 0.62, 22, 14);
    skirt.translate(0, skirtTop - h * 0.62, 0);
    tinted(skirt, rng, 0.055);
    const skirtMesh = meshOf(skirt, surface(lowerColor, { roughness: 0.97, doubleSide: true }));
    spine.add(skirtMesh);

    // The chest band that ties the chima closed.
    const band = tinted(new CylinderGeometry(h * 0.118, h * 0.115, h * 0.045, 14, 1, true), rng);
    band.translate(0, skirtTop - h * 0.022, 0);
    spine.add(meshOf(band, surface(jeogoriColor, { roughness: 0.95, doubleSide: true })));

    // The jeogori: short, cropped just below the bust.
    const top = tinted(new CylinderGeometry(h * 0.10, h * 0.125, h * 0.15, 10), rng);
    top.translate(0, shoulderY - h * 0.045, 0);
    spine.add(meshOf(top, clothMat));
  } else {
    const top = tinted(new CylinderGeometry(h * 0.10, h * 0.115, h * 0.30, 10), rng);
    top.translate(0, shoulderY - h * 0.15, 0);
    spine.add(meshOf(top, clothMat));

    const belt = tinted(new TorusGeometry(h * 0.112, h * 0.012, 5, 12), rng);
    belt.rotateX(Math.PI / 2);
    belt.translate(0, shoulderY - h * 0.26, 0);
    spine.add(meshOf(belt, accentMat));
  }

  // Git — the white collar band that frames the neck on every jeogori.
  const collar = tinted(new CylinderGeometry(h * 0.062, h * 0.075, h * 0.05, 10, 1, true), rng);
  collar.translate(0, shoulderY + h * 0.032, 0);
  spine.add(meshOf(collar, surface(CLOTH.hempWhite, { roughness: 0.9, doubleSide: true })));

  // Goreum — the long ribbon knotted at the chest, hanging to the hem. It moves
  // in the wind in several acts, so it gets its own node the scenes can find.
  const ribbon = new Group();
  ribbon.name = 'goreum';
  ribbon.position.set(h * 0.02, shoulderY - h * 0.04, h * 0.09);
  const ribbonGeo = tinted(new BoxGeometry(h * 0.035, h * 0.30, h * 0.006), rng);
  ribbonGeo.translate(0, -h * 0.15, 0);
  ribbon.add(meshOf(ribbonGeo, accentMat, false, false));
  spine.add(ribbon);

  if (spec.overcoat !== undefined) {
    const coatMat = surface(spec.overcoat, { roughness: 0.93, doubleSide: true });
    const coat = pleatedSkirt(h * 0.135, h * 0.20, h * 0.52, 10, 8);
    coat.translate(0, shoulderY - h * 0.02 - h * 0.52, 0);
    tinted(coat, rng, 0.04);
    spine.add(meshOf(coat, coatMat));
  }

  if (spec.kasaya !== undefined) {
    const sash = tinted(new BoxGeometry(h * 0.13, h * 0.42, h * 0.02), rng);
    sash.translate(0, shoulderY - h * 0.15, h * 0.085);
    const sashMesh = meshOf(sash, surface(spec.kasaya, { roughness: 0.9 }));
    sashMesh.rotation.z = 0.42;
    spine.add(sashMesh);
  }

  // ---- Arms -------------------------------------------------------------
  //
  // The sleeve is the arm, visually. A hanbok sleeve is a wide closed tube that
  // covers the shoulder and the whole upper arm and flares towards the wrist —
  // the `baerae` curve. Modelling a thin arm and hanging a narrow open cylinder
  // beside it (the first attempt) produced floating cuffs with gaps at the
  // shoulder; making the sleeve itself the load-bearing shape fixes the
  // silhouette and hides every joint.
  const sleeveMat = surface(jeogoriColor, { roughness: 0.95 });

  const shoulderCap = tinted(new SphereGeometry(h * 0.062, 8, 6), rng);
  shoulderCap.scale(1, 0.9, 1);
  shoulderL.add(meshOf(shoulderCap, sleeveMat));
  shoulderR.add(meshOf(shoulderCap.clone(), sleeveMat));

  const sleeve = tinted(new CylinderGeometry(h * 0.058, h * 0.082, h * 0.165, 9), rng);
  sleeve.translate(0, -h * 0.082, 0);
  shoulderL.add(meshOf(sleeve, sleeveMat));
  shoulderR.add(meshOf(sleeve.clone(), sleeveMat));

  // The forearm sleeve continues past the elbow and stops short of the wrist.
  const cuff = tinted(new CylinderGeometry(h * 0.078, h * 0.056, h * 0.115, 9), rng);
  cuff.translate(0, -h * 0.05, 0);
  elbowL.add(meshOf(cuff, sleeveMat));
  elbowR.add(meshOf(cuff.clone(), sleeveMat));

  const wrist = tinted(new CylinderGeometry(h * 0.024, h * 0.024, h * 0.055, 6), rng);
  wrist.translate(0, -h * 0.125, 0);
  elbowL.add(meshOf(wrist, skinMat, false, false));
  elbowR.add(meshOf(wrist.clone(), skinMat, false, false));

  const hand = tinted(new SphereGeometry(h * 0.03, 7, 6), rng);
  hand.scale(1, 1.2, 0.7);
  hand.translate(0, -h * 0.16, 0);
  elbowL.add(meshOf(hand, skinMat, false, false));
  elbowR.add(meshOf(hand.clone(), skinMat, false, false));

  // ---- Head -------------------------------------------------------------
  const neckGeo = tinted(new CylinderGeometry(h * 0.028, h * 0.032, h * 0.05, 7), rng);
  neckGeo.translate(0, h * 0.02, 0);
  neck.add(meshOf(neckGeo, skinMat, false, false));

  const headGeo = tinted(new SphereGeometry(h * 0.081, 12, 10), rng, 0.03);
  headGeo.scale(0.88, 1.02, 0.94);
  headGeo.translate(0, h * 0.105, 0);
  neck.add(meshOf(headGeo, skinMat));

  buildHair(neck, spec.hair ?? (sex === 'female' ? 'braid' : 'topknot'), h, hairMat, rng);
  const eyes = buildFace(neck, h, spec.blind ?? false);
  buildHeadwear(neck, spec.headwear ?? 'none', h, rng);

  const figure = new Figure(
    { root, hips, spine, neck, shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR },
    h,
    sex,
    seed,
    eyes,
  );
  figure.setPose({});
  return figure;
}

/**
 * A cylinder whose radius ripples around its circumference, producing the
 * vertical folds of a chima. Building this by hand rather than with a lathe
 * lets the pleats deepen towards the hem, which is how real gathered cloth
 * behaves and is very visible in silhouette.
 */
function pleatedSkirt(
  topRadius: number,
  bottomRadius: number,
  height: number,
  pleats: number,
  segments: number,
): BufferGeometry {
  const radial = pleats * 2;
  const geo = new CylinderGeometry(topRadius, bottomRadius, height, radial, segments, true);
  const pos = geo.getAttribute('position');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const radius = Math.hypot(x, z);
    if (radius < 1e-5) continue;

    // 0 at the waist, 1 at the hem — pleats are flat at the top and deep below.
    const drop = 1 - (y + height / 2) / height;
    const fold = 1 + Math.cos(angle * pleats) * 0.075 * drop * drop;
    // A slight outward flare near the hem so it does not read as a plain cone.
    const flare = 1 + Math.pow(drop, 3) * 0.12;
    const r = radius * fold * flare;
    pos.setX(i, Math.cos(angle) * r);
    pos.setZ(i, Math.sin(angle) * r);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildHair(parent: Group, style: Hair, h: number, mat: ReturnType<typeof surface>, rng: Rng): void {
  const top = h * 0.105;
  switch (style) {
    case 'shaved':
      break;
    case 'topknot': {
      const cap = tinted(new SphereGeometry(h * 0.084, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.46), rng);
      cap.translate(0, top + h * 0.006, 0);
      parent.add(meshOf(cap, mat, false, false));
      const knot = tinted(new SphereGeometry(h * 0.026, 7, 6), rng);
      knot.translate(0, top + h * 0.075, 0);
      parent.add(meshOf(knot, mat, false, false));
      break;
    }
    case 'bun': {
      const cap = tinted(new SphereGeometry(h * 0.086, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), rng);
      cap.translate(0, top + h * 0.004, 0);
      parent.add(meshOf(cap, mat, false, false));
      const bun = tinted(new TorusGeometry(h * 0.036, h * 0.017, 6, 12), rng);
      bun.rotateX(Math.PI / 2.4);
      bun.translate(0, top + h * 0.02, -h * 0.07);
      parent.add(meshOf(bun, mat, false, false));
      // Binyeo — the long ornamental pin through the bun.
      const pin = new CylinderGeometry(h * 0.005, h * 0.005, h * 0.13, 5);
      pin.rotateZ(Math.PI / 2);
      pin.translate(0, top + h * 0.022, -h * 0.07);
      parent.add(meshOf(pin, surface(0xd8ad4a, { roughness: 0.35, metalness: 0.6 }), false, false));
      break;
    }
    case 'braid': {
      // An unmarried woman wears one thick braid down her back, ribboned at the
      // end. It is a strong read at distance and marks Cheong as unwed.
      const cap = tinted(new SphereGeometry(h * 0.086, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.48), rng);
      cap.translate(0, top + h * 0.004, 0);
      parent.add(meshOf(cap, mat, false, false));

      const braid = new Group();
      braid.name = 'braid';
      braid.position.set(0, top + h * 0.02, -h * 0.06);
      const segments = 5;
      for (let i = 0; i < segments; i++) {
        const k = i / (segments - 1);
        const bead = tinted(new SphereGeometry(h * (0.026 - k * 0.008), 6, 5), rng);
        bead.scale(1, 1.35, 1);
        bead.translate(0, -h * 0.055 * i - h * 0.02, -h * 0.012 * i);
        braid.add(meshOf(bead, mat, false, false));
      }
      const ribbon = new BoxGeometry(h * 0.03, h * 0.075, h * 0.008);
      ribbon.translate(0, -h * 0.055 * segments - h * 0.02, -h * 0.06);
      braid.add(meshOf(ribbon, surface(CLOTH.royalRed, { roughness: 0.9 }), false, false));
      parent.add(braid);
      break;
    }
    case 'child': {
      const cap = tinted(new SphereGeometry(h * 0.09, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.54), rng);
      cap.translate(0, top, 0);
      parent.add(meshOf(cap, mat, false, false));
      break;
    }
    case 'loose': {
      const cap = tinted(new SphereGeometry(h * 0.088, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), rng);
      cap.translate(0, top, 0);
      parent.add(meshOf(cap, mat, false, false));
      // Only the back half. A full cylinder here draws hair straight across
      // the face, which turned Sim's father into a featureless black column in
      // the one shot the whole film is built towards.
      const fall = tinted(
        new CylinderGeometry(h * 0.066, h * 0.052, h * 0.24, 8, 1, true, Math.PI * 0.55, Math.PI * 0.9),
        rng,
      );
      fall.translate(0, top - h * 0.1, -h * 0.012);
      parent.add(meshOf(fall, surface(CLOTH.hair, { roughness: 0.6, doubleSide: true }), false, false));
      break;
    }
  }
}

/**
 * The face.
 *
 * Sized up considerably after the first close shot, where the features were
 * technically present and completely invisible: an eye at h * 0.008 is four
 * millimetres across and vanishes at any distance the camera actually sits at.
 * These are cartoon proportions on purpose — brows included, because a brow is
 * what makes a face read as having an expression at all, and it is the only
 * thing distinguishing grief from blankness at twenty metres.
 *
 * The blind father gets closed lids: a thicker bar with a brow above it, which
 * at a glance is unmistakably "eyes shut" rather than "eyes missing".
 */
function buildFace(parent: Group, h: number, blind: boolean): { closed: Group; open: Group } {
  const eyeY = h * 0.113;
  const z = h * 0.0625;
  const dark = unlit(0x1e1815);
  const brow = unlit(0x2a211c);

  // Both sets of eyes are always built, and one is hidden. Act VIII turns on
  // being able to open them mid-shot — the single most important beat in the
  // story — and swapping visibility is instant, whereas rebuilding the face
  // would drop a frame at exactly the wrong moment.
  const closed = new Group();
  const open = new Group();
  closed.visible = blind;
  open.visible = !blind;
  parent.add(closed, open);

  for (const side of [-1, 1] as const) {
    const lid = new BoxGeometry(h * 0.03, h * 0.0075, h * 0.004);
    lid.translate(side * h * 0.029, eyeY, z);
    const lidMesh = meshOf(lid, dark, false, false);
    lidMesh.rotation.z = side * 0.16;
    closed.add(lidMesh);

    const eye = new SphereGeometry(h * 0.0155, 8, 6);
    eye.scale(1.15, 1, 0.35);
    eye.translate(side * h * 0.029, eyeY, z);
    open.add(meshOf(eye, dark, false, false));

    // A white catchlight, only on open eyes. It is two triangles and it is the
    // difference between "eyes" and "eyes that are looking at something".
    const glint = new SphereGeometry(h * 0.005, 5, 4);
    glint.translate(side * h * 0.029 + h * 0.005, eyeY + h * 0.004, z + h * 0.006);
    open.add(meshOf(glint, unlit(0xf4f0e6), false, false));

    const browGeo = new BoxGeometry(h * 0.034, h * 0.0065, h * 0.004);
    browGeo.translate(side * h * 0.03, eyeY + h * 0.028, z * 0.97);
    const browMesh = meshOf(browGeo, brow, false, false);
    // Angled slightly inward-down: neutral-to-sorrowful, which is the register
    // this story lives in almost throughout.
    browMesh.rotation.z = side * -0.12;
    parent.add(browMesh);
  }

  const mouth = new BoxGeometry(h * 0.026, h * 0.0065, h * 0.004);
  mouth.translate(0, h * 0.081, z * 0.98);
  parent.add(meshOf(mouth, unlit(0x6d4038), false, false));

  // A nose, just enough to catch a shadow and give the profile a break.
  const nose = new SphereGeometry(h * 0.013, 6, 5);
  nose.scale(0.8, 1.5, 1.1);
  nose.translate(0, h * 0.098, z * 1.02);
  parent.add(meshOf(nose, surface(0xd0a888, { roughness: 0.75, flat: false }), false, false));

  return { closed, open };
}

function buildHeadwear(parent: Group, kind: Headwear, h: number, rng: Rng): void {
  const top = h * 0.105;
  switch (kind) {
    case 'none':
      break;
    case 'gat': {
      // The gat: a translucent horsehair cylinder on a very wide flat brim.
      // The brim is the whole silhouette, so it is deliberately oversized.
      const gatMat = surface(0x14141a, {
        roughness: 0.55,
        transparent: true,
        opacity: 0.88,
        doubleSide: true,
      });
      const brim = tinted(new CylinderGeometry(h * 0.195, h * 0.205, h * 0.006, 24), rng, 0.02);
      brim.translate(0, top + h * 0.055, 0);
      parent.add(meshOf(brim, gatMat));

      const crown = tinted(new CylinderGeometry(h * 0.062, h * 0.07, h * 0.085, 14, 1, true), rng, 0.02);
      crown.translate(0, top + h * 0.098, 0);
      parent.add(meshOf(crown, gatMat));

      const lid = new CylinderGeometry(h * 0.062, h * 0.062, h * 0.004, 14);
      lid.translate(0, top + h * 0.14, 0);
      parent.add(meshOf(lid, gatMat));

      // Chin cord.
      const cord = new TorusGeometry(h * 0.06, h * 0.003, 4, 12, Math.PI);
      cord.rotateY(Math.PI / 2);
      cord.rotateZ(Math.PI);
      cord.translate(0, top - h * 0.03, 0);
      parent.add(meshOf(cord, surface(0x1a1a20, { roughness: 0.8 }), false, false));
      break;
    }
    case 'monk': {
      // Gokkal — the folded white cone a Korean monk wears in ceremony.
      const cone = tinted(new CylinderGeometry(h * 0.004, h * 0.088, h * 0.16, 4), rng);
      cone.rotateY(Math.PI / 4);
      cone.translate(0, top + h * 0.075, 0);
      parent.add(meshOf(cone, surface(0xe8e2d4, { roughness: 0.95, doubleSide: true })));
      break;
    }
    case 'crown': {
      // Jokduri — the small jewelled coronet of an empress.
      const band = tinted(new CylinderGeometry(h * 0.058, h * 0.07, h * 0.05, 12, 1, true), rng);
      band.translate(0, top + h * 0.082, 0);
      parent.add(meshOf(band, surface(0x2c1a3a, { roughness: 0.5, doubleSide: true })));

      const gold = surface(0xd8ad4a, { roughness: 0.28, metalness: 0.75, flat: false });
      const rim = new TorusGeometry(h * 0.062, h * 0.006, 6, 16);
      rim.rotateX(Math.PI / 2);
      rim.translate(0, top + h * 0.108, 0);
      parent.add(meshOf(rim, gold));

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const jewel = new SphereGeometry(h * 0.011, 6, 5);
        jewel.translate(Math.cos(a) * h * 0.062, top + h * 0.114, Math.sin(a) * h * 0.062);
        parent.add(meshOf(jewel, i % 2 === 0 ? gold : surface(0xc8402f, { roughness: 0.3 })));
      }
      break;
    }
    case 'headband': {
      const band = new TorusGeometry(h * 0.076, h * 0.008, 5, 14);
      band.rotateX(Math.PI / 2);
      band.translate(0, top + h * 0.012, 0);
      parent.add(meshOf(band, surface(0x2a2a30, { roughness: 0.85 }), false, false));
      break;
    }
    case 'kerchief': {
      // The cloth a working woman ties over her hair.
      const profile: Vector2[] = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        profile.push(new Vector2(h * 0.084 * Math.sin(k * Math.PI * 0.55) + h * 0.004, h * 0.075 * k));
      }
      const cloth = new LatheGeometry(profile, 12);
      cloth.translate(0, top - h * 0.01, 0);
      parent.add(
        meshOf(
          tinted(cloth, rng),
          surface(CLOTH.hempWhite, { roughness: 0.95, doubleSide: true }),
          false,
          false,
        ),
      );
      break;
    }
  }
}

function tinted(geo: BufferGeometry, rng: Rng, amount = 0.045): BufferGeometry {
  return applyVertexTint(geo, rng, amount);
}
