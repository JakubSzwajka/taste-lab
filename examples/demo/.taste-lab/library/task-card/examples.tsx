import { type Task, tasks } from "@/fixtures";
import { TaskCard } from "./TaskCard";

const byId = (id: string) => tasks.filter((t) => t.id === id);

function List({ items }: { items: Task[] }) {
  return (
    <div className="grid gap-3">
      {items.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}

/** Every task in the fixture, as a list. */
export function Default() {
  return <List items={tasks} />;
}

/** TL-101 has 5 tags (+3), TL-104 has 4 (+2). */
export function ManyTags() {
  return <List items={[...byId("TL-101"), ...byId("TL-104")]} />;
}

/** A done task with low priority. */
export function Done() {
  return <List items={byId("TL-106")} />;
}

/** Blocked status with urgent priority: the loudest row the card has. */
export function BlockedUrgent() {
  return <List items={byId("TL-104")} />;
}

/** No tags: the status row ends after the priority pill. */
export function NoTags() {
  return <List items={byId("TL-103").map((t) => ({ ...t, tags: [] }))} />;
}
