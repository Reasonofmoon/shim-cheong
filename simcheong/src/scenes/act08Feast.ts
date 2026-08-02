import { BoxGeometry, CylinderGeometry, Group, PointLight, Vector3 } from 'three';
import { buildFigure, type Figure } from '../builders/figure';
import { applyVertexTint, meshOf, stillWater, surface } from '../builders/materials';
import { buildPaintedColumn } from '../builders/hanok';
import { buildHall, buildLantern } from '../builders/temple';
import { DEFAULT_ROOF, hipRoof } from '../builders/roof';
import { buildLotusBed } from '../builders/lotus';
import { buildRidgelines, buildTerrain, rollingHills, scatterPines } from '../builders/nature';
import { buildCane, buildFoldingScreen, buildSoban, buildStrawMat, buildThrone } from '../builders/props';
import { CLOTH, DANCHEONG, NATURE, OBANG, SKY } from '../core/palette';
import { clamp, ease, easeInOutCubic, easeOutCubic, gait, lerp, pulse, span } from '../core/timeline';
import { hold, move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act VIII — 맹인잔치.
 *
 * Empress now, and unable to stop looking for him, Sim Cheong summons every
 * blind person in the empire to a feast that runs for days. On the last day a
 * ragged old man comes in late. She calls out, and at the sound of a daughter
 * he buried at sea, his eyes open — and with his, every blind eye in the hall.
 *
 * Two things carry this act. The first is the geography: she is high and far
 * away on the dais and he comes in at the opposite end, so the whole act is the
 * distance between them closing. The second is a single white frame. The
 * exposure is driven to blow the image out completely at the instant he opens
 * his eyes, and when it comes back the world is the same but he can see it —
 * which is as close as this medium gets to showing sight arriving.
 */

const DURATION = 78;

const HALL_Z = -26;
const GATE_Z = 24;
/** The instant of sight. */
const OPENING = 55.5;

interface Guest {
  readonly figure: Figure;
  readonly seat: Vector3;
  readonly facing: number;
  readonly phase: number;
  // The twenty-four guests were rendering as one wound-up mechanism: every
  // channel before the wave reached them used the same two frequencies
  // (0.8 and 0.6 rad/s), so the crowd only ever differed by a phase offset —
  // a Mexican wave frozen at a fixed relative spacing, not two dozen people.
  // These give each guest their own periods and their own resting bias, so
  // no two guests are ever moving in lockstep for long.
  readonly freqA: number;
  readonly freqB: number;
  readonly freqC: number;
  readonly idleAmount: number;
  readonly leanBias: number;
  readonly headBias: number;
  readonly crouchBias: number;
  readonly startleGain: number;
  readonly startleDelay: number;
}

export const act08Feast: Act = {
  id: 'feast',
  chapter: '제8막',
  title: '맹인잔치, 눈을 뜨다',
  duration: DURATION,
  sky: SKY.palaceDay,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();
    const height = rollingHills(0.35, 0.04, 1013);

    root.add(
      buildTerrain(
        {
          size: 220,
          segments: 90,
          height,
          color: 0x7d8154,
          highColor: 0x93915a,
          highStart: 0,
          highEnd: 0.4,
          tint: 0.06,
        },
        rng,
      ),
    );
    stage.setFloor(0x86885a, -0.5);
    root.add(buildRidgelines(4, 180, rng, 0x5f7a72, 0xb4c4cc));
    root.add(scatterPines(24, 96, height, rng, 34));

    // ---- The courtyard --------------------------------------------------------
    // A flagged rectangle. Laying real flags rather than one big plane gives the
    // ground a grain and, more usefully, a scale the eye can read distance from.
    const yard = new Group();
    const flagMats = [
      surface(0x9a9689, { roughness: 0.94 }),
      surface(0x8e8b7e, { roughness: 0.94 }),
      surface(0xa5a094, { roughness: 0.94 }),
    ];
    const cols = 16;
    const rows = 22;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const flag = applyVertexTint(new BoxGeometry(2.35, 0.12, 2.35), rng, 0.05);
        flag.translate(
          -((cols - 1) / 2) * 2.4 + i * 2.4,
          0.06,
          HALL_Z + 6 + j * 2.4,
        );
        yard.add(meshOf(flag, flagMats[(i + j) % 3] ?? flagMats[0]!, false, true));
      }
    }
    root.add(yard);

    // ---- The throne hall --------------------------------------------------------
    const hall = buildHall(
      { kan: 5, kanWidth: 4.0, depth: 9, columnHeight: 4.6, doubleRoof: true, litInterior: 0.4 },
      rng,
    );
    hall.group.position.set(0, 0, HALL_Z);
    root.add(hall.group);

    const dais = new Group();
    dais.position.set(0, 0.12, HALL_Z + 8.5);
    const daisBlock = applyVertexTint(new BoxGeometry(13, 1.5, 7), rng, 0.04);
    daisBlock.translate(0, 0.75, 0);
    dais.add(meshOf(daisBlock, surface(NATURE.stone, { roughness: 0.93 })));
    for (let i = 0; i < 4; i++) {
      const step = applyVertexTint(new BoxGeometry(6.4, 0.36, 0.7), rng, 0.04);
      step.translate(0, 0.18 + i * 0.36, 3.5 + (4 - i) * 0.7);
      dais.add(meshOf(step, surface(NATURE.stone, { roughness: 0.93 })));
    }
    root.add(dais);

    const screen = buildFoldingScreen(7, 3.4, rng, true);
    screen.position.set(0, 1.62, HALL_Z + 6.4);
    root.add(screen);

    const throne = buildThrone(rng);
    throne.position.set(0, 1.62, HALL_Z + 8.6);
    root.add(throne);

    // Painted columns flanking the court, and lanterns strung between them.
    const lanterns: Array<{ core: Group; phase: number }> = [];
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 7; i++) {
        const z = HALL_Z + 12 + i * 6.2;
        const column = buildPaintedColumn(5.4, 0.26, rng);
        column.position.set(side * 15.5, 0.12, z);
        root.add(column);

        const beam = new BoxGeometry(0.3, 0.3, 6.2);
        beam.translate(side * 15.5, 5.5, z + 3.1);
        root.add(meshOf(beam, surface(DANCHEONG.noerok, { roughness: 0.88 })));

        const lantern = buildLantern(
          [OBANG.jeok, OBANG.hwang, 0xe8dcc0][i % 3] ?? OBANG.jeok,
          rng,
          1.2,
        );
        lantern.group.position.set(side * 15.5, 5.0, z + 3.1);
        root.add(lantern.group);
        lanterns.push({ core: lantern.core, phase: rng.range(0, Math.PI * 2) });
      }
    }

    // ---- The outer wall and the gate he comes through ------------------------
    //
    // Added after the first render of the reunion: the reverse angle looks back
    // down the court towards the gate, and with nothing built there the climax
    // of the film played against an empty green field. A palace needs a wall
    // behind it in at least one direction.
    const wall = new Group();
    wall.position.set(0, 0, GATE_Z + 5);
    const wallMat = surface(0xc4b9a2, { roughness: 0.96 });
    const wallBase = surface(0x8a8175, { roughness: 0.95 });
    const capMat = surface(0x4a4f57, { roughness: 0.82, doubleSide: true });

    for (const side of [-1, 1] as const) {
      // Two runs of wall, leaving a gate gap in the middle.
      const length = 15;
      const centre = side * (length / 2 + 3.6);

      const plinth = applyVertexTint(new BoxGeometry(length, 0.7, 1.5), rng, 0.05);
      plinth.translate(centre, 0.35, 0);
      wall.add(meshOf(plinth, wallBase));

      const body = applyVertexTint(new BoxGeometry(length, 3.4, 1.1), rng, 0.05);
      body.translate(centre, 2.4, 0);
      wall.add(meshOf(body, wallMat));

      // Tile coping: a shallow ridge running the length of the wall.
      const cap = applyVertexTint(new BoxGeometry(length + 0.5, 0.34, 1.9), rng, 0.05);
      cap.translate(centre, 4.25, 0);
      wall.add(meshOf(cap, capMat));

      // Gate posts.
      const post = applyVertexTint(new CylinderGeometry(0.32, 0.36, 5.2, 10), rng, 0.05);
      post.translate(side * 3.4, 2.6, 0);
      wall.add(meshOf(post, surface(DANCHEONG.jangdan, { roughness: 0.88 })));
    }

    // The gate roof: taller than the wall, so the entrance reads as an event.
    const gateLintel = applyVertexTint(new BoxGeometry(8.4, 0.6, 1.6), rng, 0.04);
    gateLintel.translate(0, 5.4, 0);
    wall.add(meshOf(gateLintel, surface(DANCHEONG.noerok, { roughness: 0.88 })));

    const gateRoof = hipRoof(
      {
        ...DEFAULT_ROOF,
        ridgeHalf: 1.6,
        eaveHalfX: 6.4,
        eaveHalfZ: 3.0,
        drop: 1.7,
        angok: 0.62,
        anheorigok: 0.45,
        ribs: 26,
        ribDepth: 0.055,
        thatch: 0,
        uSegments: 90,
        vSegments: 13,
      },
      rng.int(0, 9999),
    );
    gateRoof.translate(0, 7.5, 0);
    applyVertexTint(gateRoof, rng, 0.06);
    wall.add(meshOf(gateRoof, capMat));
    root.add(wall);

    // A lotus pond off to one side — she has one built wherever she lives now.
    const pond = new Group();
    const pondWater = new CylinderGeometry(6.5, 6.5, 0.14, 30);
    pondWater.translate(0, 0.06, 0);
    pond.add(
      meshOf(
        pondWater,
        stillWater(0x24444e, 0x7fa8c4, 0.34),
        false,
        false,
      ),
    );
    pond.add(buildLotusBed(14, 5.4, rng));
    pond.position.set(-23, 0.1, 4);
    root.add(pond);

    // ---- The blind guests -------------------------------------------------------
    const guests: Guest[] = [];
    const guestRows = 4;
    const perRow = 6;
    for (let r = 0; r < guestRows; r++) {
      for (let c = 0; c < perRow; c++) {
        const side = c < perRow / 2 ? -1 : 1;
        const x = side * (4.2 + (c % (perRow / 2)) * 3.4);
        const z = HALL_Z + 16 + r * 5.4;

        const mat = buildStrawMat(1.9, 1.5, rng);
        mat.position.set(x, 0.13, z);
        root.add(mat);

        const table = buildSoban(rng, 1.0, true);
        table.position.set(x, 0.13, z + 1.1);
        root.add(table);

        const female = rng.chance(0.35);
        const figure = buildFigure(
          {
            height: female ? rng.range(1.48, 1.6) : rng.range(1.58, 1.74),
            sex: female ? 'female' : 'male',
            jeogori: rng.pick([CLOTH.hempWhite, 0xdcd3bd, 0xd0c8b0]),
            lower: rng.pick([0x6a6452, 0x4c5566, 0x5e4a3c, 0x3f4a35]),
            accent: rng.pick([0x8a3a2e, 0x35566e, 0x6a5a2e]),
            headwear: female ? 'kerchief' : rng.chance(0.5) ? 'gat' : 'headband',
            hair: female ? 'bun' : 'topknot',
            blind: true,
          },
          rng,
        );
        figure.root.position.set(x, 0.13, z);
        root.add(figure.root);

        // The crowd never casts shadows: twenty-four figures at forty meshes
        // each would triple the shadow pass for a contribution nobody sees.
        figure.root.traverse((obj) => {
          (obj as { castShadow?: boolean }).castShadow = false;
        });

        guests.push({
          figure,
          seat: new Vector3(x, 0.13, z),
          facing: Math.atan2(-x, HALL_Z + 8 - z),
          phase: rng.next() * 11,
          freqA: rng.range(0.32, 0.58),
          freqB: rng.range(0.18, 0.4),
          freqC: rng.range(0.5, 0.95),
          idleAmount: rng.range(0.7, 1.4),
          leanBias: rng.range(-0.05, 0.05),
          headBias: rng.range(-0.12, 0.12),
          crouchBias: rng.range(-0.035, 0.035),
          startleGain: rng.range(0.75, 1.25),
          startleDelay: rng.range(-0.35, 0.55),
        });
      }
    }

    // Attendants moving between the tables.
    const attendants: Figure[] = [];
    for (let i = 0; i < 5; i++) {
      const figure = buildFigure(
        {
          height: rng.range(1.52, 1.64),
          sex: 'female',
          jeogori: 0xf0e8d6,
          lower: rng.pick([0x35566e, 0x6a3a4a, 0x3f5a4a]),
          accent: DANCHEONG.jangdan,
          hair: 'braid',
        },
        rng,
      );
      root.add(figure.root);
      attendants.push(figure);
    }

    // ---- Sim Cheong, Empress -------------------------------------------------------
    const cheong = buildFigure(
      {
        height: 1.58,
        sex: 'female',
        jeogori: 0xf6ecdc,
        lower: CLOTH.royalRed,
        accent: CLOTH.royalGold,
        hair: 'bun',
        headwear: 'crown',
        overcoat: 0xb8352f,
      },
      rng,
    );
    cheong.root.name = 'cheong';
    root.add(cheong.root);

    // ---- Her father -----------------------------------------------------------------
    const father = buildFigure(
      {
        height: 1.63,
        sex: 'male',
        // Fifteen years older and much poorer than we last saw him.
        jeogori: 0xa79c88,
        lower: 0x6e6552,
        accent: 0x7a7059,
        hair: 'loose',
        blind: true,
      },
      rng,
    );
    father.root.name = 'father';
    root.add(father.root);

    const cane = buildCane(rng, 1.2);
    cane.position.set(-0.26, 0.92, 0.08);
    father.root.add(cane);

    // A single warm light that comes up on the two of them at the reunion.
    const reunionLight = new PointLight(0xfff0d4, 0, 22, 2);
    root.add(reunionLight);

    // This act's own shots range from the hall (HALL_Z = -26) out past the
    // gate wall (GATE_Z + 5 = 29) — a ~55-unit span, not "just a courtyard."
    // The previous call used 40, which is this class's bare default: it was
    // never actually widened for this act's geography, and the wide
    // establishing and travelling shots (1, 7, 10) render far darker than the
    // close ones — exactly the shots the reunion depends on for showing the
    // distance closing. Centring further out and widening the radius gives
    // the whole span real coverage instead of leaving the gate half of the
    // court right at the frustum edge.
    stage.focusShadows(new Vector3(0, 0, 2), 58);

    // ---- Camera ----------------------------------------------------------------------
    const shots: readonly Shot[] = [
      // 1. The whole court, from above the gate.
      move(
        0,
        [-4, 22, GATE_Z + 22, 0, 4, HALL_Z + 12],
        [-1, 14, GATE_Z + 10, 0, 3.4, HALL_Z + 12],
        [46, 40],
        easeInOutCubic,
        0.03,
      ),
      // 2. Down the aisle between the tables.
      move(
        11,
        [0, 1.9, GATE_Z + 2, 0, 2.6, HALL_Z + 9],
        [0, 1.85, GATE_Z - 12, 0, 2.6, HALL_Z + 9],
        [40, 36],
        easeInOutCubic,
        0.05,
      ),
      // 3. Her, on the throne, looking at a face and then the next.
      move(
        19,
        [3.6, 3.4, HALL_Z + 17.5, 0.2, 2.9, HALL_Z + 9.6],
        [2.4, 3.2, HALL_Z + 16.0, 0.2, 2.85, HALL_Z + 9.6],
        [38, 31],
        easeInOutCubic,
        0.035,
      ),
      // 4. Something at the gate, a long way off.
      move(
        26,
        [-2.6, 2.6, HALL_Z + 14, 0, 2.0, GATE_Z],
        [-2.0, 2.4, HALL_Z + 12, 0, 1.8, GATE_Z],
        [30, 24],
        easeInOutCubic,
        0.04,
      ),
      // 5. Him: an old man feeling his way in.
      move(
        33,
        [3.8, 1.85, GATE_Z + 3.5, 0.2, 1.45, GATE_Z - 3.5],
        [3.0, 1.75, GATE_Z + 0.5, 0.2, 1.42, GATE_Z - 6.0],
        [40, 34],
        easeInOutCubic,
        0.06,
      ),
      // 6. She is already on her feet and coming down.
      move(
        41.5,
        [5.6, 3.6, HALL_Z + 16, 0, 2.8, HALL_Z + 10],
        [7.2, 2.4, HALL_Z + 20, 0, 1.9, HALL_Z + 15],
        [42, 38],
        easeInOutCubic,
        0.09,
      ),
      // 7. She runs the length of the court. Handheld, wide, fast.
      move(
        46.5,
        [6.4, 1.9, HALL_Z + 22, 0.5, 1.7, HALL_Z + 28],
        [5.2, 1.8, GATE_Z - 12, 0.5, 1.6, GATE_Z - 7],
        [46, 42],
        easeInOutCubic,
        0.16,
      ),
      // 8. His face, and the moment.
      move(
        OPENING - 3.4,
        [1.9, 1.68, GATE_Z - 3.6, 0.1, 1.5, GATE_Z - 6.4],
        [1.35, 1.62, GATE_Z - 4.6, 0.1, 1.52, GATE_Z - 6.4],
        [34, 24],
        easeInOutCubic,
        0.055,
      ),
      // 9. He sees her. Reverse, and hold.
      move(
        OPENING + 3.5,
        [-3.4, 1.72, GATE_Z - 12.4, 0.35, 1.45, GATE_Z - 6.8],
        [-2.8, 1.68, GATE_Z - 11.2, 0.35, 1.42, GATE_Z - 6.8],
        [36, 31],
        easeInOutCubic,
        0.05,
      ),
      // 10. Two people, and behind them a hall full of people opening their eyes.
      move(
        65,
        [7.5, 3.2, GATE_Z - 12, 0.5, 1.6, GATE_Z - 6],
        [12, 8.5, GATE_Z - 2, 0, 2.4, HALL_Z + 16],
        [42, 46],
        easeOutCubic,
        0.04,
      ),
      hold(72, [10, 17, GATE_Z + 14, 0, 3, HALL_Z + 10], 48, 0.025),
    ];

    // ---- Runtime -------------------------------------------------------------------
    const THRONE_SEAT = new Vector3(0, 2.34, HALL_Z + 8.6);
    const MEET = new Vector3(0.4, 0.13, GATE_Z - 7.2);

    return {
      root,

      update({ t }, rig) {
        // --- Sim Cheong -----------------------------------------------------
        // Seated → rising → down the steps → running → holding him.
        const rise = ease(t, 39, 42, easeOutCubic);
        const descend = ease(t, 42, 45.5, easeInOutCubic);
        const run = ease(t, 45.5, 53.5, easeInOutCubic);
        const held = ease(t, OPENING + 2.5, OPENING + 6, easeOutCubic);

        const cx = lerp(0, MEET.x, run);
        const cz = lerp(
          lerp(THRONE_SEAT.z, HALL_Z + 13.5, descend),
          MEET.z + 0.95,
          run,
        );
        const cy = lerp(lerp(THRONE_SEAT.y, 0.13, descend), 0.13, run);
        cheong.root.position.set(cx, cy, cz);

        if (t < 39) {
          // Seated, scanning the hall face by face — a slow sweep, with pauses.
          const sweep = Math.sin(t * 0.23) * 0.75;
          cheong.setPose({
            bodyTurn: 0,
            crouch: 0.95,
            spineBend: 0.06,
            headTurn: sweep,
            headTilt: 0.1,
            armLSwing: 0.55,
            armRSwing: 0.55,
            elbowL: 1.35,
            elbowR: 1.35,
          });
        } else if (t < 45.5) {
          cheong.setPose({
            bodyTurn: 0,
            crouch: (1 - rise) * 0.95,
            spineBend: 0.04,
            headTilt: -0.06,
            armLSwing: 0.3,
            armRSwing: 0.3,
            elbowL: 0.55,
            elbowR: 0.55,
          });
        } else if (t < 53.5) {
          // Running. An empress in full court dress cannot really run, and the
          // short stride plus the held-up skirt is what says she is doing it
          // anyway.
          cheong.walk(gait(t, 1.35), 0.62, {
            bodyTurn: 0,
            spineBend: 0.16,
            armLSwing: 0.9,
            armLRaise: 0.25,
            elbowL: 1.15,
          });
        } else {
          cheong.setPose({
            bodyTurn: 0,
            spineBend: 0.1,
            headTilt: -0.1 + held * 0.24,
            armLSwing: 1.45 * held + 0.5,
            armRSwing: 1.45 * held + 0.5,
            armLRaise: 0.42 * held,
            armRRaise: 0.42 * held,
            elbowL: 0.55 + held * 0.9,
            elbowR: 0.55 + held * 0.9,
            lift: Math.sin(t * 0.7) * 0.008,
          });
        }

        // --- Her father --------------------------------------------------------
        const enter = ease(t, 24, 40, easeInOutCubic);
        const fz = lerp(GATE_Z + 6, MEET.z, enter);
        father.root.position.set(MEET.x + (1 - enter) * 1.2, 0.13, fz);

        if (t < OPENING - 3.2) {
          // Feeling his way in, cane first, head raised the way a blind man
          // listens rather than looks.
          if (enter < 0.98) {
            father.walk(gait(t, 0.55), 0.34, {
              bodyTurn: Math.PI,
              spineBend: 0.26,
              headTilt: -0.14,
              armLSwing: 0.75,
              armLRaise: 0.2,
              elbowL: 0.9,
            });
          } else {
            father.idle(t, 0.8, { bodyTurn: Math.PI, spineBend: 0.24, headTilt: -0.12 });
          }
        } else if (t < OPENING) {
          // He hears her. Everything stops.
          const startle = ease(t, OPENING - 3.2, OPENING - 1.6, easeOutCubic);
          const strain = ease(t, OPENING - 1.6, OPENING, easeInOutCubic);
          father.setPose({
            bodyTurn: Math.PI,
            spineBend: 0.24 - startle * 0.3 - strain * 0.12,
            headTilt: -0.12 - startle * 0.3,
            // The cane falls: the arm that held it drops and opens.
            armLSwing: 0.75 - startle * 0.85,
            armLRaise: 0.2 + startle * 0.35,
            elbowL: 0.9 - startle * 0.6,
            armRSwing: 0.2 + strain * 1.25,
            armRRaise: strain * 0.5,
            elbowR: 0.4 + strain * 0.5,
            lift: strain * 0.02,
          });
          cane.visible = startle < 0.6;
        } else {
          // Sight. He looks at her, and then at everything.
          const look = ease(t, OPENING, OPENING + 2.5, easeOutCubic);
          const embrace = ease(t, OPENING + 2.5, OPENING + 6, easeOutCubic);
          const wonder = ease(t, OPENING + 8, OPENING + 16, easeInOutCubic);
          cane.visible = false;
          father.setPose({
            bodyTurn: Math.PI,
            spineBend: -0.06 * look + embrace * 0.12,
            headTilt: -0.2 * look + wonder * 0.34,
            headTurn: wonder * Math.sin(t * 0.55) * 0.6,
            armLSwing: 0.4 + embrace * 1.35,
            armRSwing: 1.45 - look * 0.4 + embrace * 0.5,
            armLRaise: 0.28 + embrace * 0.4,
            armRRaise: 0.4 + embrace * 0.35,
            elbowL: 0.8 + embrace * 0.7,
            elbowR: 0.9 + embrace * 0.7,
          });
        }

        // --- The moment ---------------------------------------------------------
        // A hard blow-out: exposure to 5, fog to white, for about a third of a
        // second. Everything is still there behind it; it just cannot be seen —
        // which is the right way round for what is happening to him.
        const flash = pulse(t, OPENING - 0.22, OPENING + 1.25, 0.1);
        const eyesOpen = t >= OPENING;
        father.setEyesOpen(eyesOpen);

        // The rest of the hall follows, in a wave outwards from him. Each guest
        // also carries their own resting sway, fidget and head-wiggle — three
        // independent low frequencies plus a per-guest timing jitter on the
        // wave itself — so twenty-four people sitting still for a minute reads
        // as twenty-four people, not one prop repeated twenty-four times.
        for (const guest of guests) {
          const distance = guest.seat.distanceTo(MEET);
          const opensAt = OPENING + 2.5 + distance * 0.09 + guest.startleDelay;
          guest.figure.setEyesOpen(t >= opensAt);

          const startled = ease(t, opensAt - 0.4, opensAt + 1.2, easeOutCubic) * guest.startleGain;
          const seated = t < opensAt ? 0.95 + guest.crouchBias : 0.95 + guest.crouchBias - startled * 0.12;

          const sway = Math.sin(t * guest.freqA + guest.phase) * 0.045 * guest.idleAmount;
          const fidget = Math.sin(t * guest.freqB + guest.phase * 1.6) * 0.06 * guest.idleAmount;
          const wiggle = Math.sin(t * guest.freqC + guest.phase * 2.2) * 0.5 * guest.idleAmount;

          guest.figure.setPose({
            bodyTurn: guest.facing + startled * 0.3 + fidget * 0.15,
            crouch: seated,
            spineBend: 0.1 + guest.leanBias - startled * 0.16 + sway,
            headTilt: -0.08 + guest.headBias - startled * 0.3 + sway * 0.6,
            headTurn: startled * Math.sin(t * 0.8 + guest.phase) * 0.7 + wiggle * 0.4,
            armLSwing: 0.5 + startled * 0.9 + fidget,
            armRSwing: 0.5 + startled * 0.9 - fidget,
            armLRaise: startled * 0.5,
            armRRaise: startled * 0.5,
            elbowL: 1.3 - startled * 0.5,
            elbowR: 1.3 - startled * 0.5,
            lift: Math.sin(t * 0.6 + guest.phase) * 0.005,
          });
        }

        // Attendants circulate, then stop dead when the empress runs.
        for (let i = 0; i < attendants.length; i++) {
          const a = attendants[i];
          if (!a) continue;
          const lane = -12 + i * 6;
          const halted = t > 44;
          const along = halted ? 0.5 : (t * 0.05 + i * 0.2) % 1;
          const ax = lane;
          const az = HALL_Z + 14 + along * 26;
          a.root.position.set(ax, 0.13, az);
          if (halted) {
            a.idle(t + i * 4, 0.7, { bodyTurn: Math.PI, headTurn: 0.4 });
          } else {
            a.walk(gait(t, 0.5), 0.45, { bodyTurn: 0 });
          }
        }

        // --- Light and air --------------------------------------------------------
        const base = 1.02 + span(t, 60, 78) * 0.14;
        stage.setExposure(base + flash * 4.2);
        stage.setFogColor(flash > 0.3 ? 0xffffff : SKY.palaceDay.fog);
        stage.setFogDensity(lerp(0.0032, 0.02, clamp(flash * 1.4, 0, 1)));
        stage.key.intensity = SKY.palaceDay.sunIntensity + flash * 4;

        reunionLight.position.set(MEET.x, 1.9, MEET.z + 0.5);
        reunionLight.intensity = ease(t, OPENING, OPENING + 4, easeOutCubic) * 26;

        if (Math.abs(t - OPENING) < 0.1) rig.impulse(0.45, 3.0);

        for (const lantern of lanterns) {
          lantern.core.rotation.z = Math.sin(t * 0.7 + lantern.phase) * 0.05;
          lantern.core.rotation.x = Math.cos(t * 0.6 + lantern.phase * 1.3) * 0.04;
        }

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        // Geometry only.
      },
    };
  },
};
