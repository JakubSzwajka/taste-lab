import { tasks } from "@/fixtures";
import { TaskDetailScreen } from "./TaskDetailScreen";

type Args = { compact?: boolean };
export function Default(args: Args) {
  return <TaskDetailScreen tasks={tasks} {...args} />;
}
export function Compact(args: Args) {
  return <TaskDetailScreen tasks={tasks} compact {...args} />;
}
export function Loading(args: Args) {
  return <TaskDetailScreen tasks={tasks} state="loading" {...args} />;
}
export function Empty(args: Args) {
  return <TaskDetailScreen tasks={tasks} state="empty" {...args} />;
}
function ErrorState(args: Args) {
  return <TaskDetailScreen tasks={tasks} state="error" {...args} />;
}

export { ErrorState as Error };
