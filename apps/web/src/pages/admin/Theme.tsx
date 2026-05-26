import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { useEffect, useState } from "react";

interface ThemeConfig {
  themes?: Array<{ name: string; configs: Record<string, unknown> }>;
  active_theme?: string;
  active_theme_configs?: Record<string, unknown>;
}

export function AdminThemePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.theme.getThemeTemplate"],
    queryFn: () => apiGet<ThemeConfig>("/admin/theme/getThemeTemplate")
  });

  const [primary, setPrimary] = useState("#1677ff");
  const [bgUrl, setBgUrl] = useState("");

  useEffect(() => {
    const cfg = (data?.active_theme_configs ?? {}) as Record<string, string>;
    if (cfg.background_url) setBgUrl(cfg.background_url);
    if (cfg.theme_color) setPrimary(cfg.theme_color);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiPost("/admin/theme/save", {
        name: data?.active_theme ?? "default",
        config: {
          ...((data?.active_theme_configs as Record<string, unknown>) ?? {}),
          theme_color: primary,
          background_url: bgUrl
        }
      }),
    onSuccess: () => {
      toast.success("已保存");
      qc.invalidateQueries({ queryKey: ["admin.theme.getThemeTemplate"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">主题配置</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="primary">主色</Label>
          <Input
            id="primary"
            type="color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="w-24 h-10 p-1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bg">背景图 URL</Label>
          <Input id="bg" value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
