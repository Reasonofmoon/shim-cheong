import './styles.css';
import { Box3, Object3D, Quaternion, Vector3 } from 'three';
import { CameraRig } from './core/cameraRig';
import { Director } from './core/director';
import { Stage } from './core/stage';
import { Subtitles } from './core/subtitles';
import { PlayerUi } from './core/ui';
import { NARRATION } from './data/narration';
import { ACTS } from './scenes';

/**
 * Entry point.
 *
 * Two things here are worth more than they look. First, `dt` is clamped: a
 * tab-switch produces a multi-second frame delta, and without the clamp the
 * film would silently jump a whole shot on return. Second, the renderer is
 * sized from `clientWidth`, not `innerWidth`, so the canvas stays correct when
 * it is embedded in a pane rather than filling the window — which is how it
 * gets reviewed.
 */

const canvas = requireEl<HTMLCanvasElement>('stage');
const app = requireEl<HTMLElement>('app');
const overlay = requireEl<HTMLElement>('overlay');
const fade = requireEl<HTMLElement>('fade');
const boot = requireEl<HTMLElement>('boot');
const begin = requireEl<HTMLButtonElement>('begin');

const stage = new Stage(canvas);
const rig = new CameraRig(1);
const subtitles = new Subtitles(overlay);
const ui = new PlayerUi(overlay, ACTS);

const director = new Director(ACTS, NARRATION, stage, rig, subtitles, fade, {
  onActChange: (index, act) => ui.onActChange(index, act),
  onProgress: (a, b, c, d) => ui.onProgress(a, b, c, d),
  onPlayStateChange: (playing) => ui.onPlayStateChange(playing),
});
ui.attach(director);

// ---------------------------------------------------------------- sizing --

function resize(): void {
  const width = Math.max(1, app.clientWidth);
  const height = Math.max(1, app.clientHeight);
  // Cap the device pixel ratio: this scene is fill-rate bound on the ocean and
  // the light shafts, and 3x on a phone costs more than it buys.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  stage.resize(width, height, dpr);
  rig.setAspect(width / height);
}

resize();
window.addEventListener('resize', resize);
if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(app);
}

// ----------------------------------------------------------------- start --

/** Deep-link support: `#indangsu` opens straight into Act V. */
function actFromHash(): number {
  const id = window.location.hash.replace('#', '');
  const index = ACTS.findIndex((act) => act.id === id);
  return index >= 0 ? index : 0;
}

let started = false;

function startFilm(): void {
  if (started) return;
  started = true;
  boot.classList.add('is-gone');
  window.setTimeout(() => {
    boot.style.display = 'none';
  }, 950);
  director.start(actFromHash(), 0);
}

begin.addEventListener('click', startFilm);
window.addEventListener('keydown', (e) => {
  if (!started && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    startFilm();
  }
});

// Build the opening act immediately so the first frame is already composed
// behind the cover — the cover then dissolves onto a picture, not onto black.
director.goTo(actFromHash(), 0);

// ------------------------------------------------------------------ loop --

let last = performance.now();

