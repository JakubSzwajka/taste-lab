export type Person = { name: string; initials: string };

export type Task = {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "in-review" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee: Person;
  /** ISO date, YYYY-MM-DD */
  due: string;
  tags: string[];
  comments: number;
  description: string;
};

export type Row = {
  id: string;
  name: string;
  owner: Person;
  status: "active" | "paused" | "at-risk" | "done";
  /** 0 to 100 */
  progress: number;
  /** USD */
  amount: number;
  /** ISO date, YYYY-MM-DD */
  updated: string;
};
