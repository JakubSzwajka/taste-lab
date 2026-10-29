import { Card } from "@/components/ui/card";
import { tasks } from "@/fixtures";

export default function B() {
  return (
    <div className="flex flex-col gap-2">
      {tasks.slice(0, 3).map((t) => (
        <Card key={t.id} className="gap-1 bg-muted py-3">
          <p className="px-4 text-sm font-medium">{t.title}</p>
          <p className="px-4 text-xs text-muted-foreground">{t.status}</p>
        </Card>
      ))}
    </div>
  );
}
