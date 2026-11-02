import { useState } from "react";
import { Button } from "@/components/ui/button";
import { tasks } from "@/fixtures";
import { TaskEditor } from "./TaskEditor";

export function Default() {
  const [task, setTask] = useState(tasks[0]);
  const [open, setOpen] = useState(true);
  if (!task) return <p>No sample task.</p>;
  return open ? (
    <TaskEditor
      task={task}
      onCancel={() => setOpen(false)}
      onSave={(next) => {
        setTask(next);
        setOpen(false);
      }}
    />
  ) : (
    <div className="grid gap-3">
      <p>{task.title}</p>
      <Button onClick={() => setOpen(true)}>Edit task</Button>
    </div>
  );
}
