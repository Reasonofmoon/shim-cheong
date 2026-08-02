import { PerspectiveCamera, Vector3 } from 'three';
import { fbm1 } from './rng';
import { clamp, lerp } from './timeline';

const tmpPos = new Vector3();
const tmpTarget = new Vector3();
const tmpOffset = new Vector3();
const tmpRight = new Vector3();
const tmpUp = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);

/**
 * The camera the whole film looks through.
 *
 * Acts pose it declaratively — they compute an exact position and target for
 * time `t` and call {@link place}. The rig then layers the things that are
 * annoying to express as pure functions on top: operator handshake, roll, and
 * decaying impact shakes. Keeping those here means an act can be scrubbed to any
 * time and still look right, while the camera still feels physically operated.
 */
export class CameraRig {
  readonly camera: PerspectiveCamera;

  private handheldAmp = 0;
  private handheldFreq = 0.7;
  private shakeEnergy = 0;
  private shakeDecay = 2.4;
  private roll = 0;
  private clock = 0;
  private seed = 0;

  /** When > 0, the camera chases its target pose instead of snapping to it. */
  private smoothing = 0;
  private readonly smoothedPos = new Vector3();
  private readonly smoothedTarget = new Vector3();
  private smoothingPrimed = false;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(42, aspect, 0.25, 2000);
    this.camera.position.set(0, 4, 14);
  }

  /** Called once per frame by the director, before the act updates. */
  tick(dt: number): void {
    this.clock += dt;
    this.shakeEnergy = Math.max(0, this.shakeEnergy - this.shakeDecay * dt * this.shakeEnergy);
    if (this.shakeEnergy < 0.0005) this.shakeEnergy = 0;
  }

  /** Reset all layered state. The director calls this between acts. */
  reset(seed: number): void {
    this.handheldAmp = 0;
    this.handheldFreq = 0.7;
    this.shakeEnergy = 0;
    this.roll = 0;
    this.smoothing = 0;
    this.smoothingPrimed = false;
    this.seed = seed;
    this.camera.fov = 42;
    this.camera.updateProjectionMatrix();
  }

  /** Amount of low-frequency operator drift, in world units. */
  setHandheld(amplitude: number, frequency = 0.7): void {
    this.handheldAmp = amplitude;
    this.handheldFreq = frequency;
  }

  /** Kick the camera. Used for thunder, the hull striking water, the drum. */
  impulse(strength: number, decay = 2.4): void {
    this.shakeEnergy = Math.max(this.shakeEnergy, strength);
    this.shakeDecay = decay;
  }

  /** Dutch angle, in radians. The storm act leans on this hard. */
  setRoll(radians: number): void {
    this.roll = radians;
  }

  /**
   * Chase the posed target instead of snapping. `k` is a per-second convergence
   * rate; 0 disables. Useful when an act wants the camera to feel like it is
   * lagging behind something fast, without hand-authoring the lag.
   */
  setSmoothing(k: number): void {
    this.smoothing = k;
  }

  setFov(fov: number): void {
    if (Math.abs(this.camera.fov - fov) > 1e-4) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Place the camera for this frame. Handheld, shake and roll are added here. */
  place(
    px: number,
    py: number,
    pz: number,
    tx: number,
    ty: number,
    tz: number,
    fov?: number,
  ): void {
    tmpPos.set(px, py, pz);
    tmpTarget.set(tx, ty, tz);
    if (fov !== undefined) this.setFov(fov);

    if (this.smoothing > 0) {
      if (!this.smoothingPrimed) {
        this.smoothedPos.copy(tmpPos);
        this.smoothedTarget.copy(tmpTarget);
        this.smoothingPrimed = true;
      }
      const k = clamp(this.smoothing, 0, 1);
      this.smoothedPos.lerp(tmpPos, k);
      this.smoothedTarget.lerp(tmpTarget, k);
      tmpPos.copy(this.smoothedPos);
      tmpTarget.copy(this.smoothedTarget);
    }

    // Build a camera-local basis so the shake reads as operator movement rather
    // than as the world sliding around underneath a fixed camera.
    tmpOffset.copy(tmpTarget).sub(tmpPos).normalize();
    tmpRight.crossVectors(tmpOffset, WORLD_UP).normalize();
    tmpUp.crossVectors(tmpRight, tmpOffset).normalize();

    const s = this.seed;
    const ht = this.clock * this.handheldFreq;
    const drift = this.handheldAmp;
    const shake = this.shakeEnergy;
    const st = this.clock * 23;

    const lateral =
      fbm1(ht, s + 1) * drift + fbm1(st, s + 11) * shake * 0.55;
    const vertical =
      fbm1(ht + 37, s + 2) * drift * 0.8 + fbm1(st + 53, s + 12) * shake * 0.55;
    const dolly = fbm1(ht + 71, s + 3) * drift * 0.4;

    tmpPos.addScaledVector(tmpRight, lateral).addScaledVector(tmpUp, vertical);
    tmpPos.addScaledVector(tmpOffset, dolly);

    // The target gets a fraction of the same wobble, so the framing breathes
    // instead of pivoting around a nailed-down point.
    tmpTarget
      .addScaledVector(tmpRight, lateral * 0.25)
      .addScaledVector(tmpUp, vertical * 0.25);

    this.camera.position.copy(tmpPos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(tmpTarget);
    if (this.roll !== 0 || shake > 0) {
      this.camera.rotateZ(this.roll + fbm1(st + 91, s + 13) * shake * 0.06);
    }
  }

  /** Convenience: place on a circle around `center` at `angle` radians. */
  orbit(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    angle: number,
    height: number,
    lookHeight = 0,
    fov?: number,
  ): void {
    this.place(
      cx + Math.cos(angle) * radius,
      cy + height,
      cz + Math.sin(angle) * radius,
      cx,
      cy + lookHeight,
      cz,
      fov,
    );
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Linear blend between two poses — sugar for the many A→B dolly moves. */
  static blend(a: readonly number[], b: readonly number[], t: number, out: number[]): void {
    for (let i = 0; i < 6; i++) {
      out[i] = lerp(a[i] ?? 0, b[i] ?? 0, t);
    }
  }
}
