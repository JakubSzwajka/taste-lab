import { tasks } from "@/fixtures";
import { TaskChip } from "./TaskChip";

export function Default() {
  return (
    <div className="grid gap-2">
      {tasks.map((t) => (
        <TaskChip key={t.id} task={t} />
      ))}
    </div>
  );
}

export function Compact() {
  return (
    <div className="grid gap-1">
      {tasks.map((t) => (
        <TaskChip key={t.id} task={t} density="compact" />
      ))}
    </div>
  );
}
