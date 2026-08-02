import { act01Farewell } from './act01Farewell';
import { act02Growing } from './act02Growing';
import { act03Vow } from './act03Vow';
import { act04Merchants } from './act04Merchants';
import { act05Indangsu } from './act05Indangsu';
import { act06DragonPalace } from './act06DragonPalace';
import { act07Lotus } from './act07Lotus';
import { act08Feast } from './act08Feast';
import type { Act } from '../core/types';

/**
 * The eight madang (마당) of Simcheongjeon, in order.
 *
 * Pansori is counted in madang — literally "yards", the open ground a
 * performance happens on — and a full Simcheongga runs several hours. This is
 * the spine of it: the eight turns the story cannot do without.
 */
export const ACTS: readonly Act[] = [
  act01Farewell,
  act02Growing,
  act03Vow,
  act04Merchants,
  act05Indangsu,
  act06DragonPalace,
  act07Lotus,
  act08Feast,
];
