import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Task } from "@/fixtures";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/library/task-card/TaskCard";
import { TaskEditor } from "@/library/task-editor/TaskEditor";

export type ScreenState = "default" | "loading" | "empty" | "error";
export type TaskListScreenProps = {
  tasks: Task[];
  compact?: boolean;
  state?: ScreenState;
  className?: string;
};

export function TaskListScreen({
  tasks,
  compact = false,
  state = "default",
  className,
}: TaskListScreenProps) {
  const [items, setItems] = useState(() => tasks.map((task) => ({ ...task })));
  const [recovered, setRecovered] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<string>();
  const [saved, setSaved] = useState("");
  const shown = items.filter(
    (task) =>
      `${task.id} ${task.title} ${task.assignee.name}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || task.status !== "done"),
  );
  const activeState = recovered ? "default" : state;
  return (
    <main
      className={cn(
        "@container/tasks min-w-0 bg-background text-foreground",
        compact ? "p-3" : "p-6",
        className,
      )}
    >
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Team tasks</h1>
        <span className="text-sm text-muted-foreground">Local demo</span>
      </header>
      {activeState !== "default" ? (
        <section
          className="grid gap-4 py-8"
          aria-label={`${activeState} tasks`}
        >
          <h2 className="font-medium">
            {activeState === "loading"
              ? "Loading tasks"
              : activeState === "error"
                ? "Could not load tasks"
                : "No tasks yet"}
          </h2>
          {activeState === "loading" && (
            <div aria-busy="true" className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            This is a local state example. Restore the sample tasks to continue.
          </p>
          <Button
            className="justify-self-start"
            variant="outline"
            onClick={() => setRecovered(true)}
          >
            {activeState === "error" ? "Retry" : "Show sample tasks"}
          </Button>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              className="min-w-0 flex-1 basis-48"
              aria-label="Search tasks"
              placeholder="Search tasks or assignees"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSaved("");
              }}
            />
            <ToggleGroup
              type="single"
              variant="outline"
              aria-label="Task filter"
              value={filter}
              onValueChange={(value) => {
                if (value) {
                  setFilter(value);
                  setSaved("");
                }
              }}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="open">Open</ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              onClick={() => {
                setItems(tasks.map((task) => ({ ...task })));
                setQuery("");
                setFilter("all");
                setEditing(undefined);
                setSaved("");
              }}
            >
              Reset
            </Button>
          </div>
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            {saved || `${shown.length} of ${items.length} tasks`}
          </p>
          {shown.length === 0 && (
            <div className="grid justify-items-start gap-3 py-6">
              <p>No matching tasks.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setSaved("");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
          <div
            className={cn(
              "grid gap-4",
              compact ? "@3xl/tasks:grid-cols-3" : "@3xl/tasks:grid-cols-2",
            )}
          >
            {shown.map((task) => (
              <section
                key={task.id}
                aria-label={task.id}
                className="min-w-0 space-y-2"
              >
                {editing === task.id ? (
                  <TaskEditor
                    key={task.id}
                    task={task}
                    onCancel={() => setEditing(undefined)}
                    onSave={(next) => {
                      setItems((all) =>
                        all.map((item) => (item.id === next.id ? next : item)),
                      );
                      setEditing(undefined);
                      setSaved(`Saved ${next.id} locally`);
                    }}
                  />
                ) : (
                  <>
                    <TaskCard
                      task={task}
                      className={compact ? "gap-2 py-3" : undefined}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(task.id);
                        setSaved("");
                      }}
                    >
                      Edit {task.id}
                    </Button>
                  </>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
