import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/fixtures";
import { cn } from "@/lib/utils";

export function TaskEditor({
  task,
  onSave,
  onCancel,
  className,
}: {
  task: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
  className?: string;
}) {
  const id = useId();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  return (
    <form
      aria-label={`Edit ${task.id}`}
      className={cn("grid gap-4 rounded-md border bg-card p-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim()) onSave({ ...task, title: title.trim(), description });
      }}
    >
      <label htmlFor={`${id}-title`} className="grid gap-2 text-sm">
        Title
        <Input
          id={`${id}-title`}
          value={title}
          required
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label htmlFor={`${id}-description`} className="grid gap-2 text-sm">
        Description
        <Textarea
          id={`${id}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!title.trim()}>
          Save locally
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
