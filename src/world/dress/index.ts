import type { Dresser } from '../Decorator';
import type { DressStyle } from '../Districts';
import { SKETCH_DRESSERS } from './sketch';
import { SERENDIB_DRESSERS } from './serendib';
import { WONDERS_DRESSERS } from './wonders';
import { LANTERN_DRESSERS } from './lanterns';

/** Every district style, mapped to the function that dresses it. */
export const DRESSERS: Record<DressStyle, Dresser> = {
  ...SKETCH_DRESSERS,
  ...SERENDIB_DRESSERS,
  ...WONDERS_DRESSERS,
  ...LANTERN_DRESSERS,
};
