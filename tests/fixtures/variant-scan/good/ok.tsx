import { Mail } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { tasks } from "@/fixtures";
import { cn } from "@/lib/utils";

export default function Ok() {
  const [open] = useState(false);
  return (
    <Card
      className={cn("border bg-card text-muted-foreground", open && "bg-muted")}
    >
      <Mail className="size-[18px] w-[calc(100%-2rem)] grid-cols-[1fr_auto] bg-[var(--card)] text-[length:var(--text-sm)] data-[state=open]:bg-card [&>svg]:text-muted-foreground bg-[transparent]" />
      <Badge>Issue #123</Badge>
      {tasks.length}
    </Card>
  );
}

export const Allowed = () => (
  <g fill="currentColor" stroke="none">
    <circle fill="transparent" stroke="inherit" />
    <circle fill="var(--primary)" stroke="var(--border)" />
    <circle stroke={`currentColor`} />
    <stop stopColor="var(--card)" floodColor="transparent" />
    <i className="[border:1px_solid_var(--border)] [mask-type:alpha] [content:'x']" />
  </g>
);
export const okStyleLike = { color: `var(--primary)`, fill: `none` };
