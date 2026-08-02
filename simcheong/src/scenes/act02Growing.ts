import { Group, Vector3 } from 'three';
import { buildFigure, type Figure } from '../builders/figure';
import { buildHomestead, buildVillageMarker, buildWell } from '../builders/hanok';
import {
  buildBamboo,
  buildRidgelines,
  buildRocks,
  buildTerrain,
  buildWillow,
  rollingHills,
  scatterPines,
} from '../builders/nature';
import { buildGourdBowl, buildCane, buildJige, buildWaterJar } from '../builders/props';
import { CLOTH, SKY } from '../core/palette';
import { clamp, ease, easeInOutCubic, easeOutCubic, gait, lerp, pulse, span } from '../core/timeline';
import { hold, move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act II — 동냥젖으로 자란 청이.
 *
 * The one warm stretch of the story. Sim Hakgyu carries his newborn from door
 * to door begging milk; the women of Dohwadong feed her; and she grows into a
 * girl of fifteen who has become her blind father's eyes.
 *
 * The act has to cover fifteen years in fifty seconds. Rather than dissolve or
 * cut, it does it in one continuous space: the first half plays around the well
 * with an infant, and after a held wide the same village is shown again with a
 * grown daughter in it. The village does not change, which is the point — she
 * did, and he did not.
 */

const DURATION = 50;

/** The act's hinge: before this, an infant; after, a girl of fifteen. */
const YEARS_PASS = 23;

const WELL_POS = new Vector3(2.5, 0, 4);

interface Villager {
  readonly figure: Figure;
  readonly home: Vector3;
  readonly facing: number;
  readonly phase: number;
}

export const act02Growing: Act = {
  id: 'growing',
  chapter: '제2막',
  title: '동냥젖으로 자란 청이',
  duration: DURATION,
  sky: SKY.villageNoon,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();
    const height = rollingHills(1.1, 0.026, 77);

    // ---- Dohwadong --------------------------------------------------------
    root.add(
      buildTerrain(
        {
          size: 320,
          segments: 120,
          height,
          color: 0x6f7f45,
          highColor: 0x93924f,
          highStart: -0.2,
          highEnd: 1.1,
          tint: 0.08,
        },
        rng,
      ),
    );
    stage.setFloor(0x7a8348, -0.5);
    root.add(buildRidgelines(5, 210, rng, 0x63795f, 0xa8bccb));
    root.add(scatterPines(42, 145, height, rng, 40));
    root.add(buildRocks(18, 70, rng, 0.75));

    // Three homesteads around a common yard. Sim's is the poorest and stands a
    // little apart, which is how the staging says "them" and "him" without a
    // word of it.
    const homes: Array<{ door: Vector3 }> = [];
    const layout: Array<[number, number, number, number]> = [
      [-13, -9, 0.5, 3],
      [11, -11, -0.55, 3],
      [17, 5, -1.35, 2],
    ];
    for (const [x, z, rot, kan] of layout) {
      const home = buildHomestead(rng, { kan, roofing: 'thatch', weathered: rng.range(0.2, 0.5) });
      home.group.position.set(x, height(x, z), z);
      home.group.rotation.y = rot;
      root.add(home.group);
      homes.push({ door: home.door.clone().add(new Vector3(x, height(x, z), z)) });
    }

    const simHome = buildHomestead(rng, {
      kan: 2,
      roofing: 'thatch',
      weathered: 0.75,
      depth: 3.6,
    });
    simHome.group.position.set(-16, height(-16, 13), 13);
    simHome.group.rotation.y = 1.05;
    root.add(simHome.group);

    const well = buildWell(rng);
    well.position.set(WELL_POS.x, height(WELL_POS.x, WELL_POS.z), WELL_POS.z);
    root.add(well);

    const marker = buildVillageMarker(rng);
    marker.position.set(-24, height(-24, 24), 24);
    marker.rotation.y = 0.6;
    root.add(marker);

    // Willows by the well, bamboo behind the houses. `buildPersimmon()` is
    // deliberately a bare tree hung with fruit — Act 1's late-autumn,
    // hardship register (see its doc comment) — which is the wrong symbol
    // for this act's one warm stretch of the story, so it stays out of here.
    const willows: Array<{ fronds: Group; phase: number }> = [];
    for (const [x, z] of [
      [8, 9],
      [-6, 12],
      [14, 14],
    ] as const) {
      const willow = buildWillow(rng, rng.range(0.9, 1.25));
      willow.group.position.set(x, height(x, z), z);
      root.add(willow.group);
      willows.push({ fronds: willow.fronds, phase: rng.range(0, Math.PI * 2) });
    }

    const bamboo = buildBamboo(rng, 16, 1.15);
    bamboo.position.set(24, height(24, -6), -6);
    root.add(bamboo);

    // ---- The father, in both halves of the act ----------------------------
    const father = buildFigure(
      {
        height: 1.66,
        sex: 'male',
        jeogori: CLOTH.hempWhite,
        lower: CLOTH.hempGrey,
        accent: 0x9a8a6a,
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

    // The infant, carried in a sling — only present in the first half.
    const infantRig = new Group();
    const infant = buildFigure(
      { height: 0.44, sex: 'female', jeogori: CLOTH.hempWhite, lower: CLOTH.hempWhite, hair: 'child' },
      rng,
    );
    infant.root.rotation.x = -1.3;
    infant.root.position.set(0, 0.08, 0.18);
    infantRig.add(infant.root);
    infantRig.position.set(0.03, 0.8, 0.26);
    father.root.add(infantRig);

    const bowl = buildGourdBowl(rng, 1);
    bowl.position.set(0.3, 0.86, 0.2);
    father.root.add(bowl);

    // ---- Sim Cheong at fifteen — only present in the second half ----------
    const cheong = buildFigure(
      {
        height: 1.54,
        sex: 'female',
        jeogori: CLOTH.cheongJeogori,
        lower: CLOTH.cheongSkirt,
        accent: 0xb03a2e,
        hair: 'braid',
      },
      rng,
    );
    cheong.root.name = 'cheong';
    cheong.root.visible = false;
    root.add(cheong.root);

    const jar = buildWaterJar(rng, 1.05);
    jar.position.set(0, 1.62, 0);
    cheong.root.add(jar);

    // ---- Neighbours -------------------------------------------------------
    const villagers: Villager[] = [];
    const spots: Array<[number, number, number]> = [
      [1.0, 6.2, -1.5],
      [4.2, 6.0, -2.1],
      [-1.4, 4.6, -0.9],
      [5.6, 2.6, 2.6],
      [-2.2, 1.4, 1.9],
    ];
    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i] ?? [0, 0, 0];
      const female = i < 3;
      const figure = buildFigure(
        {
          height: female ? rng.range(1.5, 1.6) : rng.range(1.62, 1.72),
          sex: female ? 'female' : 'male',
          jeogori: CLOTH.hempWhite,
          lower: female ? rng.pick([0x6a7c8a, 0x7d6a52, 0x51603f]) : CLOTH.hempGrey,
          accent: rng.pick([0xb03a2e, 0x35566e, 0x8a6a2e]),
          headwear: female ? 'kerchief' : 'gat',
          hair: female ? 'bun' : 'topknot',
        },
        rng,
      );
      const x = spot[0];
      const z = spot[1];
      figure.root.position.set(x, height(x, z), z);
      root.add(figure.root);
      villagers.push({
        figure,
        home: new Vector3(x, height(x, z), z),
        facing: spot[2],
        phase: rng.next() * 10,
      });
    }

    // One man with a jige, because a Korean village always has one.
    const porter = villagers[3];
    if (porter) {
      const jige = buildJige(rng, 0.95, true);
      jige.position.set(0, 0.5, -0.22);
      porter.figure.root.add(jige);
    }

    stage.focusShadows(new Vector3(0, 0, 4), 34);

    // ---- Camera -------------------------------------------------------------
    const gWell = height(WELL_POS.x, WELL_POS.z);
    const gPath = height(-6, 16);

    const shots: readonly Shot[] = [
      // 1. The village, warm and whole.
      move(
        0,
        [-26, gWell + 12, 30, -2, gWell + 3, 2],
        [-18, gWell + 8.5, 24, 0, gWell + 2.4, 2],
        [40, 36],
        easeInOutCubic,
        0.035,
      ),
      // 2. Him at the door, asking.
      move(
        9.5,
        [-6.5, gWell + 1.62, 10.5, -0.4, gWell + 1.3, 5.6],
        [-5.2, gWell + 1.55, 9.6, -0.2, gWell + 1.28, 5.6],
        [38, 33],
        easeInOutCubic,
        0.05,
      ),
      // 3. The women at the well take the child.
      move(
        16.5,
        [7.2, gWell + 1.9, 11.4, 2.2, gWell + 1.15, 5.4],
        [6.0, gWell + 1.7, 10.2, 2.2, gWell + 1.1, 5.4],
        [36, 31],
        easeInOutCubic,
        0.045,
      ),
      // 4. Hold wide. Fifteen years pass across this cut.
      move(
        22.2,
        [-14, gWell + 7, 26, 0, gWell + 2, 4],
        [-15, gWell + 7.6, 27.5, 0, gWell + 2, 4],
        44,
        easeInOutCubic,
        0.02,
      ),
      // 5. She is grown, and she is leading him.
      move(
        27.5,
        [3.4, gPath + 1.6, 15.6, -5.2, gPath + 1.25, 15.0],
        [1.2, gPath + 1.52, 15.2, -6.6, gPath + 1.2, 15.4],
        [40, 35],
        easeInOutCubic,
        0.05,
      ),
      // 6. Following them home, low and close behind.
      move(
        36,
        [1.0, gPath + 1.35, 20.5, -9, gPath + 1.3, 14],
        [-3.2, gPath + 1.3, 19.0, -13, gPath + 1.25, 13.4],
        [42, 40],
        easeInOutCubic,
        0.055,
      ),
      // 7. Pull back and let the village hold them.
      hold(44.5, [-9, gPath + 6.5, 30, -10, gPath + 1.6, 12], 46, 0.025),
    ];

    // ---- Runtime -----------------------------------------------------------
    return {
      root,

      update({ t }, rig) {
        const grown = t >= YEARS_PASS;
        infantRig.visible = !grown;
        bowl.visible = !grown;
        cheong.root.visible = grown;

        // The fifteen-year jump lands right here, and a bare visibility swap
        // read as a glitch — infant gone, daughter there, nothing in between.
        // `yearsFlash` washes the village out in a rise-and-fall of light and
        // fog centred on the swap, wide enough that both halves settle into a
        // held, breath-holding stillness on either side of it instead of being
        // caught mid-gesture. `stillness` damps the idle sway during that
        // window so the hold actually reads as a hold.
        const HINGE_HALF = 1.3;
        const yearsFlash = pulse(t, YEARS_PASS - HINGE_HALF, YEARS_PASS + HINGE_HALF, 0.35);
        const stillness = 1 - yearsFlash * 0.85;

        if (!grown) {
          // He shuffles from the second house towards the well, then stops and
          // waits with the bowl held out. A blind man's walk is short-strided
          // and the cane leads.
          const walk = ease(t, 1.5, 11, easeInOutCubic);
          const x = -9 + walk * 7.2;
          const z = 8.2 - walk * 2.1;
          father.root.position.set(x, height(x, z), z);

          const moving = t > 1.5 && t < 11;
          const offerTo = ease(t, 12, 16, easeOutCubic) * (1 - ease(t, 20, 22.5, easeInOutCubic));

          if (moving) {
            father.walk(gait(t, 0.72), 0.45, { bodyTurn: 0.72 });
          } else {
            father.setPose({
              bodyTurn: 0.72,
              headTurn: Math.sin(t * 0.42) * 0.24 * stillness,
              headTilt: 0.05 * stillness,
              // Left arm cradles the child; right offers the bowl.
              armLSwing: 0.85,
              elbowL: 1.55,
              armRSwing: 0.55 + offerTo * 0.75,
              armRRaise: 0.12 + offerTo * 0.18,
              elbowR: 1.3 - offerTo * 0.75,
              spineBend: 0.08 + offerTo * 0.12,
            });
          }

          // The nearest woman leans in towards the child.
          const nurse = villagers[0];
          if (nurse) {
            const lean = ease(t, 13, 17, easeOutCubic) * (1 - ease(t, 20, 22.5, easeInOutCubic));
            nurse.figure.setPose({
              bodyTurn: nurse.facing,
              spineBend: lean * 0.4,
              headTilt: lean * 0.35,
              armLSwing: lean * 1.15,
              armRSwing: lean * 1.15,
              armLRaise: lean * 0.22,
              armRRaise: lean * 0.22,
              elbowL: 0.9,
              elbowR: 0.9,
            });
          }
          for (let i = 1; i < villagers.length; i++) {
            const v = villagers[i];
            if (v) v.figure.idle(t + v.phase, 0.85 * stillness, { bodyTurn: v.facing });
          }
        } else {
          // The second half: she walks him home along the path, her hand at his
          // elbow, a water jar balanced on her head.
          const walk = ease(t, 25, 44, easeInOutCubic);
          const cx = 1.5 - walk * 15.5;
          const cz = 14.4 + walk * 0.6;
          cheong.root.position.set(cx, height(cx, cz), cz);
          father.root.position.set(cx - 0.95, height(cx - 0.95, cz + 0.55), cz + 0.55);

          const moving = t > 25.4 && t < 43.6;
          const step = gait(t, 0.62);

          if (moving) {
            // Carrying a jar on the head means almost no vertical bob and a
            // very upright spine — the walk reads as Korean because of it.
            cheong.walk(step, 0.52, {
              bodyTurn: -1.5,
              spineBend: -0.03,
              lift: 0,
              armRSwing: 0.5,
              armRRaise: 0.34,
              elbowR: 0.95,
            });
            father.walk(step + 0.06, 0.38, {
              bodyTurn: -1.5,
              spineBend: 0.13,
              headTilt: 0.06,
              armLSwing: 0.45,
              armLRaise: 0.3,
              elbowL: 1.05,
            });
          } else {
            cheong.idle(t, 0.7 * stillness, { bodyTurn: -1.5, spineBend: -0.03 });
            father.idle(t + 4, 0.6 * stillness, { bodyTurn: -1.5, spineBend: 0.13 });
          }

          for (const v of villagers) v.figure.idle(t + v.phase, 0.8 * stillness, { bodyTurn: v.facing });
        }

        // Willows in a light breeze.
        for (let i = 0; i < willows.length; i++) {
          const w = willows[i];
          if (!w) continue;
          w.fronds.rotation.z = Math.sin(t * 0.75 + w.phase) * 0.075;
          w.fronds.rotation.x = Math.cos(t * 0.62 + w.phase * 1.4) * 0.055;
        }

        // The afternoon lengthens a little towards the end. Across the
        // fifteen-year hinge the light also blooms and the fog thickens
        // toward white and back — the visual seam the cut needs so the
        // infant-to-daughter swap reads as time passing, not a glitch.
        const baseExposure = 1.06 - span(t, 38, 50) * 0.1;
        stage.setExposure(baseExposure + yearsFlash * 1.7);
        stage.setFogColor(yearsFlash > 0.4 ? 0xffffff : SKY.villageNoon.fog);
        stage.setFogDensity(lerp(SKY.villageNoon.fogDensity, 0.05, clamp(yearsFlash * 1.3, 0, 1)));

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        // Nothing beyond the geometry the director already releases.
      },
    };
  },
};
