import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tasks } from "@/fixtures";

export default function A() {
  return (
    <div className="flex flex-col gap-3">
      {tasks.slice(0, 3).map((t) => (
        <Card key={t.id}>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{t.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
