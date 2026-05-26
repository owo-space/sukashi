import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Placeholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        待实现 — 此页面将按 legacy UI 1:1 复刻。
      </CardContent>
    </Card>
  );
}
