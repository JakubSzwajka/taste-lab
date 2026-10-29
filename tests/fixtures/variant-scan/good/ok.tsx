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
      <Mail />
      <Badge>Issue #123</Badge>
      {tasks.length}
    </Card>
  );
}
