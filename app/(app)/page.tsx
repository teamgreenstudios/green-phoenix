import { LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LayoutDashboard className="size-6" />
        </div>
        <h1 className="text-lg font-semibold">Your dashboard</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The tile grid lands in a later milestone. For now, head to{" "}
          <span className="text-foreground">Projects</span> to start tracking your
          work.
        </p>
      </CardContent>
    </Card>
  );
}
