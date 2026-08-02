import { BoxGeometry, CylinderGeometry, Group, PlaneGeometry, Vector3 } from 'three';
import { buildFigure } from '../builders/figure';
import { meshOf, stillWater, surface } from '../builders/materials';
import {
  buildBamboo,
  buildRidgelines,
  buildRocks,
  buildTerrain,
  rollingHills,
  scatterPines,
  type HeightFn,
} from '../builders/nature';
import { buildBell, buildHall, buildLantern, buildPagoda, buildStoneLantern } from '../builders/temple';
import { buildCane, buildStrawMat } from '../builders/props';
import { CLOTH, NATURE, OBANG, SKY } from '../core/palette';
import { clamp, ease, easeInOutCubic, easeOutCubic, gait, pulse, span } from '../core/timeline';
import { hold, move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act III — 공양미 삼백 석.
 *
 * Sim Hakgyu, waiting for a daughter who is late home, wanders out and falls
 * into the stream. A monk from Mongunsa pulls him out and tells him that three
 * hundred sacks of rice offered to the Buddha would restore his sight. He
 * promises it on the spot — a man with no rice at all — and only understands
 * what he has done on the walk home.
 *
 * Visually this is the film's one night piece. There is almost no sun; the act
 * is carried by lantern light, which means the composition is really a question
 * of where the pools of light are and how far apart. The path of lanterns from
 * the stream up to the hall is the whole set.
 */

const DURATION = 50;

const HALL_POS = new Vector3(0, 0, -14);
const STREAM_Z = 20;

export const act03Vow: Act = {
  id: 'vow',
  chapter: '제3막',
  title: '공양미 삼백 석',
  duration: DURATION,
  sky: SKY.templeDusk,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();

    // The mountain rises towards the hall, so the walk up to the temple is
    // literally uphill and the camera can look down the path on the way back.
    const base = rollingHills(1.3, 0.03, 133);
    const height: HeightFn = (x, z) => base(x, z) + clamp((STREAM_Z - z) * 0.12, -1, 4.4);

    root.add(
      buildTerrain(
        {
          size: 300,
          segments: 130,
          height,
          color: 0x3e4436,
          highColor: 0x59563f,
          highStart: 0,
          highEnd: 4,
          tint: 0.08,
        },
        rng,
      ),
    );
    stage.setFloor(0x3a4034, -0.5);
    root.add(buildRidgelines(6, 200, rng, 0x2f3a4a, 0x6b7086));
    root.add(scatterPines(56, 140, height, rng, 26));
    root.add(buildRocks(30, 60, rng, 1.1));

    const grove = buildBamboo(rng, 22, 1.3);
    grove.position.set(-19, height(-19, 2), 2);
    root.add(grove);

    // ---- The stream he falls into ------------------------------------------
    const streamY = height(0, STREAM_Z) + 0.05;
    const water = new PlaneGeometry(90, 5.4, 1, 1).rotateX(-Math.PI / 2);
    water.translate(0, streamY, STREAM_Z);
    root.add(
      meshOf(
        water,
        stillWater(0x1b2c33, 0x6a5a72, 0.22),
        false,
        false,
      ),
    );

    // A plank bridge, one board wide, which is how he came to fall off it.
    const plankMat = surface(NATURE.timber, { roughness: 0.92 });
    for (let i = 0; i < 3; i++) {
      const plank = new BoxGeometry(0.55, 0.1, 6.6);
      plank.translate(-0.6 + i * 0.6, streamY + 0.28, STREAM_Z);
      root.add(meshOf(plank, plankMat));
    }
    for (const z of [STREAM_Z - 2.6, STREAM_Z + 2.6]) {
      const pile = new CylinderGeometry(0.11, 0.13, 1.0, 6);
      pile.translate(0, streamY - 0.2, z);
      root.add(meshOf(pile, plankMat, true, false));
    }

    // ---- The temple ---------------------------------------------------------
    const hall = buildHall(
      { kan: 3, kanWidth: 3.2, depth: 6.4, columnHeight: 3.5, doubleRoof: true, litInterior: 0.85 },
      rng,
    );
    hall.group.position.set(HALL_POS.x, height(HALL_POS.x, HALL_POS.z), HALL_POS.z);
    root.add(hall.group);

    const pagoda = buildPagoda(5, rng, 1.05);
    pagoda.position.set(7.5, height(7.5, -5), -5);
    root.add(pagoda);

    const bell = buildBell(rng, 1.15);
    bell.group.position.set(-9.5, height(-9.5, -4.5), -4.5);
    bell.group.rotation.y = 0.5;
    root.add(bell.group);

    const mat = buildStrawMat(2.4, 1.8, rng);
    mat.position.set(0, height(0, -6.4) + 0.02, -6.4);
    root.add(mat);

    // ---- Lanterns -----------------------------------------------------------
    // A double row up the path. This is the set: everything else is context.
    const lanternColors = [OBANG.jeok, OBANG.hwang, 0xe07a3a, 0xd8556a, 0xe0a838];
    const lanterns: Array<{ core: Group; phase: number; base: number }> = [];

    for (let i = 0; i < 16; i++) {
      const k = i / 15;
      const z = STREAM_Z - 3 - k * 22;
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (2.4 + Math.sin(k * 4) * 0.4);
      const y = height(x, z);

      // Every third one hangs from a pole; the rest are stone lanterns, which
      // keeps the row from reading as a string of identical beads.
      //
      // i === 8 and i === 14 are excluded even though they land on that
      // third: their (x, z) sit almost exactly on the camera-to-subject
      // sightline of shot 3 (climbing the path, ~t20) and shot 4 (the vow,
      // ~t27) respectively. A hanging paper lantern there — tall, at head
      // height, with a large glowing shell — blooms into a blown-out blob
      // right over the walkers' heads and, worse, a near-camera occluder
      // that splits the frame during the kneel. A stone lantern at the same
      // spot is shorter and its flame is a small point mostly hooded by the
      // stone housing, so it reads as path light instead of eating the shot.
      if (i % 3 === 2 && i !== 8 && i !== 14) {
        const post = new CylinderGeometry(0.055, 0.07, 2.9, 6);
        post.translate(x, y + 1.45, z);
        root.add(meshOf(post, surface(0x4a3a2a, { roughness: 0.95 }), true, false));
        const arm = new CylinderGeometry(0.04, 0.04, 0.8, 5).rotateZ(Math.PI / 2);
        arm.translate(x - side * 0.4, y + 2.86, z);
        root.add(meshOf(arm, surface(0x4a3a2a, { roughness: 0.95 }), false, false));

        const lantern = buildLantern(lanternColors[i % lanternColors.length] ?? OBANG.jeok, rng, 1.15);
        lantern.group.position.set(x - side * 0.78, y + 2.62, z);
        root.add(lantern.group);
        lanterns.push({ core: lantern.core, phase: rng.range(0, Math.PI * 2), base: lantern.light.intensity });
      } else {
        const stone = buildStoneLantern(rng, 0.95);
        stone.group.position.set(x, y, z);
        stone.group.rotation.y = rng.range(0, Math.PI);
        root.add(stone.group);
        lanterns.push({ core: stone.core, phase: rng.range(0, Math.PI * 2), base: stone.light.intensity });
      }
    }

    // A canopy of hanging lanterns over the courtyard in front of the hall.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 4.6 + rng.range(-0.5, 0.9);
      const x = HALL_POS.x + Math.cos(a) * r;
      const z = HALL_POS.z + 5.5 + Math.sin(a) * r * 0.55;
      const lantern = buildLantern(lanternColors[i % lanternColors.length] ?? OBANG.hwang, rng, 1.0);
      lantern.group.position.set(x, height(x, z) + 3.4 + rng.range(-0.3, 0.3), z);
      root.add(lantern.group);
      lanterns.push({ core: lantern.core, phase: rng.range(0, Math.PI * 2), base: lantern.light.intensity });
    }

    // ---- The two men --------------------------------------------------------
    const father = buildFigure(
      {
        height: 1.66,
        sex: 'male',
        // Soaked: his hemp has gone dark and clings.
        jeogori: 0x8f8676,
        lower: 0x6e6857,
        accent: 0x6a6152,
        hair: 'topknot',
        blind: true,
      },
      rng,
    );
    father.root.name = 'father';
    root.add(father.root);

    const cane = buildCane(rng, 1.25);
    cane.position.set(-0.26, 0.95, 0.08);
    father.root.add(cane);

    const monk = buildFigure(
      {
        height: 1.72,
        sex: 'male',
        jeogori: CLOTH.monkGrey,
        lower: CLOTH.monkGrey,
        accent: CLOTH.monkKasaya,
        hair: 'shaved',
        headwear: 'none',
        kasaya: CLOTH.monkKasaya,
      },
      rng,
    );
    monk.root.name = 'monk';
    root.add(monk.root);

    stage.focusShadows(new Vector3(0, 2, 2), 30);

    // ---- Camera -------------------------------------------------------------
    const gStream = height(0, STREAM_Z - 2);
    const gCourt = height(0, -6);

    const shots: readonly Shot[] = [
      // 1. The whole mountain, the path of lights climbing it.
      move(
        0,
        [16, gCourt + 13, 40, 0, gCourt + 5, 4],
        [9, gCourt + 9, 32, 0, gCourt + 4, 0],
        [42, 37],
        easeInOutCubic,
        0.035,
      ),
      // 2. The monk hauling him out of the stream.
      move(
        9.5,
        [6.6, gStream + 2.1, 24.5, 0.2, gStream + 1.0, 19.4],
        [5.4, gStream + 1.85, 23.4, 0.2, gStream + 1.0, 19.4],
        [40, 35],
        easeInOutCubic,
        0.06,
      ),
      // 3. Climbing the lantern path together.
      move(
        16.5,
        [7.4, gCourt + 2.4, 14.0, 0, gCourt + 1.4, 6],
        [5.6, gCourt + 2.2, 10.5, 0, gCourt + 1.4, 1],
        [44, 40],
        easeInOutCubic,
        0.05,
      ),
      // 4. The promise. Two men, one kneeling, lanterns behind.
      move(
        23,
        [4.6, gCourt + 1.55, -1.2, 0.1, gCourt + 1.15, -5.6],
        [3.6, gCourt + 1.42, -2.2, -0.1, gCourt + 1.1, -5.6],
        [38, 31],
        easeInOutCubic,
        0.04,
      ),
      // 5. He turns away, and only now does it land.
      move(
        32,
        [-2.4, gCourt + 1.6, -0.6, 1.4, gCourt + 1.35, -3.4],
        [-2.0, gCourt + 1.52, 0.6, 0.6, gCourt + 1.3, -3.0],
        [34, 28],
        easeInOutCubic,
        0.055,
      ),
      // 6. Down the path alone, the lanterns going on without him.
      move(
        39.5,
        [3.0, gCourt + 2.6, 6.5, -0.5, gCourt + 1.3, 12],
        [4.2, gCourt + 4.2, 3.0, 0, gCourt + 1.2, 16],
        [40, 44],
        easeInOutCubic,
        0.04,
      ),
      // 7. Wide, night closing, the bell struck.
      hold(45.5, [14, gCourt + 8, 26, -1, gCourt + 3.2, 2], 46, 0.02),
    ];

    return {
      root,

      update({ t }, rig) {
        // --- Staging -------------------------------------------------------
        // Beat 1: hauled from the stream. Beat 2: up the path. Beat 3: the
        // promise at the hall. Beat 4: back down alone.
        const climb = ease(t, 15, 22, easeInOutCubic);
        const leave = ease(t, 33, 47, easeInOutCubic);

        const pathZ = (k: number): number => STREAM_Z - 2.5 - k * 14.5;

        if (t < 15) {
          const rise = ease(t, 9, 14, easeOutCubic);
          const fx = 0.9;
          const fz = STREAM_Z - 0.4 - rise * 1.6;
          father.root.position.set(fx, height(fx, fz), fz);
          father.setPose({
            bodyTurn: 2.9,
            // Streaming wet and only half upright until the monk gets him up.
            crouch: 0.85 - rise * 0.75,
            spineBend: 0.75 - rise * 0.5,
            headTilt: 0.3 - rise * 0.22,
            armLSwing: 1.15 - rise * 0.5,
            armRSwing: 0.95 - rise * 0.35,
            elbowL: 1.2,
            elbowR: 1.4,
          });

          const mx = -0.5;
          const mz = STREAM_Z - 1.9;
          monk.root.position.set(mx, height(mx, mz), mz);
          monk.setPose({
            bodyTurn: 0.35,
            spineBend: 0.55 - rise * 0.45,
            armLSwing: 1.35,
            armRSwing: 1.25,
            armLRaise: 0.3,
            armRRaise: 0.25,
            elbowL: 0.5,
            elbowR: 0.55,
          });
        } else if (t < 23) {
          const step = gait(t, 0.6);
          const fz = pathZ(climb);
          father.root.position.set(0.85, height(0.85, fz), fz);
          father.walk(step, 0.4, { bodyTurn: Math.PI, spineBend: 0.14, headTilt: 0.05 });

          const mz = pathZ(climb) - 1.1;
          monk.root.position.set(-0.55, height(-0.55, mz), mz);
          monk.walk(step + 0.4, 0.62, { bodyTurn: Math.PI });
        } else if (t < 33) {
          // The promise. He goes down; the monk stands and gives it to him.
          const kneel = ease(t, 23.5, 27, easeOutCubic);
          const fz = -5.4;
          father.root.position.set(0.7, height(0.7, fz), fz);
          father.kneel(kneel * 0.92, {
            bodyTurn: 3.05,
            headTilt: kneel * 0.3 + Math.sin(t * 0.5) * 0.04,
          });

          const mz = -7.6;
          monk.root.position.set(-0.5, height(-0.5, mz), mz);
          // One hand raised in the teaching gesture, held steady.
          const speak = ease(t, 24, 27, easeOutCubic);
          monk.setPose({
            bodyTurn: 0.15,
            headTilt: -0.06,
            armRSwing: 0.35 + speak * 0.85,
            armRRaise: 0.2 + speak * 0.35,
            elbowR: 1.35,
            armLSwing: 0.28,
            elbowL: 0.55,
            spineBend: -0.03 + Math.sin(t * 0.6) * 0.02,
          });
        } else {
          const step = gait(t, 0.5);
          const fz = -4.6 + leave * 22;
          const fx = 0.7 + Math.sin(leave * 3) * 0.5;
          father.root.position.set(fx, height(fx, fz), fz);

          // He stops twice on the way down. A man doing arithmetic he already
          // knows the answer to.
          const halt = pulse(t, 36, 39.5, 0.3) * 0.8 + pulse(t, 43, 45.5, 0.3) * 0.9;
          if (halt > 0.5) {
            father.setPose({
              bodyTurn: 0.1,
              spineBend: 0.24,
              headTilt: 0.2,
              armLSwing: 0.6,
              armRSwing: 0.75,
              armLRaise: 0.12,
              elbowL: 1.5,
              elbowR: 1.6,
            });
          } else {
            father.walk(step, 0.36, { bodyTurn: 0.1, spineBend: 0.2, headTilt: 0.12 });
          }

          // The monk stays where he was, becoming a small figure at the hall.
          monk.root.position.set(-0.5, height(-0.5, -7.6), -7.6);
          monk.idle(t, 0.5, { bodyTurn: 0.15 });
        }

        // --- Lanterns --------------------------------------------------------
        // Flame flicker, slightly out of phase with each other, plus a swing on
        // the hanging ones. Two sines beat against each other so the rhythm
        // never becomes visibly periodic.
        for (const lantern of lanterns) {
          const flicker =
            0.86 +
            Math.sin(t * 5.3 + lantern.phase) * 0.08 +
            Math.sin(t * 11.7 + lantern.phase * 2.3) * 0.06;
          lantern.core.scale.setScalar(1 + (flicker - 0.9) * 0.12);
          lantern.core.rotation.z = Math.sin(t * 0.9 + lantern.phase) * 0.045;
          lantern.core.rotation.x = Math.cos(t * 0.78 + lantern.phase * 1.7) * 0.04;
          const light = lantern.core.children.find(
            (child) => (child as { isLight?: boolean }).isLight,
          ) as { intensity: number } | undefined;
          if (light) light.intensity = lantern.base * flicker;
        }

        // The bell swings once when it is struck, near the end.
        const strike = pulse(t, 45.5, 50, 0.06);
        bell.bell.rotation.z = Math.sin(t * 9) * 0.03 * strike;
        if (strike > 0.9) rig.impulse(0.1, 1.4);

        // Dusk deepens across the act.
        stage.setExposure(1.05 - span(t, 20, 50) * 0.2);
        stage.setFogDensity(0.0062 + span(t, 24, 50) * 0.004);

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        // Geometry only; the director releases it.
      },
    };
  },
};
