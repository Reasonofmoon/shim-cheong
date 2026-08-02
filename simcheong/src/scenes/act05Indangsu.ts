import { Color, Group, Vector3 } from 'three';
import { buildFigure, type Figure } from '../builders/figure';
import { Particles } from '../builders/nature';
import { animateShip, buildShip } from '../builders/ship';
import { Motes } from '../builders/undersea';
import { Ocean } from '../builders/water';
import { CLOTH, SEA, SKY } from '../core/palette';
import {
  clamp,
  ease,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  gait,
  lerp,
  pulse,
  span,
} from '../core/timeline';
import { move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act V — 인당수.
 *
 * The crossing. The sea will not let the ship pass, so the merchants give it
 * what they bought. Sim Cheong bows twice towards the west, pulls her skirt
 * over her head, and goes off the bow.
 *
 * This act is built around one cut that does not exist: the camera goes into
 * the water with her, in the same shot. Everything else — the rain, the roll of
 * the hull, the pitch of the sea — is there to make that eight seconds land.
 *
 * The trick that makes it work is that the ocean's wave function is evaluated
 * on the CPU as well as the GPU, so the ship is genuinely riding the surface
 * being drawn. When the deck pitches, the figures standing on it pitch with it,
 * and the horizon behind them tilts by the same amount.
 */

const DURATION = 56;

/** Sea level. Everything in this act is measured from here. */
const SEA_LEVEL = 0;

/** The moment she hits the water. Several systems key off it. */
const IMPACT = 38.6;

// Shot 7 (the fall, below) carries the camera itself through the surface on
// an easeInCubic — slow to start, so the lens actually crosses sea level
// noticeably later than her body does. `WATER_CROSS_T` is that real crossing
// time, derived from the same curve, so the fog/exposure "submerged" switch
// in `update()` can be keyed to when the lens is actually under instead of a
// constant guessed to line up with IMPACT.
const FALL_SHOT_AT = IMPACT - 1.7;
const FALL_SHOT_END = IMPACT + 2.4;
const FALL_CAM_FROM_Y = 3.3;
const FALL_CAM_TO_Y = -7.5;
const WATER_CROSS_T =
  FALL_SHOT_AT +
  Math.cbrt((SEA_LEVEL - FALL_CAM_FROM_Y) / (FALL_CAM_TO_Y - FALL_CAM_FROM_Y)) *
    (FALL_SHOT_END - FALL_SHOT_AT);

export const act05Indangsu: Act = {
  id: 'indangsu',
  chapter: '제5막',
  title: '인당수에 몸을 던지다',
  duration: DURATION,
  sky: SKY.storm,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();

    const ocean = new Ocean({
      size: 620,
      segments: 250,
      amplitude: 0.5,
      choppy: 1,
      shallow: SEA.stormCrest,
      deep: SEA.stormDeep,
      foam: 0xd6e2e4,
      foamAmount: 0.55,
      glossiness: 60,
    });
    ocean.mesh.position.y = SEA_LEVEL;
    root.add(ocean.mesh);

    // No land at all in this act. The floor is the abyss, well below the
    // surface, so a camera under the waves still has something behind the
    // particulate instead of raw fog.
    stage.setFloor(SEA.abyss, -60);

    // ---- The ship -------------------------------------------------------------
    const ship = buildShip(
      {
        length: 15.5,
        beam: 5.0,
        depth: 1.9,
        masts: 1,
        cargo: 8,
        sailColor: 0xc9b894,
        hullColor: 0x8a6f52,
      },
      rng,
    );
    const shipNode = new Group();
    shipNode.add(ship.group);
    root.add(shipNode);

    // ---- Crew ------------------------------------------------------------------
    const crew: Array<{ figure: Figure; x: number; z: number; facing: number; phase: number }> = [];
    const crewSpots: Array<[number, number, number]> = [
      [1.6, -3.2, 0.4],
      [-1.8, -1.4, 2.6],
      [1.9, 1.2, 3.3],
      [-1.7, 3.4, 3.0],
      [0.2, -5.4, 0.0],
      [2.0, 5.0, 2.4],
    ];
    for (let i = 0; i < crewSpots.length; i++) {
      const spot = crewSpots[i] ?? [0, 0, 0];
      const figure = buildFigure(
        {
          height: rng.range(1.62, 1.76),
          sex: 'male',
          jeogori: rng.pick([0xa89a80, 0x8d8471, CLOTH.hempGrey]),
          lower: rng.pick([0x3a4450, 0x4c4436]),
          accent: 0x7a3a2e,
          headwear: 'headband',
          hair: 'topknot',
        },
        rng,
      );
      figure.root.position.set(spot[0], ship.deckY + 0.1, spot[1]);
      ship.group.add(figure.root);
      crew.push({ figure, x: spot[0], z: spot[1], facing: spot[2], phase: rng.next() * 9 });
    }

    // ---- Sim Cheong -------------------------------------------------------------
    const cheong = buildFigure(
      {
        height: 1.56,
        sex: 'female',
        jeogori: CLOTH.cheongJeogori,
        lower: CLOTH.cheongSkirt,
        accent: 0xb03a2e,
        hair: 'braid',
      },
      rng,
    );
    cheong.root.name = 'cheong';
    // She starts on the deck, parented to the ship so she rides its pitch. At
    // the leap she is re-parented to the world, which is the moment the film
    // hands her over to the sea.
    cheong.root.position.set(0, ship.deckY + 0.1, 5.4);
    ship.group.add(cheong.root);
    let aboard = true;

    // ---- Weather -----------------------------------------------------------------
    const rain = new Particles(2200, new Vector3(46, 40, 46), 0.05, 0xc6d6dd, rng, 0.5);
    root.add(rain.mesh);

    const spray = new Particles(700, new Vector3(38, 9, 38), 0.09, 0xdfeaea, rng, 0.55);
    root.add(spray.mesh);

    // Bubbles, only meaningful once the camera is under.
    const bubbles = new Motes(700, new Vector3(16, 30, 16), 0.09, 0xcfeef2, rng, 3.2);
    bubbles.mesh.position.set(0, -30, 0);
    bubbles.setOpacity(0);
    root.add(bubbles.mesh);

    // ---- Camera ---------------------------------------------------------------
    const shots: readonly Shot[] = [
      // 1. A small ship on a very large sea.
      move(
        0,
        [-30, 13, 30, 0, 1, 0],
        [-20, 7.5, 21, 0, 1.5, 0],
        [44, 39],
        easeInOutCubic,
        0.07,
      ),
      // 2. Down to the waterline. The hull is above the lens half the time.
      move(
        9,
        [-14, 3.2, 10, 0, 3.2, 0],
        [-10.5, 3.8, 7.5, 0, 3.4, 0],
        [46, 42],
        easeInOutCubic,
        0.16,
      ),
      // 3. On deck, the crew fighting the sea.
      move(
        16,
        [8.0, 6.4, 9.5, 0, 3.0, -1],
        [6.2, 5.6, 7.4, 0, 2.9, 0],
        [42, 38],
        easeInOutCubic,
        0.14,
      ),
      // 4. She comes forward to the bow. Held, letting her arrive.
      move(
        22.5,
        [5.6, 3.2, 12.6, 0.2, 2.15, 6.2],
        [4.1, 2.9, 10.9, 0.1, 2.1, 6.6],
        [40, 34],
        easeInOutCubic,
        0.1,
      ),
      // 5. The two bows to the west, in profile against the storm.
      move(
        28.5,
        [-4.3, 2.75, 9.0, 0.1, 2.2, 6.7],
        [-3.6, 2.65, 8.4, 0.1, 2.15, 6.75],
        [36, 30],
        easeInOutCubic,
        0.09,
      ),
      // 6. Behind her, looking out at what she is about to enter.
      move(
        34,
        [0.35, 3.1, 10.2, 0.2, 1.9, 1.5],
        [0.3, 2.9, 9.3, 0.2, 1.2, -2.5],
        [40, 46],
        easeInOutCubic,
        0.12,
      ),
      // 7. The fall. The camera goes with her, all the way under.
      {
        at: FALL_SHOT_AT,
        from: [3.3, FALL_CAM_FROM_Y, 10.4, 0.2, 2.5, 6.8],
        to: [2.4, FALL_CAM_TO_Y, 8.8, 0.2, -8.5, 6.4],
        fov: [40, 58],
        ease: easeInCubic,
        handheld: 0.2,
        roll: [0.03, 0.5],
      },
      // 8. Sinking. She falls away from the light.
      move(
        FALL_SHOT_END,
        [2.2, -11, 7.4, 0.2, -13, 6.0],
        [1.6, -19, 6.2, 0.2, -25, 5.6],
        [54, 44],
        easeOutCubic,
        0.06,
      ),
      // 9. Back up. The sea has gone flat, as if nothing happened.
      move(
        47,
        [9, 1.2, 13, 2, 1.6, 2],
        [17, 9, 27, 0, 1.4, -4],
        [44, 40],
        easeInOutCubic,
        0.03,
      ),
    ];

    // ---- Runtime ---------------------------------------------------------------
    const fogColor = new Color();
    const stormSky = new Color(SKY.storm.fog);
    const underwater = new Color(0x0a2530);
    const fallStart = new Vector3();
    let fallCaptured = false;

    return {
      root,

      update({ t, dt }, rig) {
        // --- Sea state -------------------------------------------------------
        // Builds to full fury just before the leap, then drops away to glass in
        // the last few seconds — the detail the story turns on.
        const build = ease(t, 2, 30, easeInOutCubic);
        const calm = ease(t, IMPACT + 1.5, IMPACT + 11, easeOutCubic);
        const storm = clamp(build * (1 - calm * 0.97), 0, 1);
        // Rain and spray are allowed to read as "fierce wind" well before the
        // wave field does. `storm` is deliberately slow through t=9..16 so
        // shot 2's low waterline framing never sees crests near its own
        // camera height (setStorm(1) ~= 3.8-unit crests against a 3.2-3.8
        // camera y — do not raise storm itself to fix this). `wind` gives
        // just the first eight seconds — the window the "물빛이 검고 바람이
        // 사납더라" line is on screen — a fast rise of its own, driving only
        // the particles.
        const wind = Math.max(storm, ease(t, 0, 8, easeOutCubic));
        ocean.update(t, stage);
        ocean.setStorm(storm);
        ocean.setColors(
          storm > 0.4 ? SEA.stormCrest : 0x59808a,
          SEA.stormDeep,
          lerp(0x3d4a52, 0x8fa8b4, calm),
        );

        // --- Ship -------------------------------------------------------------
        // Held near the origin on purpose. The shot list is authored in world
        // space, so a ship that travels leaves frame; the sea streaming past it
        // reads as headway anyway.
        // Station-keeping exactly. Every camera pose from here on is authored
        // against her position at the bow, so the hull must not wander; the sea
        // streaming past it is what sells the headway.
        ocean.float(shipNode, 0, 0, -0.9, 0.5 + storm * 0.3, 0.5);
        animateShip(ship, t, 0.5 + storm * 1.4, storm * 0.3);
        for (const sail of ship.sails) sail.scale.y = clamp(1 - storm * 0.55, 0.3, 1);

        // --- Crew --------------------------------------------------------------
        for (const hand of crew) {
          const brace = 0.35 + storm * 0.5;
          hand.figure.setPose({
            bodyTurn: hand.facing,
            crouch: brace * 0.35,
            spineBend: 0.12 + Math.sin(t * 2.1 + hand.phase) * 0.1 * storm,
            spineLean: Math.sin(t * 1.7 + hand.phase * 1.4) * 0.14 * storm,
            armLSwing: 0.6 + Math.sin(t * 2.6 + hand.phase) * 0.5 * storm,
            armRSwing: 0.6 + Math.cos(t * 2.3 + hand.phase) * 0.5 * storm,
            armLRaise: 0.3 * brace,
            armRRaise: 0.3 * brace,
            elbowL: 1.1,
            elbowR: 1.1,
            headTilt: -0.1,
          });
        }

        // --- Sim Cheong ---------------------------------------------------------
        if (t < IMPACT - 1.7) {
          // Walk to the bow, then the two bows west, then the skirt over the head.
          const approach = ease(t, 21, 26, easeInOutCubic);
          const z = 3.2 + approach * 3.4;
          cheong.root.position.set(0, ship.deckY + 0.1, z);

          if (approach < 0.97 && t > 21) {
            cheong.walk(gait(t, 0.5), 0.42, { bodyTurn: 0, spineLean: Math.sin(t * 1.6) * 0.08 });
          } else {
            // Two deep bows, the second lower than the first.
            const bowA = pulse(t, 28.6, 31.2, 0.35);
            const bowB = pulse(t, 31.8, 34.6, 0.35);
            const bowAmount = Math.max(bowA * 0.85, bowB * 1.0);

            // Then she raises her arms to pull the skirt over her head.
            const cover = ease(t, 35.4, 36.9, easeOutCubic);

            cheong.setPose({
              bodyTurn: -0.35,
              spineBend: bowAmount * 1.2 + cover * 0.1,
              headTilt: bowAmount * 0.35 - cover * 0.25,
              armLSwing: bowAmount * 0.5 + cover * 2.3,
              armRSwing: bowAmount * 0.5 + cover * 2.3,
              armLRaise: bowAmount * 0.26 + cover * 0.5,
              armRRaise: bowAmount * 0.26 + cover * 0.5,
              elbowL: 0.25 + bowAmount * 1.3 + cover * 1.5,
              elbowR: 0.25 + bowAmount * 1.3 + cover * 1.5,
              spineLean: Math.sin(t * 1.4) * 0.05,
            });
          }
        } else {
          // The leap. She leaves the ship's frame of reference entirely.
          if (aboard) {
            ship.group.getWorldPosition(fallStart);
            fallStart.add(new Vector3(0.2, ship.deckY + 0.4, 0));
            ship.group.remove(cheong.root);
            root.add(cheong.root);
            aboard = false;
          }
          if (!fallCaptured) {
            fallCaptured = true;
          }

          const fall = span(t, IMPACT - 1.7, IMPACT);
          const sink = span(t, IMPACT, IMPACT + 9);

          if (fall < 1) {
            // Ballistic-ish arc off the bow, arms still over her head.
            const y = lerp(fallStart.y, SEA_LEVEL, easeInCubic(fall));
            cheong.root.position.set(fallStart.x + fall * 0.6, y, fallStart.z + fall * 1.4);
            cheong.root.rotation.set(fall * 0.5, -0.35, 0);
            cheong.setPose({
              armLSwing: 2.5,
              armRSwing: 2.5,
              armLRaise: 0.4,
              armRRaise: 0.4,
              elbowL: 0.6,
              elbowR: 0.6,
              legLSwing: -0.2 - fall * 0.3,
              legRSwing: -0.1 - fall * 0.2,
              kneeL: fall * 0.4,
              spineBend: 0.1,
            });
          } else {
            // Sinking. Slow, arms drifting up, body turning over.
            const depth = -easeOutCubic(sink) * 26;
            cheong.root.position.set(
              fallStart.x + 0.6 + Math.sin(t * 0.5) * 0.35,
              depth,
              fallStart.z + 1.4 + Math.cos(t * 0.42) * 0.3,
            );
            cheong.root.rotation.set(
              0.5 + sink * 0.6,
              -0.35 + Math.sin(t * 0.3) * 0.25,
              Math.sin(t * 0.37) * 0.2,
            );
            cheong.setPose({
              armLSwing: 2.6 + Math.sin(t * 0.8) * 0.15,
              armRSwing: 2.55 + Math.cos(t * 0.7) * 0.15,
              armLRaise: 0.5,
              armRRaise: 0.5,
              elbowL: 0.35,
              elbowR: 0.4,
              legLSwing: -0.35 + Math.sin(t * 0.6) * 0.1,
              legRSwing: -0.2 + Math.cos(t * 0.55) * 0.1,
              kneeL: 0.3,
              kneeR: 0.2,
            });
          }
        }

        // --- Weather and the shift under the surface --------------------------
        rain.update(dt, t, -2.6 * wind - 0.8);
        rain.setOpacity(0.42 * wind * (1 - span(t, IMPACT - 1.2, IMPACT + 0.6)));
        spray.update(dt, t, -1.6 * wind);
        spray.setOpacity(0.5 * wind * (1 - span(t, IMPACT - 1.2, IMPACT + 0.6)));

        // The whole atmosphere changes as the lens goes under: the fog turns to
        // water, thickens tenfold, and the exposure drops. Keyed to
        // WATER_CROSS_T — when shot 7's own camera curve actually passes sea
        // level — rather than a fixed offset from IMPACT: that curve lags her
        // splash by about a second (easeInCubic is slow off the top), so a
        // window centred on IMPACT flipped the fog to near-full underwater
        // murk (submerged > 0.8, fog density ~0.048) while the lens was still
        // ~1.9 units above the surface, producing a near-black, illegible
        // frame right after impact instead of an above-water shot of the
        // splash.
        const submerged =
          span(t, WATER_CROSS_T - 0.35, WATER_CROSS_T + 0.45) * (1 - span(t, 46.5, 49));
        fogColor.copy(stormSky).lerp(underwater, submerged);
        stage.setFogColor(fogColor);
        stage.setFogDensity(lerp(0.0115 + storm * 0.004, 0.055, submerged));
        stage.setExposure(lerp(0.98, 0.62, submerged) + calm * 0.14);
        stage.setSunHaze(lerp(1, 0.15, submerged));

        bubbles.mesh.position.set(fallStart.x, -30, fallStart.z);
        bubbles.update(dt, t);
        bubbles.setOpacity(submerged * 0.75);

        // --- Lightning ----------------------------------------------------------
        // Three strikes, hand-placed. Each one lifts exposure hard for a few
        // frames and kicks the camera, which sells the thunder without audio.
        const flash =
          pulse(t, 12.4, 12.75, 0.12) * 0.9 +
          pulse(t, 19.8, 20.3, 0.1) * 1.0 +
          pulse(t, 33.1, 33.5, 0.14) * 0.85;
        if (flash > 0.01) {
          stage.setExposure(0.98 + flash * 1.5);
          stage.key.intensity = SKY.storm.sunIntensity + flash * 5.5;
          if (flash > 0.85) rig.impulse(0.35, 2.8);
        } else {
          stage.key.intensity = SKY.storm.sunIntensity * (1 + calm * 0.6);
        }

        // The impact itself.
        if (Math.abs(t - IMPACT) < 0.12) rig.impulse(0.9, 3.2);

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        ocean.dispose();
        rain.dispose();
        spray.dispose();
        bubbles.dispose();
      },
    };
  },
};
