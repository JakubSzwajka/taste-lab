import { tasks } from "@/fixtures";
import { TaskListScreen } from "./TaskListScreen";

type Args = { compact?: boolean };
export function Default(args: Args) {
  return <TaskListScreen tasks={tasks} {...args} />;
}
export function Compact(args: Args) {
  return <TaskListScreen tasks={tasks} compact {...args} />;
}
export function Loading(args: Args) {
  return <TaskListScreen tasks={tasks} state="loading" {...args} />;
}
export function Empty(args: Args) {
  return <TaskListScreen tasks={tasks} state="empty" {...args} />;
}
function ErrorState(args: Args) {
  return <TaskListScreen tasks={tasks} state="error" {...args} />;
}

export { ErrorState as Error };
