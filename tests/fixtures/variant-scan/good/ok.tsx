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
