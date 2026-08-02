import { Group, PointLight, Vector3 } from 'three';
import { buildFigure } from '../builders/figure';
import { buildTerrain, rollingHills } from '../builders/nature';
import { buildHall } from '../builders/temple';
import { Dragon, animateJellyfish, buildJellyfish, coilPath } from '../builders/dragon';
import {
  FishSchool,
  Motes,
  buildClam,
  buildCoral,
  buildKelp,
  buildLightShafts,
  buildSeaGate,
} from '../builders/undersea';
import { buildLotus } from '../builders/lotus';
import { CLOTH, SEA, SKY } from '../core/palette';
import { ease, easeInOutCubic, easeOutCubic, lerp, span } from '../core/timeline';
import { hold, move, orbitShot, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act VI — 수정궁.
 *
 * She does not drown. The Jade Emperor sends word to the Dragon King of the
 * Southern Sea, who receives her in his crystal palace, and there — in the
 * liberty the tale takes and every telling keeps — she meets her mother, dead
 * these fifteen years.
 *
 * The hard part of this act is that it is set inside a featureless volume of
 * black water, which is the least readable space in the film. Everything is
 * arranged to give that volume structure: light shafts to say which way is up,
 * a gate to say you have arrived, kelp to say where the floor is, and
 * bioluminescence to give the eye something to judge distance against.
 */

const DURATION = 54;

const FLOOR_Y = -34;
const PALACE_POS = new Vector3(0, FLOOR_Y, -28);
const GATE_POS = new Vector3(0, FLOOR_Y, -6);

export const act06DragonPalace: Act = {
  id: 'dragonPalace',
  chapter: '제6막',
  title: '수정궁, 어머니를 만나다',
  duration: DURATION,
  sky: SKY.undersea,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();

    // ---- The sea bed ---------------------------------------------------------
    const height = rollingHills(2.2, 0.02, 613);
    const floor = buildTerrain(
      {
        size: 300,
        segments: 110,
        height,
        color: 0x1c3b42,
        highColor: 0x2f5a5c,
        highStart: -1,
        highEnd: 2.2,
        tint: 0.1,
      },
      rng,
    );
    floor.position.y = FLOOR_Y;
    root.add(floor);
    // Matched to the fog so the disc's far edge never draws a horizon line.
    stage.setFloor(0x07242f, FLOOR_Y - 2);

    const kelp = buildKelp(90, 62, rng);
    kelp.group.position.y = FLOOR_Y;
    root.add(kelp.group);

    const coral = buildCoral(70, 55, rng);
    coral.position.y = FLOOR_Y;
    root.add(coral);

    // ---- Light from a surface thirty metres up --------------------------------
    const shafts = buildLightShafts(16, 46, 78, 0x8fe6dc, rng);
    shafts.group.position.y = FLOOR_Y;
    root.add(shafts.group);

    const motes = new Motes(900, new Vector3(50, 70, 50), 0.075, 0xa8e8ea, rng, 0.55);
    motes.mesh.position.y = FLOOR_Y;
    root.add(motes.mesh);

    // ---- The gate and the palace ----------------------------------------------
    const gate = buildSeaGate(rng, 17, 13);
    gate.position.copy(GATE_POS);
    root.add(gate);

    const palace = buildHall(
      { kan: 5, kanWidth: 3.6, depth: 8, columnHeight: 4.2, doubleRoof: true, litInterior: 3.2 },
      rng,
    );
    palace.group.position.copy(PALACE_POS);
    root.add(palace.group);

    // Glow from inside the hall, which gives the whole act its silhouette light.
    const palaceGlow = new PointLight(SEA.palaceGlow, 150, 120, 2);
    palaceGlow.position.set(PALACE_POS.x, PALACE_POS.y + 5, PALACE_POS.z + 2);
    root.add(palaceGlow);

    // ---- The Dragon King --------------------------------------------------------
    const dragon = new Dragon(
      { segments: 46, radius: 0.78, bodyColor: 0x2c7d70, maneColor: 0xc8402f, pearl: true },
      rng,
    );
    root.add(dragon.group);

    // ---- Jellyfish and fish -------------------------------------------------------
    const jellies: Array<{
      rig: ReturnType<typeof buildJellyfish>;
      origin: Vector3;
      phase: number;
      rise: number;
    }> = [];
    const jellyColors = [0x6ad8e0, 0xb07ce0, 0xe08fb0, 0x7ce0a8];
    for (let i = 0; i < 26; i++) {
      const jelly = buildJellyfish(
        jellyColors[i % jellyColors.length] ?? 0x6ad8e0,
        rng,
        rng.range(0.5, 1.5),
      );
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(6, 44);
      const origin = new Vector3(
        Math.cos(a) * r,
        FLOOR_Y + rng.range(4, 34),
        Math.sin(a) * r - 8,
      );
      jelly.group.position.copy(origin);
      root.add(jelly.group);
      jellies.push({ rig: jelly, origin, phase: rng.range(0, Math.PI * 2), rise: rng.range(0.2, 0.8) });
    }

    const schools = [
      new FishSchool(90, 0xd8c46a, rng, 0.26),
      new FishSchool(70, 0x7fd4e0, rng, 0.2),
      new FishSchool(50, 0xe08a6a, rng, 0.32),
    ];
    for (const school of schools) root.add(school.mesh);

    // ---- Sim Cheong, and her mother --------------------------------------------
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
    root.add(cheong.root);

    // A soft light on her so she never disappears into the dark, which in a
    // scene lit only by bioluminescence she otherwise does.
    const keyOnCheong = new PointLight(0xbdf0ea, 12, 16, 2);
    keyOnCheong.position.set(0, 1.2, 0.8);
    cheong.root.add(keyOnCheong);

    const clam = buildClam(rng, 3.4);
    clam.group.position.set(-9, FLOOR_Y + 0.4, -18);
    clam.group.rotation.y = 0.9;
    root.add(clam.group);

    const mother = buildFigure(
      {
        height: 1.58,
        sex: 'female',
        // Drowned-pale and dressed in mourning white — she has been dead
        // fifteen years and the palette says so before the caption does.
        jeogori: 0xf2eee6,
        lower: 0xdce4e8,
        accent: 0x9ab6c0,
        skin: 0xe8d8cc,
        hair: 'bun',
      },
      rng,
    );
    mother.root.name = 'mother';
    mother.root.position.set(-9, FLOOR_Y + 1.5, -18.4);
    mother.root.visible = false;
    root.add(mother.root);

    const motherGlow = new PointLight(0xd6f2ff, 18, 22, 2);
    motherGlow.position.set(0, 1.2, 0.4);
    mother.root.add(motherGlow);

    // ---- The lotus she leaves in --------------------------------------------------
    const lotus = buildLotus(
      { radius: 1.5, rings: 4, petalsPerRing: 8, petalColor: 0xf6dee6, tipColor: 0xd9758f, innerLight: true },
      rng,
    );
    lotus.group.position.set(0, FLOOR_Y + 7, -14);
    lotus.group.visible = false;
    root.add(lotus.group);

    stage.focusShadows(new Vector3(0, FLOOR_Y + 6, -14), 34);

    // ---- Camera -------------------------------------------------------------------
    const shots: readonly Shot[] = [
      // 1. Still sinking. Looking up at a surface a long way off.
      move(
        0,
        [3.2, FLOOR_Y + 30, 9, 0.5, FLOOR_Y + 40, 4],
        [2.4, FLOOR_Y + 22, 7, 0.2, FLOOR_Y + 27, 3],
        [56, 48],
        easeInOutCubic,
        0.06,
      ),
      // 2. The dragon comes up out of the dark beneath her.
      move(
        9,
        [7.5, FLOOR_Y + 16, 12, 0, FLOOR_Y + 14, 2],
        [5.0, FLOOR_Y + 13, 9, -0.5, FLOOR_Y + 12, -2],
        [46, 40],
        easeInOutCubic,
        0.08,
      ),
      // 3. Through the gate. The palace behind it.
      move(
        16,
        [1.6, FLOOR_Y + 9.5, 11, 0, FLOOR_Y + 8, -12],
        [0.6, FLOOR_Y + 8.5, 1.5, 0, FLOOR_Y + 7.5, -22],
        [44, 40],
        easeInOutCubic,
        0.05,
      ),
      // 4. A slow orbit of the court while the King speaks.
      // lookHeight was 2.5 (target y = FLOOR_Y+8.5), which aims at the court
      // floor. The King's coil (dragonPath, below) is centred at FLOOR_Y+12
      // and ranges +-10 around that, so the old target sat below his whole
      // flight band and the t=24 capture shows his line spoken with no dragon
      // in frame. Raised to 6 so the target (FLOOR_Y+12) matches his coil
      // centre, and widened the lens slightly for margin since the camera's
      // orbit and his coil don't share a rotation centre and won't always
      // line up exactly.
      orbitShot(
        22.5,
        [0, FLOOR_Y + 6, -18],
        14,
        1.15,
        0.25,
        5.5,
        6,
        46,
        0.045,
      ),
      // 5. The clam opens.
      move(
        30,
        [-2.6, FLOOR_Y + 5.4, -12.4, -8.4, FLOOR_Y + 3.2, -17.6],
        [-4.2, FLOOR_Y + 4.4, -13.6, -8.8, FLOOR_Y + 2.6, -17.8],
        [42, 34],
        easeInOutCubic,
        0.04,
      ),
      // 6. Mother and daughter, close, one frame, no cut.
      move(
        36.5,
        [-4.8, FLOOR_Y + 3.0, -14.2, -8.6, FLOOR_Y + 2.4, -17.4],
        [-5.4, FLOOR_Y + 2.7, -14.8, -8.7, FLOOR_Y + 2.3, -17.5],
        [34, 29],
        easeInOutCubic,
        0.035,
      ),
      // 7. The lotus closes over her and starts to rise.
      move(
        44,
        [5.5, FLOOR_Y + 8, -6, 0, FLOOR_Y + 8, -14],
        [8, FLOOR_Y + 18, -2, 0, FLOOR_Y + 15, -14],
        [42, 46],
        easeOutCubic,
        0.03,
      ),
      hold(50.5, [10, FLOOR_Y + 26, 2, 0, FLOOR_Y + 22, -13], 48, 0.025),
    ];

    // ---- Runtime -------------------------------------------------------------------
    const dragonPath = coilPath(new Vector3(0, FLOOR_Y + 12, -10), 13, 20, 1.6, 0.55, 0.7);
    const cheongPos = new Vector3();

    return {
      root,

      update({ t, dt }, rig) {
        shafts.update(t);
        kelp.update(t);
        motes.update(dt, t);

        for (const jelly of jellies) {
          const j = jellies.indexOf(jelly);
          animateJellyfish(jelly.rig, t, jelly.phase);
          jelly.rig.group.position.set(
            jelly.origin.x + Math.sin(t * 0.22 + jelly.phase) * 2.2,
            jelly.origin.y + Math.sin(t * 0.34 + jelly.phase * 1.7) * 1.6 + jelly.rise * t * 0.12,
            jelly.origin.z + Math.cos(t * 0.19 + jelly.phase * 0.8) * 2.0,
          );
          void j;
        }

        schools[0]?.setCenter(-14, FLOOR_Y + 12, -16);
        schools[1]?.setCenter(12, FLOOR_Y + 8, -22);
        schools[2]?.setCenter(4, FLOOR_Y + 18, -4);
        for (const school of schools) school.update(t);

        // --- Sim Cheong's descent and arrival ----------------------------------
        // She sinks for the first ten seconds, then is carried down to the court
        // and set on her feet.
        const sink = ease(t, 0, 11, easeOutCubic);
        const settle = ease(t, 11, 20, easeInOutCubic);
        const toMother = ease(t, 30, 36, easeInOutCubic);
        const intoLotus = ease(t, 43, 48, easeInOutCubic);

        cheongPos.set(
          lerp(lerp(0.6, 0.2, sink), lerp(0.2, -6.6, toMother), settle),
          lerp(FLOOR_Y + 32, FLOOR_Y + 14, sink) - settle * 11.4 + intoLotus * 5.5,
          lerp(lerp(4, 2, sink), lerp(2, -16.2, toMother), settle),
        );
        cheong.root.position.copy(cheongPos);

        if (t < 12) {
          // Falling: limp, arms above, turning slowly.
          cheong.root.rotation.set(0.75 - sink * 0.55, -0.4 + Math.sin(t * 0.3) * 0.4, Math.sin(t * 0.4) * 0.2);
          cheong.setPose({
            armLSwing: 2.6,
            armRSwing: 2.5,
            armLRaise: 0.5,
            armRRaise: 0.5,
            elbowL: 0.35,
            elbowR: 0.4,
            legLSwing: -0.3,
            legRSwing: -0.15,
            kneeL: 0.25,
          });
        } else if (t < 30) {
          // Standing in the court, looking around at something impossible.
          cheong.root.rotation.set(0, lerp(-0.4, 2.6, settle), 0);
          cheong.idle(t, 1.1, {
            bodyTurn: lerp(-0.4, 2.6, settle),
            headTilt: -0.18 + Math.sin(t * 0.5) * 0.08,
            headTurn: Math.sin(t * 0.37) * 0.5,
            armLSwing: 0.16,
            armRSwing: 0.16,
            elbowL: 0.3,
            elbowR: 0.3,
          });
        } else {
          // Towards her mother, then held by her.
          const embrace = ease(t, 36.5, 40, easeOutCubic);
          cheong.root.rotation.set(0, 3.1, 0);
          cheong.setPose({
            bodyTurn: 3.1,
            spineBend: embrace * 0.2,
            headTilt: embrace * 0.22,
            armLSwing: 0.4 + embrace * 1.35,
            armRSwing: 0.4 + embrace * 1.35,
            armLRaise: embrace * 0.4,
            armRRaise: embrace * 0.4,
            elbowL: 0.4 + embrace * 1.1,
            elbowR: 0.4 + embrace * 1.1,
            lift: Math.sin(t * 0.6) * 0.03,
          });
        }

        // --- The clam and her mother ---------------------------------------------
        const open = ease(t, 29.5, 34, easeOutCubic);
        clam.upper.rotation.x = -1.05 - open * 0.75;
        clam.light.intensity = 12 + open * 26;

        mother.root.visible = t > 31;
        if (mother.root.visible) {
          const rise = ease(t, 31, 35.5, easeOutCubic);
          const embrace = ease(t, 36.5, 40, easeOutCubic);
          const part = ease(t, 44, 50, easeInOutCubic);
          mother.root.position.set(-8.8, FLOOR_Y + 0.9 + rise * 0.8, -17.9);
          mother.root.rotation.y = 0.55;
          mother.setPose({
            bodyTurn: 0.55,
            crouch: (1 - rise) * 0.7,
            spineBend: embrace * 0.16,
            headTilt: 0.1 + embrace * 0.2,
            armLSwing: rise * 0.9 + embrace * 0.9,
            armRSwing: rise * 0.9 + embrace * 0.9,
            armLRaise: rise * 0.3 + embrace * 0.3,
            armRRaise: rise * 0.3 + embrace * 0.3,
            elbowL: 0.5 + embrace * 1.0,
            elbowR: 0.5 + embrace * 1.0,
            lift: Math.sin(t * 0.5 + 1) * 0.04,
          });
          motherGlow.intensity = 18 * (1 - part * 0.7);
        }

        // --- The Dragon King -------------------------------------------------------
        dragon.follow(dragonPath, t);
        dragon.holdPearl(t, 3.2);
        dragon.setPearlIntensity(34 + Math.sin(t * 1.3) * 8);

        // --- The lotus ---------------------------------------------------------------
        lotus.group.visible = t > 42;
        if (lotus.group.visible) {
          const close = ease(t, 43, 48, easeInOutCubic);
          const rise = ease(t, 47, 54, easeInOutCubic);
          lotus.group.position.set(-6.6 + close * 6.6, FLOOR_Y + 3 + rise * 20, -16.2 + close * 2.2);
          // Open at first, so we see her inside it, then sealing shut.
          lotus.setOpen(0.85 * (1 - close));
          lotus.group.rotation.y = t * 0.15;
          if (lotus.light) lotus.light.intensity = 18 + close * 30;
        }

        // Hide her once the flower has closed over her.
        cheong.root.visible = t < 47.4;

        // --- Atmosphere -------------------------------------------------------------
        // Brighter towards the palace, and brighter again as the lotus rises.
        stage.setExposure(0.86 + span(t, 14, 26) * 0.2 + span(t, 44, 54) * 0.22);
        // Was 0.024 down to ~0.014 — 1.4-2x the documented safe band
        // (0.003-0.012, see src/core/palette.ts) for this film's scale. Against
        // the near-black undersea fog colour that overshoot didn't wash the
        // frame beige, it wiped out the gate, palace, kelp, dragon and both
        // figures entirely, leaving only the light shafts visible. Rescaled to
        // stay inside the safe band while keeping the same brightening shape.
        stage.setFogDensity(0.011 - span(t, 10, 24) * 0.004 - span(t, 44, 54) * 0.003);
        palaceGlow.intensity = 110 + span(t, 12, 24) * 90;

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        motes.dispose();
        for (const school of schools) school.dispose();
      },
    };
  },
};
