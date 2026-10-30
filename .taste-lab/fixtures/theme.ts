import type { ThemeProblem, ThemeState, ThemeToken, TokenGroup } from "./types";

/**
 * The Theme page's data: the lab's stock tokens (src/index.css) merged with
 * this repo's .taste-lab/theme.css. The values match what the served lab
 * renders, so a live swatch (`bg-primary`) and its value text agree. Only
 * --primary, --primary-foreground and --ring come from theme.css.
 */
const fromTheme = new Set(["--primary", "--primary-foreground", "--ring"]);

/** name, group, light, dark, swatch class, optional "Aa" chip classes. */
type Row = [string, TokenGroup, string, string, string, string?];

const rows: Row[] = [
  [
    "--background",
    "Surfaces",
    "oklch(1 0 0)",
    "oklch(0.145 0 0)",
    "bg-background",
    "bg-background text-foreground",
  ],
  [
    "--foreground",
    "Surfaces",
    "oklch(0.145 0 0)",
    "oklch(0.985 0 0)",
    "bg-foreground",
  ],
  [
    "--card",
    "Surfaces",
    "oklch(1 0 0)",
    "oklch(0.205 0 0)",
    "bg-card",
    "bg-card text-card-foreground",
  ],
  [
    "--card-foreground",
    "Surfaces",
    "oklch(0.145 0 0)",
    "oklch(0.985 0 0)",
    "bg-card-foreground",
  ],
  [
    "--popover",
    "Surfaces",
    "oklch(1 0 0)",
    "oklch(0.205 0 0)",
    "bg-popover",
    "bg-popover text-popover-foreground",
  ],
  [
    "--popover-foreground",
    "Surfaces",
    "oklch(0.145 0 0)",
    "oklch(0.985 0 0)",
    "bg-popover-foreground",
  ],
  [
    "--primary",
    "Brand",
    "oklch(0.5 0.19 262)",
    "oklch(0.72 0.14 262)",
    "bg-primary",
    "bg-primary text-primary-foreground",
  ],
  [
    "--primary-foreground",
    "Brand",
    "oklch(0.985 0 0)",
    "oklch(0.2 0.04 262)",
    "bg-primary-foreground",
  ],
  [
    "--secondary",
    "Brand",
    "oklch(0.97 0 0)",
    "oklch(0.269 0 0)",
    "bg-secondary",
    "bg-secondary text-secondary-foreground",
  ],
  [
    "--secondary-foreground",
    "Brand",
    "oklch(0.205 0 0)",
    "oklch(0.985 0 0)",
    "bg-secondary-foreground",
  ],
  [
    "--accent",
    "Brand",
    "oklch(0.97 0 0)",
    "oklch(0.269 0 0)",
    "bg-accent",
    "bg-accent text-accent-foreground",
  ],
  [
    "--accent-foreground",
    "Brand",
    "oklch(0.205 0 0)",
    "oklch(0.985 0 0)",
    "bg-accent-foreground",
  ],
  [
    "--muted",
    "States",
    "oklch(0.97 0 0)",
    "oklch(0.269 0 0)",
    "bg-muted",
    "bg-muted text-muted-foreground",
  ],
  [
    "--muted-foreground",
    "States",
    "oklch(0.52 0 0)",
    "oklch(0.708 0 0)",
    "bg-muted-foreground",
  ],
  [
    "--destructive",
    "States",
    "oklch(0.5 0.2 27.325)",
    "oklch(0.704 0.191 22.216)",
    "bg-destructive",
  ],
  ["--border", "States", "oklch(0.922 0 0)", "oklch(1 0 0 / 10%)", "bg-border"],
  ["--input", "States", "oklch(0.922 0 0)", "oklch(1 0 0 / 15%)", "bg-input"],
  [
    "--ring",
    "States",
    "oklch(0.55 0.17 262)",
    "oklch(0.65 0.14 262)",
    "bg-ring",
  ],
  ["--chart-1", "Charts", "oklch(0.87 0 0)", "oklch(0.87 0 0)", "bg-chart-1"],
  ["--chart-2", "Charts", "oklch(0.556 0 0)", "oklch(0.556 0 0)", "bg-chart-2"],
  ["--chart-3", "Charts", "oklch(0.439 0 0)", "oklch(0.439 0 0)", "bg-chart-3"],
  ["--chart-4", "Charts", "oklch(0.371 0 0)", "oklch(0.371 0 0)", "bg-chart-4"],
  ["--chart-5", "Charts", "oklch(0.269 0 0)", "oklch(0.269 0 0)", "bg-chart-5"],
  [
    "--sidebar",
    "Sidebar",
    "oklch(0.985 0 0)",
    "oklch(0.205 0 0)",
    "bg-sidebar",
    "bg-sidebar text-sidebar-foreground",
  ],
  [
    "--sidebar-foreground",
    "Sidebar",
    "oklch(0.145 0 0)",
    "oklch(0.985 0 0)",
    "bg-sidebar-foreground",
  ],
  [
    "--sidebar-primary",
    "Sidebar",
    "oklch(0.205 0 0)",
    "oklch(0.488 0.243 264.376)",
    "bg-sidebar-primary",
    "bg-sidebar-primary text-sidebar-primary-foreground",
  ],
  [
    "--sidebar-primary-foreground",
    "Sidebar",
    "oklch(0.985 0 0)",
    "oklch(0.985 0 0)",
    "bg-sidebar-primary-foreground",
  ],
  [
    "--sidebar-accent",
    "Sidebar",
    "oklch(0.97 0 0)",
    "oklch(0.269 0 0)",
    "bg-sidebar-accent",
    "bg-sidebar-accent text-sidebar-accent-foreground",
  ],
  [
    "--sidebar-accent-foreground",
    "Sidebar",
    "oklch(0.205 0 0)",
    "oklch(0.985 0 0)",
    "bg-sidebar-accent-foreground",
  ],
  [
    "--sidebar-border",
    "Sidebar",
    "oklch(0.922 0 0)",
    "oklch(1 0 0 / 10%)",
    "bg-sidebar-border",
  ],
  [
    "--sidebar-ring",
    "Sidebar",
    "oklch(0.708 0 0)",
    "oklch(0.556 0 0)",
    "bg-sidebar-ring",
  ],
  // Stock defines --radius in :root only, so one value serves both modes.
  ["--radius", "Shape", "0.625rem", "0.625rem", "rounded-lg"],
];

