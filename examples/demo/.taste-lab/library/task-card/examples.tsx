import { type Task, tasks } from "@/fixtures";
import { TaskCard } from "./TaskCard";

/**
 * Props the Library Controls panel sets (meta.json `controls`). Each one,
 * when set, overrides that field on every task the example shows.
 */
export type TaskCardArgs = {
  status?: Task["status"];
  priority?: Task["priority"];
  title?: string;
  /** Comma-separated, e.g. "api, docs, perf". Empty means no tags. */
  tags?: string;
  /** How many tasks to show. */
  count?: number;
};

const byId = (id: string) => tasks.filter((t) => t.id === id);

function List({ items, ...args }: { items: Task[] } & TaskCardArgs) {
  const shown = args.count === undefined ? items : items.slice(0, args.count);
  return (
    <div className="grid gap-3">
      {shown.map((t) => (
        <TaskCard
          key={t.id}
          task={{
            ...t,
            status: args.status ?? t.status,
            priority: args.priority ?? t.priority,
            title: args.title ?? t.title,
            tags:
              args.tags === undefined
                ? t.tags
                : args.tags
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
          }}
        />
      ))}
    </div>
  );
}

/** Every task in the fixture, as a list. */
export function Default(args: TaskCardArgs) {
  return <List items={tasks} {...args} />;
}

/** TL-101 has 5 tags (+3), TL-104 has 4 (+2). */
export function ManyTags(args: TaskCardArgs) {
  return <List items={[...byId("TL-101"), ...byId("TL-104")]} {...args} />;
}

/** A done task with low priority. */
export function Done(args: TaskCardArgs) {
  return <List items={byId("TL-106")} {...args} />;
}

/** Blocked status with urgent priority: the loudest row the card has. */
export function BlockedUrgent(args: TaskCardArgs) {
  return <List items={byId("TL-104")} {...args} />;
}

/** No tags: the status row ends after the priority pill. */
export function NoTags(args: TaskCardArgs) {
  return (
    <List items={byId("TL-103").map((t) => ({ ...t, tags: [] }))} {...args} />
  );
}
