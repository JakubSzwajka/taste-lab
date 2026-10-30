/**
 * Library controls: `meta.json` `controls` and per-example `args`. Additive: an
 * entry without them renders exactly as before. Pure, so the CLI and the app share it.
 */

export const CONTROL_KINDS = ["boolean", "select", "text", "number"] as const;
export type ControlKind = (typeof CONTROL_KINDS)[number];
export type ControlValue = boolean | string | number;
/** Prop name -> value. Unset props are absent. */
export type ControlValues = Record<string, ControlValue>;

export type LibraryControl = {
  prop: string;
  kind: ControlKind;
  /** Select only: the values to choose from. */
  options?: string[];
  default?: ControlValue;
  label?: string;
};

const IDENT_RE = /^[A-Za-z_$][\w$]*$/;
// React keeps `key` and `ref` for itself, and `__proto__` would not survive a
// plain object as an own key in every code path.
const RESERVED = new Set(["key", "ref", "__proto__"]);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Why `value` does not fit `control`, or null when it fits. */
export function valueProblem(
  control: Pick<LibraryControl, "kind" | "options">,
  value: unknown,
): string | null {
  switch (control.kind) {
    case "boolean":
      return typeof value === "boolean" ? null : "must be true or false";
    case "text":
      return typeof value === "string" ? null : "must be a string";
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : "must be a finite number";
    case "select":
      return typeof value === "string" &&
        (control.options ?? []).includes(value)
        ? null
        : `must be one of its options (${(control.options ?? []).join(", ")})`;
  }
}

/**
 * Validates `controls`. Returns readable errors and the controls that are valid,
 * by prop, so `args` can still be checked against them.
 */
export function validateControls(data: unknown): {
  errors: string[];
  valid: Map<string, LibraryControl>;
  /** Every prop name declared, valid or not. */
  declared: Set<string>;
} {
  const errors: string[] = [];
  const valid = new Map<string, LibraryControl>();
  const declared = new Set<string>();
  if (data === undefined) return { errors, valid, declared };
  if (!Array.isArray(data)) {
    errors.push("controls must be an array (or left out)");
    return { errors, valid, declared };
  }
  data.forEach((c, i) => {
    const at = `controls[${i}]`;
    if (!isObj(c)) {
      errors.push(`${at} must be an object`);
      return;
    }
    const before = errors.length;
    const prop = c.prop;
    if (typeof prop !== "string" || !IDENT_RE.test(prop)) {
      errors.push(`${at}.prop must be a prop name like status`);
    } else if (RESERVED.has(prop)) {
      errors.push(`${at}.prop "${prop}" is reserved`);
    } else if (declared.has(prop)) {
      errors.push(`${at}.prop "${prop}" is duplicated`);
    }
    if (typeof prop === "string") declared.add(prop);
    const kind = c.kind;
    const kindOk =
      typeof kind === "string" &&
      (CONTROL_KINDS as readonly string[]).includes(kind);
    if (!kindOk) {
      errors.push(`${at}.kind must be one of ${CONTROL_KINDS.join(", ")}`);
    }
    const options = c.options;
    if (kind === "select") {
      const good =
        Array.isArray(options) &&
        options.length > 0 &&
        options.every((o) => typeof o === "string" && o !== "") &&
        new Set(options).size === options.length;
      if (!good) {
        errors.push(
          `${at}.options must be a non-empty array of distinct non-empty strings for kind select`,
        );
      }
    } else if (options !== undefined) {
      errors.push(`${at}.options is only allowed for kind select`);
    }
    if (
      c.label !== undefined &&
      (typeof c.label !== "string" || c.label === "")
    ) {
      errors.push(`${at}.label must be a non-empty string`);
    }
    if (errors.length === before && c.default !== undefined) {
      const bad = valueProblem(c as LibraryControl, c.default);
      if (bad) errors.push(`${at}.default ${bad}`);
    }
    if (errors.length === before)
      valid.set(prop as string, c as LibraryControl);
  });
  return { errors, valid, declared };
}

/** Validates one example's `args` against the controls. `at` is like `examples[0]`. */
export function validateArgs(
  args: unknown,
  controls: ReturnType<typeof validateControls>,
  at: string,
): string[] {
  if (args === undefined) return [];
  if (!isObj(args)) return [`${at}.args must be a JSON object`];
  const errors: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (!controls.declared.has(key)) {
      errors.push(`${at}.args.${key} is not a declared control prop`);
      continue;
    }
    const control = controls.valid.get(key);
    if (!control) continue; // its control is already reported
    const bad = valueProblem(control, value);
    if (bad) errors.push(`${at}.args.${key} ${bad}`);
  }
  return errors;
}

/**
 * The starting values for one example: its `args`, else each control's
 * `default`. A control with neither stays unset, so the example keeps its own
 * fixture value. Built with `Object.fromEntries`, so names stay own keys.
 */
export function initialValues(
  controls: LibraryControl[] | undefined,
  args: ControlValues | undefined,
): ControlValues {
  const out: [string, ControlValue][] = [];
  for (const c of controls ?? []) {
    const v = args && Object.hasOwn(args, c.prop) ? args[c.prop] : c.default;
    if (v !== undefined) out.push([c.prop, v]);
  }
  return Object.fromEntries(out);
}

/** Sets one value, or removes it when `value` is undefined. */
export function withValue(
  values: ControlValues,
  prop: string,
  value: ControlValue | undefined,
): ControlValues {
  const out = Object.entries(values).filter(([k]) => k !== prop);
  if (value !== undefined) out.push([prop, value]);
  return Object.fromEntries(out);
}

/** Number field text -> value. Empty or not a finite number means unset. */
export function parseNumber(text: string): number | undefined {
  if (text.trim() === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}
