import type { Dresser } from '../Decorator';
import type { DressStyle } from '../Districts';
import { SKETCH_DRESSERS } from './sketch';
import { SERENDIB_DRESSERS } from './serendib';
import { WONDERS_DRESSERS } from './wonders';
import { LANTERN_DRESSERS } from './lanterns';
import { POSTCARD_DRESSERS } from './postcards';
import { CITY_DRESSERS } from './cities';
import { BRITAIN_DRESSERS } from './britain';
import { JAPAN_DRESSERS } from './japan';
import { INDIA_DRESSERS } from './india';
import { CHINA_DRESSERS } from './china';
import { KOREA_DRESSERS } from './korea';
import { GERMANY_DRESSERS } from './germany';
import { CANADA_DRESSERS } from './canada';
import { AUSTRALIA_DRESSERS } from './australia';

/** Each chapter's own dresser table (a test checks that no two share a style). */
export const DRESSER_GROUPS: Record<string, Partial<Record<DressStyle, Dresser>>> = {
  SKETCH_DRESSERS,
  SERENDIB_DRESSERS,
  WONDERS_DRESSERS,
  LANTERN_DRESSERS,
  POSTCARD_DRESSERS,
  CITY_DRESSERS,
  BRITAIN_DRESSERS,
  JAPAN_DRESSERS,
  INDIA_DRESSERS,
  CHINA_DRESSERS,
  KOREA_DRESSERS,
  GERMANY_DRESSERS,
  CANADA_DRESSERS,
  AUSTRALIA_DRESSERS,
};

/** Every district style, mapped to the function that dresses it. */
export const DRESSERS: Record<DressStyle, Dresser> = {
  ...SKETCH_DRESSERS,
  ...SERENDIB_DRESSERS,
  ...WONDERS_DRESSERS,
  ...LANTERN_DRESSERS,
  ...POSTCARD_DRESSERS,
  ...CITY_DRESSERS,
  ...BRITAIN_DRESSERS,
  ...JAPAN_DRESSERS,
  ...INDIA_DRESSERS,
  ...CHINA_DRESSERS,
  ...KOREA_DRESSERS,
  ...GERMANY_DRESSERS,
  ...CANADA_DRESSERS,
  ...AUSTRALIA_DRESSERS,
};
