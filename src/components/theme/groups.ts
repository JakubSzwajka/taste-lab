// Token groups for the Theme page (round-010 a): one group row per role, in this
// order. A token the stock theme adds later and no rule names lands in "Other".

export type TokenGroup = { name: string; hint: string };

export const TOKEN_GROUPS: TokenGroup[] = [
  { name: "Surfaces", hint: "Page, card and popover, with their text" },
  { name: "Brand", hint: "Primary, secondary and accent fills" },
  { name: "States", hint: "Muted, destructive, borders, input, focus ring" },
  { name: "Charts", hint: "Five series colors" },
  { name: "Sidebar", hint: "The sidebar primitive's own set" },
  { name: "Shape", hint: "Corner radius, one value for both modes" },
  { name: "Other", hint: "Stock tokens outside these roles" },
];

const BY_BASE: Record<string, string> = {
  "--background": "Surfaces",
  "--foreground": "Surfaces",
  "--card": "Surfaces",
  "--popover": "Surfaces",
  "--primary": "Brand",
  "--secondary": "Brand",
  "--accent": "Brand",
  "--muted": "States",
  "--destructive": "States",
  "--border": "States",
  "--input": "States",
  "--ring": "States",
  "--radius": "Shape",
};

/** The group name of a token. A `-foreground` pair goes with its base. */
export function groupOf(name: string): string {
  if (name.startsWith("--chart-")) return "Charts";
  if (name === "--sidebar" || name.startsWith("--sidebar-")) return "Sidebar";
  return BY_BASE[name] ?? BY_BASE[name.replace(/-foreground$/, "")] ?? "Other";
}
