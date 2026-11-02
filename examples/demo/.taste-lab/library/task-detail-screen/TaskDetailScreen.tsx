import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Task } from "@/fixtures";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/library/task-card/TaskCard";
import { TaskEditor } from "@/library/task-editor/TaskEditor";

export function TaskDetailScreen({
  tasks,
  compact = false,
  state = "default",
  className,
}: {
  tasks: Task[];
  compact?: boolean;
  state?: "default" | "loading" | "empty" | "error";
  className?: string;
}) {
  const [items, setItems] = useState(() => tasks.map((task) => ({ ...task })));
  const [selected, setSelected] = useState(tasks[0]?.id);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [recovered, setRecovered] = useState(false);
  const [saved, setSaved] = useState("");
  const shown = items.filter(
    (task) =>
      `${task.id} ${task.title}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || task.status !== "done"),
  );
  const task = shown.find((item) => item.id === selected) ?? shown[0];
  const activeState = recovered ? "default" : state;
  return (
    <main
      className={cn(
        "@container/detail min-w-0 bg-background text-foreground",
        compact ? "p-3" : "p-6",
        className,
      )}
    >
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Task detail</h1>
        <span className="text-sm text-muted-foreground">Local demo</span>
      </header>
      {activeState !== "default" ? (
        <section
          aria-label={`${activeState} task detail`}
          className="grid justify-items-start gap-4 py-8"
        >
          <h2 className="font-medium">
            {activeState === "loading"
              ? "Loading task detail"
              : activeState === "error"
                ? "Could not load task detail"
                : "No task selected"}
          </h2>
          {activeState === "loading" && (
            <Skeleton aria-busy="true" className="h-48 w-full" />
          )}
          <p className="text-sm text-muted-foreground">
            Restore the local sample to explore task details.
          </p>
          <Button variant="outline" onClick={() => setRecovered(true)}>
            {activeState === "error" ? "Retry" : "Show sample tasks"}
          </Button>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              className="min-w-0 flex-1 basis-48"
              aria-label="Search tasks"
              placeholder="Search tasks"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setEditing(false);
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
                  setEditing(false);
                }
              }}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="open">Open</ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              onClick={() => {
                setItems(tasks.map((item) => ({ ...item })));
                setQuery("");
                setFilter("all");
                setEditing(false);
                setSaved("");
              }}
            >
              Reset
            </Button>
          </div>
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            {saved || `${shown.length} of ${items.length} tasks`}
          </p>
          <div
            className={cn(
              "grid gap-6",
              compact ? "@3xl/detail:grid-cols-2" : "@3xl/detail:grid-cols-3",
            )}
          >
            <nav
              aria-label="Choose task"
              className="flex min-w-0 flex-col gap-2"
            >
              {shown.map((item) => (
                <Button
                  key={item.id}
                  variant={task?.id === item.id ? "secondary" : "ghost"}
                  className="h-auto justify-start whitespace-normal text-left"
                  aria-current={task?.id === item.id ? "true" : undefined}
                  onClick={() => {
                    setSelected(item.id);
                    setEditing(false);
                    setSaved("");
                  }}
                >
                  {item.id} · {item.title}
                </Button>
              ))}
            </nav>
            <section
              aria-label="Selected task"
              className={cn(
                "min-w-0 space-y-4",
                !compact && "@3xl/detail:col-span-2",
              )}
            >
              {!task ? (
                <>
                  <p>No matching tasks.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : editing ? (
                <TaskEditor
                  key={task.id}
                  task={task}
                  onCancel={() => setEditing(false)}
                  onSave={(next) => {
                    setItems((all) =>
                      all.map((item) => (item.id === next.id ? next : item)),
                    );
                    setEditing(false);
                    setSaved(`Saved ${next.id} locally`);
                  }}
                />
              ) : (
                <>
                  <TaskCard task={task} />
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(true);
                      setSaved("");
                    }}
                  >
                    Edit {task.id}
                  </Button>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
