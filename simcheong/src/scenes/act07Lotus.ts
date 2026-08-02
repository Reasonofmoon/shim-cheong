import { CylinderGeometry, Group, PointLight, Vector3 } from 'three';
import { buildFigure, type Figure } from '../builders/figure';
import { applyVertexTint, meshOf, stillWater, surface } from '../builders/materials';
import { buildPaintedColumn } from '../builders/hanok';
import { buildLotus, buildLotusBed, buildLotusPad } from '../builders/lotus';
import { buildRidgelines, buildTerrain, rollingHills, scatterPines } from '../builders/nature';
import { animateShip, buildShip } from '../builders/ship';
import { buildFoldingScreen, buildHandLantern } from '../builders/props';
import { Motes, buildLightShafts } from '../builders/undersea';
import { Ocean } from '../builders/water';
import { CLOTH, DANCHEONG, NATURE, SKY } from '../core/palette';
import { ease, easeInOutCubic, easeOutCubic, lerp, pulse, span } from '../core/timeline';
import { hold, move, playShots, type Shot } from '../core/shot';
import type { Act, ActContext, ActRuntime } from '../core/types';

/**
 * Act VII — 연꽃.
 *
 * The Dragon King sends her back sealed in a lotus. The merchants, homeward
 * bound over the same water that took her, find the flower floating where the
 * sea had been at its worst, and carry it to the Emperor. In his pond, at
 * night, it opens.
 *
 * The act covers two locations. Rather than cut to black between them, they are
 * simply built a long way apart in the same world — the sea around the origin,
 * the palace pond three hundred units north — and the camera cuts across. It is
 * how a film would do it, and it costs nothing.
 */

const DURATION = 52;

const POND_Z = -300;
const POND_Y = 0;
/** The flower breaks the surface here. */
const SURFACE_AT = 12.5;

