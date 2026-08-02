import { BoxGeometry, CylinderGeometry, Group, Vector3 } from 'three';
import { buildFigure, type Figure } from '../builders/figure';
import { applyVertexTint, meshOf, surface } from '../builders/materials';
import { buildHomestead } from '../builders/hanok';
import {
  buildReeds,
  buildRidgelines,
  buildRocks,
  buildTerrain,
  rollingHills,
  scatterPines,
  type HeightFn,
} from '../builders/nature';
import { animateShip, buildShip } from '../builders/ship';
import { Ocean } from '../builders/water';
import { buildCane, buildRiceStack, buildSoban } from '../builders/props';
import { CLOTH, NATURE, SEA, SKY } from '../core/palette';
import { clamp, ease, easeInOutCubic, easeOutCubic, gait, span } from '../core/timeline';
import { hold, move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act IV — 남경 상인.
 *
 * Merchants bound for Nanjing need a girl to give to the Indangsu crossing.
 * Sim Cheong sells herself for the three hundred sacks her father promised.
 * She cooks him breakfast, tells him nothing, and goes.
 *
 * The staging problem: the audience knows and the father does not, and the act
 * has to hold both at once. So the two are almost never in the same frame after
 * the deal is struck — she is shot with the ship behind her and he is shot with
 * the rice behind him, and only in the very last shot do they share a frame,
 * once she is already aboard.
 */

const DURATION = 52;

const SHORE_Z = 4;
const SHIP_POS = new Vector3(9, 0, -13);
const HOUSE_POS = new Vector3(-19, 0, 22);

export const act04Merchants: Act = {
  id: 'merchants',
  chapter: '제4막',
  title: '몸을 팔아 삼백 석',
  duration: DURATION,
  sky: SKY.harbourDawn,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();

    // Land on the +Z side of the shoreline, sea on the -Z side.
    const base = rollingHills(1.0, 0.03, 211);
    const height: HeightFn = (x, z) =>
      base(x, z) + clamp((z - SHORE_Z) * 0.22, -3.5, 5.5) - 0.4;

    root.add(
      buildTerrain(
        {
          size: 260,
          segments: 120,
          height,
          color: 0x6a6449,
          highColor: 0x7d7a56,
          highStart: 0,
          highEnd: 3.5,
          tint: 0.08,
        },
        rng,
      ),
    );
    // Below the ocean plane, so the horizon reads as water rather than a rim.
    stage.setFloor(SEA.deep, -3.2);

    root.add(buildRidgelines(4, 200, rng, 0x54607a, 0x9aa4b4));
    root.add(scatterPines(26, 130, height, rng, 42));
    root.add(buildRocks(34, 40, rng, 1.2));

    const reeds = buildReeds(320, 22, rng, 1.3);
    reeds.position.set(-22, height(-22, SHORE_Z + 2) + 0.1, SHORE_Z + 2);
    root.add(reeds);

    // ---- The sea ------------------------------------------------------------
    const ocean = new Ocean({
      size: 520,
      segments: 200,
      amplitude: 0.34,
      choppy: 0.85,
      shallow: 0x4a7f86,
      deep: 0x16323f,
      foamAmount: 0.45,
      glossiness: 180,
    });
    ocean.mesh.position.y = -1.5;
    root.add(ocean.mesh);

    // ---- The quay -----------------------------------------------------------
    const quay = new Group();
    const stoneMat = surface(NATURE.stone, { roughness: 0.96 });
    const deck = applyVertexTint(new BoxGeometry(9, 1.9, 16), rng, 0.06);
    deck.translate(0, -0.55, 0);
    quay.add(meshOf(deck, stoneMat));
    for (let i = 0; i < 7; i++) {
      const bollard = new CylinderGeometry(0.16, 0.2, 0.7, 7);
      bollard.translate(-3.6 + (i % 2) * 7.2, 0.75, -6 + Math.floor(i / 2) * 3.2);
      quay.add(meshOf(bollard, surface(0x4a3a2a, { roughness: 0.94 })));
    }
    quay.position.set(6, 0, -3);
    quay.rotation.y = -0.16;
    root.add(quay);

    // ---- The ship -----------------------------------------------------------
    const ship = buildShip(
      { length: 15, beam: 4.8, depth: 1.8, masts: 1, cargo: 22, sailColor: 0xcdbb92 },
      rng,
    );
    ship.group.rotation.y = -0.22;
    const shipNode = new Group();
    shipNode.add(ship.group);
    root.add(shipNode);

    // ---- Sim's house, and the rice ------------------------------------------
    const home = buildHomestead(rng, { kan: 2, roofing: 'thatch', weathered: 0.7, depth: 3.6 });
    home.group.position.set(HOUSE_POS.x, height(HOUSE_POS.x, HOUSE_POS.z), HOUSE_POS.z);
    home.group.rotation.y = 0.85;
    root.add(home.group);

    const rice = buildRiceStack(24, rng);
    rice.position.set(HOUSE_POS.x + 3.6, height(HOUSE_POS.x + 3.6, HOUSE_POS.z + 2), HOUSE_POS.z + 2);
    rice.rotation.y = 0.3;
    rice.visible = false;
    root.add(rice);

    const table = buildSoban(rng, 1.05, true);
    table.position.set(HOUSE_POS.x + 1.4, height(HOUSE_POS.x + 1.4, HOUSE_POS.z + 3.4) + 0.02, HOUSE_POS.z + 3.4);
    table.visible = false;
    root.add(table);

    // ---- People --------------------------------------------------------------
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

    // Merchants: indigo overcoats and gat, which reads immediately as "not from
    // here" against a village of undyed hemp.
    const merchants: Figure[] = [];
    const merchantSpots: Array<[number, number]> = [
      [4.6, -1.2],
      [6.4, -2.6],
      [3.2, -3.4],
      [7.8, -0.4],
      [5.2, -5.0],
    ];
    for (let i = 0; i < merchantSpots.length; i++) {
      const spot = merchantSpots[i] ?? [0, 0];
      const figure = buildFigure(
        {
          height: rng.range(1.63, 1.76),
          sex: 'male',
          jeogori: CLOTH.hempWhite,
          lower: 0x3a4450,
          accent: 0x8a3a2e,
          headwear: i < 2 ? 'gat' : 'headband',
          hair: 'topknot',
          ...(i < 2 ? { overcoat: CLOTH.merchantIndigo } : {}),
        },
        rng,
      );
      figure.root.position.set(spot[0], 1.35, spot[1]);
      figure.setFacing(Math.PI + 0.3);
      quay.add(figure.root);
      merchants.push(figure);
    }

    stage.focusShadows(new Vector3(2, 0, 0), 34);

    // ---- Camera ---------------------------------------------------------------
    const gQuay = 1.35;
    const gHouse = height(HOUSE_POS.x + 2, HOUSE_POS.z + 3);

    const shots: readonly Shot[] = [
      // 1. The harbour at first light. The ship is already waiting.
      move(
        0,
        [-16, 12, 26, 8, 2, -8],
        [-9, 8.4, 19, 9, 2, -10],
        [42, 37],
        easeInOutCubic,
        0.035,
      ),
      // 2. She walks out onto the quay to the merchants.
      move(
        9,
        [-1.6, gQuay + 2.0, 9.5, 5.4, gQuay + 1.25, 0.5],
        [0.4, gQuay + 1.8, 7.4, 6.0, gQuay + 1.25, -0.4],
        [40, 34],
        easeInOutCubic,
        0.05,
      ),
      // 3. The price, from behind the merchants' shoulders.
      // The previous mark put the camera *at* the merchant cluster's own
      // world position, which put the lens inside the group instead of
      // behind it — every merchant fell outside the (narrow, ~30fov) view
      // cone or right on top of the near plane, so none of them actually
      // rendered. Anchored here one merchant-width further back along the
      // cluster-centroid -> Cheong sightline (quay-local spot [4.6,-1.2]
      // rotated by quay.rotation.y=-0.16, translated by quay.position, then
      // offset back from the cluster centroid) so the nearest merchant's
      // silhouette actually falls inside the frustum, foreground-left, with
      // Cheong held in view beyond. Fov opened up to give that silhouette
      // room instead of clipping it.
      move(
        16,
        [14.1, gQuay + 1.55, -6.55, 3.4, gQuay + 1.32, 2.5],
        [13.8, gQuay + 1.5, -6.35, 3.3, gQuay + 1.3, 2.6],
        [44, 38],
        easeInOutCubic,
        0.045,
      ),
      // 4. The rice arrives at the house. He is delighted.
      move(
        22,
        [-11.5, gHouse + 2.6, 30, -17.6, gHouse + 1.5, 23.6],
        [-13.0, gHouse + 2.2, 28.6, -17.4, gHouse + 1.45, 23.4],
        [40, 35],
        easeInOutCubic,
        0.045,
      ),
      // 5. The last breakfast. She watches him eat.
      // Pulled back from the original mark, which sat close enough to the
      // homestead's south-east wall corner (house center at HOUSE_POS,
      // rotation.y 0.85) to fill most of the frame with dark siding instead
      // of the two figures and the rice.
      move(
        29.5,
        [-11.0, gHouse + 2.0, 30.0, -17.8, gHouse + 1.15, 25.2],
        [-11.6, gHouse + 1.9, 29.4, -18.0, gHouse + 1.1, 25.0],
        [36, 30],
        easeInOutCubic,
        0.04,
      ),
      // 6. She walks away down to the water. Her back, all the way.
      move(
        37,
        [-10, gHouse + 2.4, 24.5, -4, 1.4, 6],
        [-6, gHouse + 2.0, 20.0, 4, 1.2, -2],
        [38, 34],
        easeInOutCubic,
        0.05,
      ),
      // 7. The ship stands out. He is a small shape on the shore.
      // He's meant to read as small, not as cropped — at t~47 he sits close
      // to the edge of a 40-44fov cone (camera looking down on him from well
      // above), and the frame was cutting his silhouette at the border
      // instead of containing it. Widened fov here and in the closing hold
      // so his full (still small) shape stays inside the frame.
      move(
        44,
        [-6, 6.5, 12, 10, 2, -14],
        [-16, 11, 18, 6, 2, -20],
        [46, 51],
        easeOutCubic,
        0.03,
      ),
      hold(49.5, [-22, 13, 22, 4, 2, -22], 54, 0.025),
    ];

    // ---- Runtime ---------------------------------------------------------------
    const shipRest = new Vector3(SHIP_POS.x, 0, SHIP_POS.z);

    return {
      root,

      update({ t }, rig) {
        ocean.update(t, stage);

        // The ship lies alongside until she is aboard, then stands out to sea.
        const cast = ease(t, 42, 52, easeInOutCubic);
        const sx = shipRest.x + cast * 6;
        const sz = shipRest.z - cast * 30;
        ocean.float(shipNode, sx, sz, -1.05, 0.42);
        animateShip(ship, t, 0.35 + cast * 0.8, 0.1);
        for (const sail of ship.sails) sail.scale.y = 0.18 + cast * 0.82;

        // --- Beats -----------------------------------------------------------
        const riceDelivered = t >= 20.5;
        rice.visible = riceDelivered;
        table.visible = t >= 27.5 && t < 40;

        if (t < 16) {
          // She crosses the quay to the merchants.
          const walk = ease(t, 8.5, 15, easeInOutCubic);
          const cx = -2.4 + walk * 6.2;
          const cz = 6.0 - walk * 3.6;
          cheong.root.position.set(cx, cz > 1.5 ? height(cx, cz) : gQuay - 0.02, cz);
          if (walk > 0.02 && walk < 0.98) {
            cheong.walk(gait(t, 0.62), 0.55, { bodyTurn: 2.1 });
          } else {
            cheong.idle(t, 0.7, { bodyTurn: 2.1 });
          }

          father.root.position.set(
            HOUSE_POS.x + 1.2,
            height(HOUSE_POS.x + 1.2, HOUSE_POS.z + 2.6),
            HOUSE_POS.z + 2.6,
          );
          father.idle(t, 0.6, { bodyTurn: 1.2 });
        } else if (t < 21) {
          // The offer. She bows; the merchants do not move for a beat.
          const bow = ease(t, 16.5, 19, easeOutCubic) * (1 - ease(t, 20, 21, easeInOutCubic));
          cheong.root.position.set(3.4, gQuay - 0.02, 2.4);
          cheong.bow(bow * 0.85, { bodyTurn: 2.35 });
          father.idle(t, 0.6, { bodyTurn: 1.2 });
        } else if (t < 36) {
          // At the house: rice stacked, then the last meal.
          cheong.root.position.set(
            HOUSE_POS.x + 2.4,
            height(HOUSE_POS.x + 2.4, HOUSE_POS.z + 4.2),
            HOUSE_POS.z + 4.2,
          );
          father.root.position.set(
            HOUSE_POS.x + 0.5,
            height(HOUSE_POS.x + 0.5, HOUSE_POS.z + 3.0),
            HOUSE_POS.z + 3.0,
          );

          if (t < 27.5) {
            // He runs his hands over the sacks, laughing.
            const feel = ease(t, 22, 26, easeOutCubic);
            father.setPose({
              bodyTurn: 0.9,
              spineBend: 0.2 * feel,
              headTilt: -0.12,
              armLSwing: 1.15 * feel,
              armRSwing: 1.25 * feel,
              armLRaise: 0.24 * feel,
              armRRaise: 0.28 * feel,
              elbowL: 0.85,
              elbowR: 0.7,
            });
            cheong.idle(t, 0.55, { bodyTurn: 2.6, headTilt: 0.12, spineBend: 0.06 });
          } else {
            // He eats. She kneels opposite and does not eat.
            const eat = Math.sin(t * 1.6) * 0.5 + 0.5;
            father.kneel(0.95, {
              bodyTurn: 1.15,
              spineBend: 0.55 + eat * 0.14,
              headTilt: 0.34,
              armRSwing: 1.15 + eat * 0.35,
              elbowR: 1.5 + eat * 0.5,
              armLSwing: 0.9,
              elbowL: 1.1,
            });
            // Her stillness against his movement is the whole shot.
            cheong.kneel(0.95, {
              bodyTurn: 2.55,
              spineBend: 0.42,
              headTilt: 0.24 + Math.sin(t * 0.35) * 0.05,
              armLSwing: 0.7,
              armRSwing: 0.7,
              elbowL: 0.9,
              elbowR: 0.9,
            });
          }
        } else if (t < 44) {
          // She walks down to the water; he stays kneeling at the table.
          const walk = ease(t, 36.5, 43, easeInOutCubic);
          const cx = HOUSE_POS.x + 2.4 + walk * 22;
          const cz = HOUSE_POS.z + 4.2 - walk * 24;
          const onQuay = cz < 3;
          cheong.root.position.set(cx, onQuay ? gQuay - 0.02 : height(cx, cz), cz);
          cheong.walk(gait(t, 0.6), 0.6, { bodyTurn: 2.4, spineBend: 0.04 });

          father.kneel(0.95, {
            bodyTurn: 1.15,
            spineBend: 0.5,
            headTilt: 0.3,
            armLSwing: 0.7,
            armRSwing: 0.7,
            elbowL: 1.0,
            elbowR: 1.0,
          });
        } else {
          // Aboard. He has got as far as the shore and stopped.
          cheong.root.position.set(0, ship.deckY + 0.1, 3.2);
          cheong.root.rotation.y = Math.PI;
          if (cheong.root.parent !== ship.group) ship.group.add(cheong.root);
          cheong.setPose({
            bodyTurn: Math.PI,
            spineBend: 0.05,
            headTurn: Math.sin(t * 0.3) * 0.1,
            armLSwing: 0.12,
            armRSwing: 0.12,
            elbowL: 0.3,
            elbowR: 0.3,
          });

          const rush = ease(t, 44, 49, easeOutCubic);
          const fx = HOUSE_POS.x + 2 + rush * 14;
          const fz = HOUSE_POS.z + 3 - rush * 18;
          father.root.position.set(fx, height(fx, fz), fz);
          if (rush < 0.94) {
            father.walk(gait(t, 0.95), 0.7, { bodyTurn: 2.35, spineBend: 0.24 });
          } else {
            father.reach(0.85 + Math.sin(t * 1.4) * 0.1, 0.45, { bodyTurn: 2.35, spineBend: 0.2 });
          }
        }

        for (let i = 0; i < merchants.length; i++) {
          const m = merchants[i];
          if (!m) continue;
          // They crew the ship bound for Nanjing, so once it stands out to
          // sea (t >= 44, same threshold as the "aboard" branch above) they
          // cannot still be a static row on the quay behind the father's
          // solitary reach for the departed ship.
          m.root.visible = t < 44;
          if (m.root.visible) m.idle(t + i * 3.1, 0.75, { bodyTurn: Math.PI + 0.3 });
        }

        // The dawn comes up a little as the act runs.
        stage.setExposure(0.94 + span(t, 0, 44) * 0.16);

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        ocean.dispose();
      },
    };
  },
};
