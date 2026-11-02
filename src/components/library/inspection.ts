/** A short-lived return address shared by Library route remounts. */
type Inspection = { name: string; example: string; target: string };
let inspection: Inspection | undefined;

export function inspectFrom(origin: Inspection) {
  inspection = origin;
}

export function returnToScreen(target: string) {
  return inspection?.target === target ? inspection : undefined;
}
