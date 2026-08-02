import { Group, Vector3 } from 'three';
import { buildFigure, type Figure } from '../builders/figure';
import { buildHomestead } from '../builders/hanok';
import {
  Particles,
  buildPersimmon,
  buildRidgelines,
  buildRocks,
  buildTerrain,
  frostTree,
  rollingHills,
  scatterPines,
} from '../builders/nature';
import { buildBier, buildFuneralBanner, buildGraveMound, buildCane } from '../builders/props';
import { CLOTH, OBANG, SKY } from '../core/palette';
import { ease, easeInOutCubic, easeOutCubic, span } from '../core/timeline';
import { hold, move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act I — 곽씨부인 세상을 뜨다.
 *
 * Sim Cheong's mother dies seven days after the birth. Her blind husband is
 * left holding a newborn he cannot see, and the village carries his wife out
 * across a frozen field.
 *
 * The staging decision that makes this act work: the father does not walk in
 * the procession. He cannot — he is blind and he is holding the baby — so he
 * stands rooted at the edge of the field while the bier gets smaller and
 * smaller behind him. Everything else moves; he does not. That single held
 * position is worth more than any amount of animation.
 */

const DURATION = 54;

/** The procession runs from here to here over the middle of the act. */
const PATH_START = -16;
const PATH_END = 30;
const PATH_Z = 3;
const WALK_FROM = 5;
const WALK_TO = 41;

const FATHER_POS = new Vector3(-5.5, 0, 10.5);
const GRAVE_POS = new Vector3(30, 0, -3);

interface Walker {
  readonly figure: Figure;
  /** Offset from the procession's lead point. */
  readonly offset: Vector3;
  readonly stride: number;
  readonly phase: number;
}

export const act01Farewell: Act = {
  id: 'farewell',
  chapter: '제1막',
  title: '곽씨부인 세상을 뜨다',
  duration: DURATION,
  sky: SKY.winterMourning,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();

    // ---- Land -------------------------------------------------------------
    const height = rollingHills(1.5, 0.021, 41);
    const ground = buildTerrain(
      {
        size: 340,
        segments: 130,
        height,
        color: 0x6f6a55,
        // Snow lying on the rises and blown off the hollows. Driving the blend
        // from the same height function that shapes the ground means the white
        // always lands where the land actually rises, for free.
        highColor: 0xd6dade,
        highStart: 0.1,
        highEnd: 1.25,
        tint: 0.07,
      },
      rng,
    );
    root.add(ground);
    stage.setFloor(0x8f8f81, -0.5);

    root.add(buildRidgelines(5, 220, rng, 0x7d8490, 0xb9bcbd));

    const pines = scatterPines(38, 150, height, rng, 46);
    frostTree(pines, 0.45);
    root.add(pines);

    const rocks = buildRocks(26, 90, rng, 0.9);
    // Keep a radius clear around the father and the neighbour who stands
    // with him. buildRocks scatters within 90 units of the origin, which
    // comfortably covers FATHER_POS — audit frame farewell-t24 showed a rock
    // reading as though the neighbour were carrying a boulder in the close
    // shot. A 3.5-unit radius (matched to physical clearance) still left one
    // through: the offending rock sat ~7 units away but almost exactly along
    // shot 3's camera-to-subject sightline, so perspective stacked it right
    // behind her hip even though it never touched her footprint. Widened to
    // 9 units, which is cheap here — the rocks are simply pruned afterward,
    // so it doesn't touch the shared builder or its RNG sequence, and the
    // field still has 20+ other rocks scattered across the 90-unit radius.
    const keepClear: ReadonlyArray<readonly [number, number]> = [
      [FATHER_POS.x, FATHER_POS.z],
      [FATHER_POS.x - 1.05, FATHER_POS.z + 0.5],
    ];
    for (const rock of [...rocks.children]) {
      const tooClose = keepClear.some(
        ([x, z]) => Math.hypot(rock.position.x - x, rock.position.z - z) < 9,
      );
      if (tooClose) rocks.remove(rock);
    }
    root.add(rocks);

    // ---- The house she is being carried away from -------------------------
    const homestead = buildHomestead(rng, {
      kan: 3,
      roofing: 'thatch',
      weathered: 0.6,
      litWindows: 0.22,
    });
    homestead.group.position.set(-26, height(-26, -12), -12);
    homestead.group.rotation.y = 0.42;
    frostTree(homestead.group, 0.3);
    root.add(homestead.group);

    // A bare persimmon, the fruit still hanging. Late autumn into winter, and
    // in Korean visual shorthand, hardship arriving.
    const persimmon = buildPersimmon(rng, 1.3, true);
    persimmon.position.set(-15.5, height(-15.5, 1.5), 1.5);
    root.add(persimmon);

    const persimmon2 = buildPersimmon(rng, 0.95, false);
    persimmon2.position.set(16, height(16, 15), 15);
    root.add(persimmon2);

    // ---- The grave --------------------------------------------------------
    const grave = buildGraveMound(rng, 1.15);
    grave.position.copy(GRAVE_POS);
    grave.position.y = height(GRAVE_POS.x, GRAVE_POS.z);
    grave.rotation.y = -0.5;
    frostTree(grave, 0.35);
    root.add(grave);

    // ---- The procession ---------------------------------------------------
    const procession = new Group();
    root.add(procession);

    const bier = buildBier(rng, 1.0);
    bier.group.position.set(0, 0, 0);
    procession.add(bier.group);

    const walkers: Walker[] = [];

    // Eight bearers, four to a side, shoulders under the poles.
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const rank = Math.floor(i / 2);
      const figure = buildFigure(
        {
          height: rng.range(1.62, 1.74),
          sex: 'male',
          jeogori: CLOTH.mourningWhite,
          lower: CLOTH.hempWhite,
          accent: CLOTH.hempGrey,
          headwear: 'headband',
          hair: 'topknot',
          skin: rng.chance(0.5) ? CLOTH.skin : CLOTH.skinPale,
        },
        rng,
      );
      figure.setFacing(Math.PI / 2);
      procession.add(figure.root);
      walkers.push({
        figure,
        offset: new Vector3(-1.4 + rank * 1.05, 0, side * 0.95),
        stride: rng.range(0.55, 0.72),
        phase: rng.next(),
      });
    }

    // Banner bearers, out ahead of the bier.
    const bannerColors = [OBANG.baek, OBANG.jeok, OBANG.cheong, OBANG.baek, OBANG.hwang];
    for (let i = 0; i < 5; i++) {
      const figure = buildFigure(
        {
          height: rng.range(1.58, 1.72),
          sex: 'male',
          jeogori: CLOTH.mourningWhite,
          lower: CLOTH.mourningWhite,
          accent: CLOTH.hempGrey,
          headwear: 'kerchief',
          hair: 'topknot',
        },
        rng,
      );
      figure.setFacing(Math.PI / 2);

      const banner = buildFuneralBanner(bannerColors[i % bannerColors.length] ?? OBANG.baek, rng, 0.95);
      banner.position.set(0.24, 0.55, 0.1);
      banner.rotation.z = -0.16;
      figure.root.add(banner);

      procession.add(figure.root);
      walkers.push({
        figure,
        offset: new Vector3(3.0 + i * 1.5, 0, (i % 2 === 0 ? 1 : -1) * rng.range(0.7, 1.5)),
        stride: rng.range(0.5, 0.66),
        phase: rng.next(),
      });
    }

    // Mourners trailing behind, in undyed hemp.
    for (let i = 0; i < 7; i++) {
      const female = rng.chance(0.55);
      const figure = buildFigure(
        {
          height: rng.range(female ? 1.5 : 1.6, female ? 1.62 : 1.73),
          sex: female ? 'female' : 'male',
          jeogori: CLOTH.mourningWhite,
          lower: female ? CLOTH.hempWhite : CLOTH.hempGrey,
          accent: CLOTH.hempGrey,
          headwear: female ? 'kerchief' : 'headband',
          hair: female ? 'bun' : 'topknot',
        },
        rng,
      );
      figure.setFacing(Math.PI / 2);
      procession.add(figure.root);
      walkers.push({
        figure,
        offset: new Vector3(-4.2 - (i % 4) * 1.35, 0, rng.spread(1.9)),
        stride: rng.range(0.42, 0.6),
        phase: rng.next(),
      });
    }

    // ---- Sim Hakgyu, the blind father -------------------------------------
    const father = buildFigure(
      {
        height: 1.66,
        sex: 'male',
        jeogori: CLOTH.mourningWhite,
        lower: CLOTH.hempGrey,
        accent: CLOTH.hempGrey,
        headwear: 'none',
        hair: 'topknot',
        blind: true,
      },
      rng,
    );
    father.root.position.copy(FATHER_POS);
    father.root.position.y = height(FATHER_POS.x, FATHER_POS.z);
    father.setFacing(1.75);
    father.root.name = 'father';
    root.add(father.root);

    // The newborn: a white bundle held against his chest. Built as a child of
    // the spine so it moves with him rather than floating.
    const baby = new Group();
    const bundle = buildFigure(
      { height: 0.42, sex: 'female', jeogori: CLOTH.mourningWhite, lower: CLOTH.mourningWhite, hair: 'child', headwear: 'none' },
      rng,
    );
    bundle.root.rotation.x = -1.35;
    bundle.root.position.set(0, 0.1, 0.2);
    baby.add(bundle.root);
    baby.position.set(0.02, 0.78, 0.24);
    father.root.add(baby);

    const cane = buildCane(rng, 1.2);
    cane.position.set(-0.24, 0.92, 0.06);
    cane.rotation.z = -0.14;
    father.root.add(cane);

    // A neighbour woman standing with him, one hand at his elbow.
    const neighbour = buildFigure(
      {
        height: 1.57,
        sex: 'female',
        jeogori: CLOTH.mourningWhite,
        lower: CLOTH.hempWhite,
        accent: CLOTH.hempGrey,
        headwear: 'kerchief',
        hair: 'bun',
      },
      rng,
    );
    neighbour.root.position.set(FATHER_POS.x - 1.05, height(FATHER_POS.x - 1, FATHER_POS.z + 0.5), FATHER_POS.z + 0.5);
    neighbour.setFacing(1.95);
    neighbour.root.name = 'neighbour';
    root.add(neighbour.root);

    // ---- Snow ---------------------------------------------------------------
    const snow = new Particles(1100, new Vector3(70, 34, 70), 0.075, 0xf2f5f8, rng, 0.85);
    snow.mesh.position.set(4, 0, 4);
    root.add(snow.mesh);

    stage.focusShadows(new Vector3(2, 0, 4), 46);

    // ---- Camera -------------------------------------------------------------
    //
    // Every eye-height in the shot list is measured from the ground *under the
    // subject*, not from y = 0. The terrain rolls by ±1.5 units, which is close
    // to a whole person: authored against absolute world height, the close shot
    // on the father framed the top of his head at the bottom of the screen.
    const gF = height(FATHER_POS.x, FATHER_POS.z);
    const gP = height(0, PATH_Z);

    const shots: readonly Shot[] = [
      // 1. The whole cold world, and something small moving through it.
      move(
        0,
        [-44, 21, 46, -12, 3, 2],
        [-33, 14, 35, -8, 2.4, 2],
        [36, 33],
        easeInOutCubic,
        0.035,
      ),
      // 2. Travelling with the bier, low and close.
      move(
        9.5,
        [-9, gP + 2.9, 13.5, -6, gP + 2.0, PATH_Z],
        [11, gP + 2.9, 13.5, 14, gP + 2.0, PATH_Z],
        44,
        easeInOutCubic,
        0.05,
      ),
      // 3. The father, who is not going anywhere.
      //
      // Shot from his right and slightly in front, so the background behind him
      // is open field rather than his own house — the point of the shot is that
      // there is nothing left on that side of him.
      //
      // FOV widened from the original [42, 34]: at that framing the father and
      // the neighbour filled almost the full frame height and their feet sat
      // right at the bottom edge, so the burned-in subtitle band overlapped
      // their lower bodies (see farewell-t24). Same camera position, wider
      // angle — just adds headroom above and below without changing the shot.
      move(
        20,
        [-2.6, gF + 1.62, 6.2, -5.4, gF + 1.44, 10.4],
        [-3.3, gF + 1.5, 7.4, -5.45, gF + 1.4, 10.4],
        [46, 38],
        easeInOutCubic,
        0.045,
      ),
      // 4. Past him, down the field — the procession already far away.
      move(
        30.5,
        [-8.4, gF + 1.72, 13.2, 8, gP + 1.4, PATH_Z],
        [-7.8, gF + 1.66, 12.6, 19, gP + 1.3, PATH_Z],
        [30, 25],
        easeInOutCubic,
        0.04,
      ),
      // 5. Crane away and up. He gets smaller too.
      move(
        40,
        [-14, gF + 4.5, 22, 4, 2, 6],
        [-30, 24, 44, 2, 1, 4],
        [40, 46],
        easeOutCubic,
        0.03,
      ),
      // 6. Held wide on an emptying field.
      hold(48, [-34, 26, 48, 0, 1, 4], 48, 0.02),
    ];

    // ---- Runtime -----------------------------------------------------------
    const lead = new Vector3();

    return {
      root,

      update({ t, dt }, rig) {
        // Procession position along its path.
        const marchAt = (time: number): number =>
          PATH_START + (PATH_END - PATH_START) * ease(time, WALK_FROM, WALK_TO, easeInOutCubic);
        const x = marchAt(t);
        // Differencing the path gives ground speed directly, which then decides
        // whether legs cycle or the figures merely shift their weight. Doing it
        // this way keeps the walk correct under scrubbing, where `dt` lies.
        const speed = Math.abs(marchAt(t + 0.05) - marchAt(t - 0.05)) / 0.1;

        lead.set(x, 0, PATH_Z);
        procession.position.set(x, height(x, PATH_Z) + 0.02, PATH_Z);
        // The bier sways on the bearers' shoulders.
        bier.group.rotation.z = Math.sin(t * 2.1) * 0.035 * (speed > 0.1 ? 1 : 0.2);
        bier.group.position.y = Math.abs(Math.sin(t * 2.1)) * 0.05;

        for (const walker of walkers) {
          const w = walker.figure;
          w.root.position.set(walker.offset.x, 0, walker.offset.z);
          if (speed > 0.1) {
            w.walk(t * 1.05 + walker.phase, walker.stride, { bodyTurn: Math.PI / 2 });
          } else {
            w.idle(t + walker.phase * 7, 0.7, { bodyTurn: Math.PI / 2 });
          }
        }

        // The father. He turns his head to follow a sound he cannot see, and
        // near the end lifts one hand after them.
        const listen = Math.sin(t * 0.31) * 0.24;
        const reachOut = ease(t, 26, 31, easeOutCubic) * (1 - ease(t, 36, 44, easeInOutCubic));
        father.setPose({
          bodyTurn:
            1.75 +
            ease(t, 19, 23.5, easeOutCubic) * 0.5 * (1 - ease(t, 30, 34, easeInOutCubic)),
          headTurn: listen - reachOut * 0.2,
          headTilt: -0.08 + Math.sin(t * 0.44) * 0.05,
          spineBend: 0.1 + reachOut * 0.06,
          // The arm holding the baby stays folded; the other reaches.
          armLSwing: 0.95,
          elbowL: 1.5,
          armRSwing: 0.85 + reachOut * 0.55,
          armRRaise: 0.18 + reachOut * 0.2,
          elbowR: 1.45 - reachOut * 0.85,
          lift: Math.sin(t * 0.7) * 0.004,
        });

        neighbour.idle(t + 3, 0.55, { bodyTurn: 1.95, headTurn: -0.2 + Math.sin(t * 0.4) * 0.15 });

        snow.update(dt, t, Math.sin(t * 0.24) * 0.5 - 0.25);

        // The light thins as the act goes on; by the end it is nearly flat.
        // The weather closes in as she is carried further away.
        stage.setExposure(1.02 - span(t, 34, 52) * 0.14);
        stage.setFogDensity(0.0072 + span(t, 30, 54) * 0.0035);

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        snow.dispose();
      },
    };
  },
};
