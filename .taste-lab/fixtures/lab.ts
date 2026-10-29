import type { LabRound, LabState, Page } from "./types";

/** A sample lab mid-way: 9 answered, 3 open, 2 broken. */
const rounds: LabRound[] = [
  {
    id: "round-001",
    component: "card",
    level: "component",
    question: "Which task card feels right?",
    status: "answered",
    pick: "c",
    tags: ["airy", "clean"],
  },
  {
    id: "round-002",
    component: "table",
    level: "component",
    question: "Which project table reads best?",
    status: "answered",
    pick: "b",
    tags: ["cramped"],
  },
  {
    id: "round-003",
    component: "card",
    level: "component",
    question: "Tags in the status row or below the title?",
    status: "answered",
    pick: "c",
    tags: ["clean"],
  },
  {
    id: "round-004",
    component: "table",
    level: "component",
    question: "Full-width columns or stacked cells?",
    status: "answered",
    pick: "a",
    tags: ["airy", "clean"],
  },
  {
    id: "round-005",
    component: "card",
    level: "component",
    question: "Quiet text tags or badges?",
    status: "answered",
    pick: "b",
    tags: ["quiet", "clean"],
  },
  {
    id: "round-006",
    component: "table",
    level: "component",
    question: "How compact should table rows be?",
    status: "answered",
    pick: "c",
    tags: ["clean"],
  },
  {
    id: "round-007",
    component: "theme",
    level: "token",
    question: "Which accent goes into theme.css?",
    status: "answered",
    pick: "a",
    tags: ["clean", "serious"],
  },
  {
    id: "round-008",
    component: "sidebar",
    level: "layout",
    question: "Sidebar or top nav for projects?",
    status: "error",
    error: "variants: needs 2 to 4 entries, got 1",
  },
  {
    id: "round-009",
    component: "card",
    level: "component",
    question: "Fixed-width pills or natural width?",
    status: "answered",
    pick: "a",
    tags: ["quiet"],
  },
  {
    id: "round-010",
    component: "table",
    level: "component",
    question: "Avatars in table rows: keep or drop?",
    status: "open",
  },
  {
    id: "round-011",
    component: "table",
    level: "component",
    question: "How heavy should table headers be?",
    status: "open",
  },
  {
    id: "round-012",
    component: "dialog",
    level: "component",
    question: "Which task dialog layout?",
    status: "answered",
    pick: "none",
    tags: ["too much", "loud"],
  },
  {
    id: "round-013",
    component: "empty-state",
    level: "component",
    question: "Which empty state for a new project?",
    status: "error",
    error: "b.tsx: raw color bg-blue-500",
  },
  {
    id: "round-014",
    component: "dashboard",
    level: "layout",
    question: "Which dashboard layout?",
    status: "open",
  },
];

const pages: Page[] = ["Compare", "Library", "Theme", "History"];

// Same rule as the app: the current round is the first one with no answer.
const current = rounds.find((r) => r.status === "open")?.id ?? rounds[0].id;

export const lab: LabState = {
  name: "acme-tasks",
  rounds,
  pages,
  activePage: "Compare",
  current,
};
