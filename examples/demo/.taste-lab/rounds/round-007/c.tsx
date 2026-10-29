import { rows, tasks } from "@/fixtures";
import { ProjectTable } from "@/library/project-table/ProjectTable";
import { TaskCard } from "@/library/task-card/TaskCard";

/**
 * Round-007 is a token round: a.tsx, b.tsx and c.tsx are the same file.
 * Only the tokens in round.json differ. Both library components, full fixtures.
 */
export default function AccentCheck() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Tasks</h2>
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Projects</h2>
        <ProjectTable rows={rows} />
      </section>
    </div>
  );
}