const tokens: ThemeToken[] = rows.map(
  ([name, group, light, dark, swatch, sample]) => {
    const source = fromTheme.has(name) ? "theme" : "stock";
    return {
      name,
      group,
      light: { value: light, source },
      dark: { value: dark, source },
      swatch,
      ...(sample ? { sample } : {}),
    };
  },
);

/**
 * Sample rejected parts, worded as `taste-lab check` words them. The real
 * theme.css is clean today; these show how the page lists problems.
 */
const problems: ThemeProblem[] = [
  {
    line: 24,
    message:
      "unknown token --brand. Only the shadcn variables from the lab's src/index.css are allowed",
    excerpt: "--brand: oklch(0.62 0.19 40);",
  },
  {
    line: 29,
    message: 'selector ".card" is not allowed. Use only :root and .dark',
    excerpt: ".card { --card: oklch(0.98 0 0); }",
  },
  {
    line: 33,
    message: "!important is not allowed (--radius). It would beat round tokens",
    excerpt: "--radius: 0.5rem !important;",
  },
];

export const theme: ThemeState = {
  file: ".taste-lab/theme.css",
  groups: [
    { name: "Surfaces", hint: "Page, card and popover, with their text" },
    { name: "Brand", hint: "Primary, secondary and accent fills" },
    { name: "States", hint: "Muted, destructive, borders, input, focus ring" },
    { name: "Charts", hint: "Five series colors" },
    { name: "Sidebar", hint: "The sidebar primitive's own set" },
    { name: "Shape", hint: "Corner radius, one value for both modes" },
  ],
  tokens,
  problems,
};
