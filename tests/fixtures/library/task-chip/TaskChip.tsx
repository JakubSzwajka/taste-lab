import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/fixtures";
import { cn } from "@/lib/utils";

export const taskChipVariants = cva("gap-1", {
  variants: {
    density: {
      normal: "h-5 px-2",
      compact: "h-4 px-1.5",
    },
  },
  defaultVariants: { density: "normal" },
});

export type TaskChipProps = VariantProps<typeof taskChipVariants> & {
  task: Task;
  className?: string;
};

/** A one-line task: the id as a quiet badge, then the title. */
export function TaskChip({ task, density, className }: TaskChipProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Badge variant="secondary" className={taskChipVariants({ density })}>
        {task.id}
      </Badge>
      <span className="truncate">{task.title}</span>
    </div>
  );
}
