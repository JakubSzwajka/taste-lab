/**
 * Internal ids for the select menu's radio items. Option strings are free-form,
 * so none of them may double as the "unset" item. Options get positional ids
 * and "unset" gets an id no option id can take.
 */
export const UNSET_ID = "unset";

const PREFIX = "option-";

/** The radio id for a value. An unknown value checks nothing (""). */
export function menuOptionId(
  options: readonly string[],
  value: string | undefined,
): string {
  if (value === undefined) return UNSET_ID;
  const i = options.indexOf(value);
  return i === -1 ? "" : `${PREFIX}${i}`;
}

/** The value for a radio id: an option, or undefined for "unset". */
export function menuOptionValue(
  options: readonly string[],
  id: string,
): string | undefined {
  if (!id.startsWith(PREFIX)) return undefined;
  const i = Number(id.slice(PREFIX.length));
  return Number.isInteger(i) ? options[i] : undefined;
}