function frame(now: number): void {
  // 100 ms ceiling: anything longer is a stall, not a slow frame, and should
  // not advance the story.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  director.update(dt);
  stage.render(rig);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/**
 * A tiny hook the review harness uses: it can jump to an exact act and time,
 * pause, and screenshot a specific frame. Being able to do that from outside
 * the page is what made auditing eight acts by eye tractable at all.
 */
declare global {
  interface Window {
    simcheong?: {
      goTo(actIndex: number, time: number): void;
      pause(): void;
      play(): void;
      acts(): Array<{ id: string; title: string; duration: number }>;
      inspect(minSize?: number): Array<Record<string, string>>;
      toggle(name: string, visible?: boolean): boolean;
      facing(name: string): Record<string, string> | null;
      state(): Record<string, string | number | boolean>;
      camera(): Record<string, string>;
    };
  }
}

window.simcheong = {
  goTo(actIndex: number, time: number): void {
    startFilm();
    director.goTo(actIndex, time);
    director.pause();
  },
  pause: () => director.pause(),
  play: () => director.play(),
  acts: () => ACTS.map((a) => ({ id: a.id, title: a.title, duration: a.duration })),

  /**
   * Report every named object in the scene with its world-space bounding box.
   * Written after half an hour spent guessing which object was covering the
   * top-right of Act I — measuring beat guessing by a mile, and it has been
   * the first thing reached for on every composition problem since.
   */
  inspect(minSize = 30): Array<Record<string, string>> {
    const out: Array<Record<string, string>> = [];
    const box = new Box3();
    const size = new Vector3();
    stage.scene.traverse((obj) => {
      if (obj === stage.scene) return;
      const named = obj.name || obj.type;
      if (obj.children.length > 0 && !(obj as { isMesh?: boolean }).isMesh) return;
      box.setFromObject(obj);
      if (box.isEmpty()) return;
      box.getSize(size);
      const extent = Math.max(size.x, size.y, size.z);
      if (extent < minSize) return;
      out.push({
        name: named,
        extent: extent.toFixed(1),
        min: `${box.min.x.toFixed(0)},${box.min.y.toFixed(0)},${box.min.z.toFixed(0)}`,
        max: `${box.max.x.toFixed(0)},${box.max.y.toFixed(0)},${box.max.z.toFixed(0)}`,
      });
    });
    return out.sort((a, b) => Number(b['extent']) - Number(a['extent']));
  },

  /** Toggle any named subtree — the fastest way to identify a mystery object. */
  toggle(name: string, visible?: boolean): boolean {
    let found = false;
    stage.scene.traverse((obj) => {
      if (obj.name !== name) return;
      obj.visible = visible ?? !obj.visible;
      found = true;
    });
    return found;
  },

  /**
   * Is this named object facing the camera?
   *
   * Figures are modelled looking down their local +Z. Reasoning about whether a
   * given `bodyTurn` points a character at the lens involves a rotation
   * convention, a camera pose interpolated mid-shot, and a subject placed
   * relative to a third thing — and getting any one of them backwards produces
   * a shot of the back of someone's head. Measuring takes one call.
   *
   * `dot` is +1 when the object looks straight at the camera and -1 when it
   * looks straight away. Roughly 0.3–0.8 is the three-quarter view most of this
   * film's dialogue-free staging wants.
   */
  facing(name: string): Record<string, string> | null {
    let target: Object3D | null = null;
    stage.scene.traverse((obj) => {
      if (obj.name === name) target = obj;
    });
    if (!target) return null;

    const object = target as Object3D;
    const forward = new Vector3(0, 0, 1)
      .applyQuaternion(object.getWorldQuaternion(new Quaternion()))
      .setY(0)
      .normalize();
    const position = object.getWorldPosition(new Vector3());
    const toCamera = rig.camera.position.clone().sub(position).setY(0).normalize();

    return {
      forward: `${forward.x.toFixed(2)}, ${forward.z.toFixed(2)}`,
      toCamera: `${toCamera.x.toFixed(2)}, ${toCamera.z.toFixed(2)}`,
      dot: forward.dot(toCamera).toFixed(2),
      // How much to add to rotation.y to face the camera dead on.
      correction: (
        Math.atan2(toCamera.x, toCamera.z) - Math.atan2(forward.x, forward.z)
      ).toFixed(2),
    };
  },

  /**
   * The director's own state.
   *
   * Added while chasing a capture bug where a seek silently did nothing. From
   * outside the page it was impossible to tell whether the seek had been
   * refused, applied to the wrong act, or applied and then overwritten — three
   * very different problems that look identical in a screenshot. `transition`
   * is the one that matters most: `goTo` only seeks when no act change is
   * already in flight, so a caller that polls this can wait for the right
   * moment instead of guessing at a sleep duration.
   */
  state(): Record<string, string | number | boolean> {
    return {
      actIndex: director.actIndex,
      actId: director.currentAct.id,
      actTime: Number(director.actTime.toFixed(2)),
      duration: director.currentAct.duration,
      playing: director.isPlaying,
      transitioning: director.isTransitioning,
      built: director.hasBuiltAct,
    };
  },

  /** Where the camera actually is, which the shot list does not directly say. */
  camera(): Record<string, string> {
    const c = rig.camera;
    const dir = new Vector3();
    c.getWorldDirection(dir);
    return {
      pos: `${c.position.x.toFixed(1)}, ${c.position.y.toFixed(1)}, ${c.position.z.toFixed(1)}`,
      dir: `${dir.x.toFixed(2)}, ${dir.y.toFixed(2)}, ${dir.z.toFixed(2)}`,
      fov: c.fov.toFixed(1),
    };
  },
};

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as T;
}
