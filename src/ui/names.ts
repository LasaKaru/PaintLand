import { t, type StringKey } from '../core/i18n';
import { CATALOGUE, type ShopItem } from '../gameplay/Profile';
import { ACTION_INFO, type ActionName } from '../core/Input';

/** A shop item's name in the player's language (falls back to the catalogue's English). */
export function itemLabel(item: ShopItem | string): string {
  const i = typeof item === 'string' ? CATALOGUE.find((c) => c.id === item) : item;
  if (!i) return String(item);
  const key = `item.${i.id}` as StringKey;
  const s = t(key);
  return s === key ? i.name : s;
}

/** A control's label in the player's language. */
export function actionLabel(action: ActionName): string {
  const key = `ctl.${action}` as StringKey;
  const s = t(key);
  return s === key ? ACTION_INFO.find((a) => a.action === action)?.label ?? action : s;
}

/** A controls group heading ("Driving", "On foot"…) in the player's language. */
export function actionGroupLabel(group: string): string {
  const key = `ctlg.${group.replace(/\s/g, '')}` as StringKey;
  const s = t(key);
  return s === key ? group : s;
}
