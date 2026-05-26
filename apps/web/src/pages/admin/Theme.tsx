import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Matches the panel-shell THEME_COLORS map exactly; do not hand-edit.
 *   default  → #0665d0   蓝色 (出厂)
 *   darkblue → #3b5998   暗蓝
 *   black    → #343a40   暗黑
 *   green    → #319795   青绿
 */
const THEME_COLORS: Array<{ key: string; hex: string; label: string }> = [
  { key: "default", hex: "#0665d0", label: "默认蓝" },
  { key: "darkblue", hex: "#3b5998", label: "暗蓝" },
  { key: "black", hex: "#343a40", label: "暗黑" },
  { key: "green", hex: "#319795", label: "青绿" }
];

interface ConfigResponse {
  frontend?: {
    frontend_theme?: string;
    frontend_theme_sidebar?: string;
    frontend_theme_header?: string;
    frontend_theme_color?: string;
    frontend_background_url?: string | null;
  };
  [k: string]: unknown;
}

export function AdminThemePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.config.fetch.frontend"],
    queryFn: () => apiGet<ConfigResponse>("/admin/config/fetch", { params: { key: "frontend" } })
  });

  const [color, setColor] = useState("default");
  const [sidebar, setSidebar] = useState("light");
  const [header, setHeader] = useState("dark");
  const [bg, setBg] = useState("");

  useEffect(() => {
    const cfg = data?.frontend ?? {};
    if (cfg.frontend_theme_color) setColor(cfg.frontend_theme_color);
    if (cfg.frontend_theme_sidebar) setSidebar(cfg.frontend_theme_sidebar);
    if (cfg.frontend_theme_header) setHeader(cfg.frontend_theme_header);
    if (cfg.frontend_background_url) setBg(cfg.frontend_background_url);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiPost("/admin/config/save", {
        frontend_theme_color: color,
        frontend_theme_sidebar: sidebar,
        frontend_theme_header: header,
        frontend_background_url: bg || null
      }),
    onSuccess: () => {
      toast.success("已保存");
      qc.invalidateQueries({ queryKey: ["admin.config.fetch.frontend"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">主题配置</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>主色</Label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {THEME_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                className={cn(
                  "relative flex items-center gap-3 rounded border p-3 text-left transition-colors hover:bg-accent/40",
                  color === c.key ? "border-primary ring-2 ring-primary/30" : "border-border"
                )}
              >
                <span
                  className="inline-block size-8 rounded"
                  style={{ background: c.hex }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.hex}</span>
                </div>
                {color === c.key ? (
                  <Check className="absolute right-2 top-2 size-4 text-primary" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sidebar">侧边栏样式</Label>
            <Select value={sidebar} onValueChange={setSidebar}>
              <SelectTrigger id="sidebar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="header">顶栏样式</Label>
            <Select value={header} onValueChange={setHeader}>
              <SelectTrigger id="header">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bg">背景图 URL (可选)</Label>
          <Input id="bg" value={bg} onChange={(e) => setBg(e.target.value)} placeholder="https://..." />
        </div>

        <div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "保存中…" : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