export const act07Lotus: Act = {
  id: 'lotus',
  chapter: '제7막',
  title: '연꽃으로 돌아오다',
  duration: DURATION,
  sky: SKY.lotusDawn,

  build({ rng, stage }: ActContext): ActRuntime {
    const root = new Group();

    // ---- The sea ---------------------------------------------------------------
    const ocean = new Ocean({
      size: 340,
      segments: 190,
      amplitude: 0.22,
      choppy: 0.55,
      shallow: 0x5f97a0,
      deep: 0x143a4a,
      foamAmount: 0.28,
      glossiness: 260,
    });
    root.add(ocean.mesh);
    stage.setFloor(0x2a3f42, -46);

    // Light coming down from a surface she is rising towards.
    const shafts = buildLightShafts(12, 26, 44, 0xbfe8dc, rng);
    shafts.group.position.y = -46;
    root.add(shafts.group);

    const motes = new Motes(500, new Vector3(26, 44, 26), 0.06, 0xc8ecec, rng, 0.8);
    motes.mesh.position.y = -46;
    motes.setOpacity(0);
    root.add(motes.mesh);

    // ---- The lotus ---------------------------------------------------------------
    const lotus = buildLotus(
      {
        // Sized so a grown woman can plausibly step out of it without the
        // flower dwarfing her; at 1.95 she was a doll inside a shrub.
        radius: 1.45,
        rings: 4,
        petalsPerRing: 8,
        petalColor: 0xf7e0e7,
        tipColor: 0xd9758f,
        innerLight: true,
      },
      rng,
    );
    root.add(lotus.group);

    const pad = buildLotusPad(3.1, rng);
    pad.visible = false;
    root.add(pad);

    // ---- The returning ship --------------------------------------------------------
    const ship = buildShip(
      { length: 15, beam: 4.8, depth: 1.8, masts: 1, cargo: 0, sailColor: 0xd5c49c },
      rng,
    );
    const shipNode = new Group();
    shipNode.add(ship.group);
    root.add(shipNode);

    const sailors: Figure[] = [];
    for (let i = 0; i < 4; i++) {
      const figure = buildFigure(
        {
          height: rng.range(1.63, 1.75),
          sex: 'male',
          jeogori: rng.pick([0xa89a80, 0x8d8471]),
          lower: 0x3a4450,
          accent: 0x7a3a2e,
          headwear: i === 0 ? 'gat' : 'headband',
          hair: 'topknot',
          ...(i === 0 ? { overcoat: CLOTH.merchantIndigo } : {}),
        },
        rng,
      );
      figure.root.position.set(-1.4 + i * 0.95, ship.deckY + 0.1, 4.6 - (i % 2) * 1.1);
      ship.group.add(figure.root);
      sailors.push(figure);
    }

    // ---- The palace pond, three hundred units north ---------------------------------
    const pondSet = new Group();
    pondSet.position.set(0, 0, POND_Z);
    root.add(pondSet);

    const height = rollingHills(0.7, 0.05, 909);
    pondSet.add(
      buildTerrain(
        { size: 170, segments: 90, height, color: 0x6a6f4c, highColor: 0x86834f, highStart: 0, highEnd: 0.8, tint: 0.07 },
        rng,
      ),
    );
    pondSet.add(buildRidgelines(4, 150, rng, 0x4e6070, 0x9fb0bd));
    pondSet.add(scatterPines(22, 78, height, rng, 24));

    // The pond itself: a shallow disc of still water inside a stone kerb.
    const pondWater = new CylinderGeometry(13, 13, 0.12, 40);
    pondWater.translate(0, POND_Y - 0.06, 0);
    pondSet.add(
      meshOf(
        pondWater,
        stillWater(0x1e3a46, 0x4a6a86, 0.3),
        false,
        false,
      ),
    );

    const kerb = applyVertexTint(new CylinderGeometry(13.9, 14.2, 0.55, 44, 1, true), rng, 0.05);
    kerb.translate(0, POND_Y - 0.1, 0);
    pondSet.add(meshOf(kerb, surface(NATURE.stone, { roughness: 0.94, doubleSide: true })));

    const bed = buildLotusBed(26, 11.5, rng);
    // Keep the ground clear right where Cheong stands (pond centre): an
    // unlucky scatter put a full-height background bloom directly behind her
    // head for the reveal shot, reading as a stray flower sprouting from her
    // crown. Thin the bed near the mark instead of re-seeding it -- the bed
    // draws from the shared rng stream, and every figure built after it
    // (pavilion, court, lanterns, the Emperor, Cheong herself) would shift if
    // the draw count changed.
    const heroKeepOut = 2.4;
    for (const child of [...bed.children]) {
      if (Math.hypot(child.position.x, child.position.z) < heroKeepOut) {
        bed.remove(child);
      }
    }
    pondSet.add(bed);

    // A pavilion on the near bank, so the flower is presented rather than just
    // floating in the middle of nowhere.
    const pavilion = new Group();
    pavilion.position.set(0, 0, 15.5);
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const column = buildPaintedColumn(3.6, 0.2, rng);
        column.position.set(sx * 2.6, 0, sz * 2.4);
        pavilion.add(column);
      }
    }
    const platform = applyVertexTint(new CylinderGeometry(3.6, 3.9, 0.5, 20), rng, 0.05);
    platform.translate(0, 0.25, 0);
    pavilion.add(meshOf(platform, surface(NATURE.stone, { roughness: 0.94 })));
    pondSet.add(pavilion);

    const screen = buildFoldingScreen(6, 2.6, rng, true);
    screen.position.set(0, 0.5, 13.0);
    screen.rotation.y = Math.PI;
    pondSet.add(screen);

    // Lantern-bearers ringing the pond, which is the whole light source at night.
    const lanternLights: PointLight[] = [];
    const court: Figure[] = [];
    for (let i = 0; i < 12; i++) {
      const a = -1.15 + (i / 11) * 2.3;
      const r = 16.5;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const figure = buildFigure(
        {
          height: rng.range(1.58, 1.74),
          sex: i % 3 === 0 ? 'female' : 'male',
          jeogori: CLOTH.hempWhite,
          lower: rng.pick([0x2f4356, 0x51364a, 0x3f4a35]),
          accent: DANCHEONG.jangdan,
          headwear: i % 3 === 0 ? 'none' : 'gat',
          hair: i % 3 === 0 ? 'bun' : 'topknot',
        },
        rng,
      );
      figure.root.position.set(x, height(x, z), z);
      figure.setFacing(Math.atan2(-x, -z));
      pondSet.add(figure.root);
      court.push(figure);

      if (i % 2 === 0) {
        const lantern = buildHandLantern(rng.pick([0xe0a838, 0xc8402f, 0xe8dcc0]), rng, 1.0);
        lantern.position.set(0.22, 0.5, 0.1);
        figure.root.add(lantern);
        const glow = new PointLight(0xffc98a, 14, 13, 2);
        glow.position.set(x + 0.5, height(x, z) + 1.9, z);
        pondSet.add(glow);
        lanternLights.push(glow);
      }
    }

    // The Emperor, on the pavilion.
    const emperor = buildFigure(
      {
        height: 1.74,
        sex: 'male',
        jeogori: CLOTH.royalGold,
        lower: CLOTH.royalRed,
        accent: CLOTH.royalGold,
        headwear: 'gat',
        hair: 'topknot',
        overcoat: CLOTH.royalRed,
      },
      rng,
    );
    emperor.root.position.set(0, 0.5, 15.5);
    emperor.setFacing(Math.PI);
    pondSet.add(emperor.root);

    // Sim Cheong, inside the flower until it opens.
    const cheong = buildFigure(
      {
        height: 1.57,
        sex: 'female',
        jeogori: 0xf6ecdc,
        lower: CLOTH.royalRed,
        accent: CLOTH.royalGold,
        hair: 'bun',
        headwear: 'crown',
      },
      rng,
    );
    cheong.root.name = 'cheong';
    cheong.root.visible = false;
    root.add(cheong.root);

    stage.focusShadows(new Vector3(0, 0, 0), 30);

    // ---- Camera ----------------------------------------------------------------------
    const shots: readonly Shot[] = [
      // 1. Below, looking up. The flower rising into the light.
      move(
        0,
        [3.6, -26, 5.5, 0, -18, 0],
        [2.2, -12, 3.6, 0, -5.5, 0],
        [52, 44],
        easeInOutCubic,
        0.045,
      ),
      // 2. It breaks the surface. The camera comes up with it.
      move(
        9,
        [3.4, -3.2, 4.6, 0, -0.6, 0],
        [3.0, 1.35, 4.2, 0, 0.85, 0],
        [42, 36],
        easeOutCubic,
        0.04,
      ),
      // 3. Alone on a flat sea at sunrise.
      move(
        15.5,
        [4.6, 1.1, 5.4, 0, 0.9, 0],
        [-2.0, 2.2, 7.2, 0, 0.9, 0],
        [38, 42],
        easeInOutCubic,
        0.035,
        ),
      // 4. The ship comes up on it.
      move(
        21.5,
        [-9, 3.4, 12, -1, 1.2, 1],
        [-6.2, 2.6, 8.4, 0.4, 1.1, 0.5],
        [42, 36],
        easeInOutCubic,
        0.05,
      ),
      // 5. Cut north: the pond at night, the flower set out on the water.
      move(
        28,
        [-9, 3.4, POND_Z + 20, 0, 1.0, POND_Z + 3],
        [-5.5, 2.6, POND_Z + 15.5, 0, 1.0, POND_Z + 1],
        [42, 36],
        easeInOutCubic,
        0.035,
      ),
      // 6. The bloom. Close, and let it take its time.
      move(
        35,
        [3.4, 1.9, POND_Z + 6.6, 0, 1.5, POND_Z + 0.6],
        [2.2, 2.3, POND_Z + 5.4, 0, 1.9, POND_Z + 0.5],
        [36, 30],
        easeInOutCubic,
        0.03,
      ),
      // 7. She stands up out of it.
      move(
        43,
        [3.0, 2.6, POND_Z + 6.2, 0, 2.0, POND_Z + 0.4],
        [4.6, 4.0, POND_Z + 9.0, 0, 1.8, POND_Z + 0.4],
        [34, 38],
        easeInOutCubic,
        0.03,
      ),
      hold(48.5, [7, 6.5, POND_Z + 15, 0, 1.8, POND_Z + 1], 42, 0.025),
    ];

    // ---- Runtime --------------------------------------------------------------------
    const inPond = (t: number): boolean => t >= 27.4;

    return {
      root,

      update({ t, dt }, rig) {
        ocean.update(t, stage);
        shafts.update(t);
        motes.update(dt, t);

        const atSea = !inPond(t);
        ocean.mesh.visible = atSea;
        shafts.group.visible = t < 14;
        motes.setOpacity(t < 12 ? 0.5 * (1 - span(t, 8, 12.5)) : 0);
        pondSet.visible = !atSea;
        ship.group.visible = atSea;

        if (atSea) {
          // --- Rising and floating -------------------------------------------
          const rise = ease(t, 0, SURFACE_AT, easeOutCubic);
          const y = lerp(-30, 0, rise);
          if (t < SURFACE_AT) {
            lotus.group.position.set(0, y, 0);
            lotus.group.rotation.set(Math.sin(t * 0.3) * 0.12, t * 0.22, Math.cos(t * 0.26) * 0.12);
            lotus.setOpen(0);
            if (lotus.light) lotus.light.intensity = 30 * (1 - rise * 0.4);
          } else {
            // Floating: it rides the same surface the water shader is drawing.
            ocean.float(lotus.group, 0, 0, 0.05, 0.5);
            lotus.group.rotation.y = t * 0.08;
            lotus.setOpen(0);
            if (lotus.light) lotus.light.intensity = 14;
          }

          // The merchants' ship, homeward, comes alongside.
          const approach = ease(t, 19, 27, easeInOutCubic);
          const sx = lerp(-46, -7.5, approach);
          const sz = lerp(30, 3.5, approach);
          ocean.float(shipNode, sx, sz, -1.05, 0.45);
          shipNode.rotation.y = lerp(-0.9, -0.35, approach);
          animateShip(ship, t, 0.5 - approach * 0.35, 0);
          for (const sail of ship.sails) sail.scale.y = lerp(1, 0.25, approach);

          for (let i = 0; i < sailors.length; i++) {
            const s = sailors[i];
            if (!s) continue;
            const point = ease(t, 23, 26, easeOutCubic);
            s.setPose({
              bodyTurn: 3.1,
              spineBend: point * 0.25,
              headTilt: point * 0.12,
              armRSwing: 0.3 + point * (i === 0 ? 1.5 : 0.7),
              armRRaise: point * 0.3,
              elbowR: 1.1 - point * 0.8,
              armLSwing: 0.25,
              elbowL: 0.5,
            });
          }
        } else {
          // --- The pond ---------------------------------------------------------
          // Pond geometry lives inside pondSet; the lotus and pad do not, so
          // they are placed in world space with the pond's offset applied.
          pad.visible = true;
          pad.position.set(0, 0.02, POND_Z);

          // Retimed 5s earlier (was 33.5-45 / 41.5-48) so the bloom and her
          // emergence actually happen during the caption that narrates them
          // ("어느 밤 연꽃이 스스로 열리며 그 속에서 처녀 하나 걸어 나오니—",
          // narration.lotus at 32.8-41.0). Previously `emerge` did not start
          // until 41.5 -- after that caption had already ended -- so the
          // entire line played over a flower with no one visibly stepping out
          // of it. The two windows keep their original durations and the
          // ~0.7 bloom-progress point at which emerge used to begin, so the
          // pacing of each animation is unchanged, only its position in time.
          const bloom = ease(t, 28.5, 40, easeInOutCubic);
          lotus.group.position.set(0, 0.12 + bloom * 0.25, POND_Z);
          lotus.group.rotation.set(0, Math.PI * 0.15, 0);
          lotus.setOpen(bloom);
          if (lotus.light) lotus.light.intensity = lerp(34, 10, bloom);

          // She rises out of the open flower.
          const emerge = ease(t, 36.5, 43, easeOutCubic);
          cheong.root.visible = emerge > 0.01;
          cheong.root.position.set(0, lerp(-0.5, 0.55, emerge), POND_Z + 0.1);
          // Facing 0 (the figure rig's default, +z), not PI: the Emperor sits
          // at pondSet z +15.5 facing -z (toward the pond centre) and the
          // whole court ring faces centre the same way, so "forward" for
          // everyone watching is +z. A PI turn here put Cheong's back to the
          // Emperor, the court, and the camera for the entire reveal --
          // confirmed against lotus-t47.jpeg, which showed hair and the back
          // of the robe instead of her face at the exact "she stands up out
          // of it" beat.
          cheong.root.rotation.y = 0;
          cheong.setPose({
            bodyTurn: 0,
            crouch: (1 - emerge) * 0.85,
            spineBend: (1 - emerge) * 0.5,
            headTilt: (1 - emerge) * 0.35 - emerge * 0.06,
            armLSwing: 0.3 + emerge * 0.25,
            armRSwing: 0.3 + emerge * 0.25,
            armLRaise: emerge * 0.35,
            armRRaise: emerge * 0.35,
            elbowL: 0.9 - emerge * 0.55,
            elbowR: 0.9 - emerge * 0.55,
            lift: Math.sin(t * 0.5) * 0.01,
          });

          // The court reacts: a ripple of bows outward from the centre.
          for (let i = 0; i < court.length; i++) {
            const figure = court[i];
            if (!figure) continue;
            const delay = 44 + Math.abs(i - court.length / 2) * 0.22;
            const bow = ease(t, delay, delay + 1.6, easeOutCubic);
            figure.bow(bow * 0.65, { bodyTurn: figure.root.rotation.y });
          }
          const emperorBow = ease(t, 45.5, 47.5, easeOutCubic);
          emperor.setPose({
            bodyTurn: Math.PI,
            spineBend: emperorBow * 0.32,
            headTilt: emperorBow * 0.2,
            armLSwing: 0.35,
            armRSwing: 0.35,
            elbowL: 1.2,
            elbowR: 1.2,
          });

          for (const light of lanternLights) {
            light.intensity = 14 * (0.9 + Math.sin(t * 4.7 + light.position.x) * 0.1);
          }
        }

        // --- Atmosphere ---------------------------------------------------------
        // Underwater at the start, dawn on the sea, then night at the pond, with
        // the flower's own light taking over at the very end.
        const submerged = 1 - span(t, 8, 13);
        const night = span(t, 27, 29);
        stage.setFogColor(
          submerged > 0.5 ? 0x16414c : night > 0.5 ? 0x2b3346 : SKY.lotusDawn.fog,
        );
        stage.setFogDensity(lerp(0.0058, 0.03, submerged) + night * 0.004);
        stage.setExposure(lerp(1.0, 0.72, submerged) - night * 0.08 + span(t, 42, 50) * 0.2);
        stage.setSunHaze(lerp(1.2, 0.2, Math.max(submerged, night)));
        stage.key.intensity = lerp(SKY.lotusDawn.sunIntensity, 0.75, night);
        stage.ambient.intensity = lerp(SKY.lotusDawn.ambientIntensity, 0.95, night);

        // A soft bloom of light at the moment the petals part.
        const spark = pulse(t, 35.5, 39, 0.25);
        if (spark > 0.01) stage.setExposure(stage.renderer.toneMappingExposure + spark * 0.35);

        playShots(shots, t, rig, DURATION);
      },

      dispose() {
        ocean.dispose();
        motes.dispose();
      },
    };
  },
};
