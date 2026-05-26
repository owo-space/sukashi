import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, apiGet, apiPost } from "@/lib/api";

interface SettingsResponse {
  [group: string]: Record<string, unknown>;
}

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "switch" | "textarea";
  placeholder?: string;
}

const GROUPS: Array<{ id: string; label: string; fields: FieldDef[] }> = [
  {
    id: "site",
    label: "站点",
    fields: [
      { key: "app_name", label: "站点名称" },
      { key: "app_description", label: "站点描述" },
      { key: "app_url", label: "站点 URL", placeholder: "https://" },
      { key: "subscribe_url", label: "订阅 URL", placeholder: "https://" },
      { key: "subscribe_path", label: "订阅路径", placeholder: "s" },
      { key: "force_https", label: "强制 HTTPS", type: "switch" },
      { key: "stop_register", label: "停止注册", type: "switch" },
      { key: "currency", label: "货币代码", placeholder: "CNY" },
      { key: "currency_symbol", label: "货币符号", placeholder: "¥" },
      { key: "tos_url", label: "用户协议 URL" }
    ]
  },
  {
    id: "subscribe",
    label: "订阅",
    fields: [
      { key: "plan_change_enable", label: "允许更换订阅", type: "switch" },
      { key: "surplus_enable", label: "启用剩余价值抵扣", type: "switch" },
      { key: "allow_new_period", label: "允许重新选购未到期订阅", type: "switch" },
      { key: "show_subscribe_method", label: "显示订阅链接二维码", type: "switch" },
      { key: "show_subscribe_expire", label: "订阅到期提醒天数", type: "number" },
      { key: "reset_traffic_method", label: "流量重置方法 (0/1/2)", type: "number" }
    ]
  },
  {
    id: "invite",
    label: "邀请",
    fields: [
      { key: "invite_force", label: "强制邀请注册", type: "switch" },
      { key: "invite_commission", label: "邀请佣金 (%)", type: "number" },
      { key: "invite_gen_limit", label: "邀请码生成上限", type: "number" },
      { key: "invite_never_expire", label: "邀请码永久有效", type: "switch" },
      { key: "commission_first_time_enable", label: "仅首次订单返佣", type: "switch" },
      { key: "commission_withdraw_limit", label: "提现门槛 (CNY)", type: "number" },
      { key: "withdraw_close_enable", label: "关闭佣金提现", type: "switch" }
    ]
  },
  {
    id: "server",
    label: "服务器",
    fields: [
      { key: "server_pull_interval", label: "节点配置拉取间隔 (秒)", type: "number" },
      { key: "server_push_interval", label: "节点流量上报间隔 (秒)", type: "number" },
      { key: "server_node_report_min_traffic", label: "节点最小上报流量", type: "number" },
      { key: "server_device_online_min_traffic", label: "在线设备阈值", type: "number" },
      { key: "device_limit_mode", label: "设备限制模式 (0/1)", type: "number" },
      { key: "server_token", label: "节点 token" }
    ]
  },
  {
    id: "email",
    label: "邮件 (SMTP)",
    fields: [
      { key: "email_host", label: "SMTP 主机" },
      { key: "email_port", label: "SMTP 端口", type: "number" },
      { key: "email_username", label: "用户名" },
      { key: "email_password", label: "密码" },
      { key: "email_encryption", label: "加密 (tls/ssl)" },
      { key: "email_from_address", label: "发件地址" }
    ]
  },
  {
    id: "telegram",
    label: "Telegram",
    fields: [
      { key: "telegram_bot_enable", label: "启用 Telegram Bot", type: "switch" },
      { key: "telegram_bot_token", label: "Bot Token" },
      { key: "telegram_discuss_link", label: "讨论组链接" }
    ]
  },
  {
    id: "app",
    label: "客户端",
    fields: [
      { key: "windows_version", label: "Windows 版本" },
      { key: "windows_download_url", label: "Windows 下载链接" },
      { key: "macos_version", label: "macOS 版本" },
      { key: "macos_download_url", label: "macOS 下载链接" },
      { key: "android_version", label: "Android 版本" },
      { key: "android_download_url", label: "Android 下载链接" }
    ]
  },
  {
    id: "safe",
    label: "安全",
    fields: [{ key: "email_verify", label: "邮箱验证", type: "switch" }]
  }
];

export function AdminSettingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.config.fetch"],
    queryFn: () => apiGet<SettingsResponse>("/admin/config/fetch")
  });

  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (data) {
      const flat: Record<string, unknown> = {};
      for (const group of Object.values(data)) Object.assign(flat, group);
      setValues(flat);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost("/admin/config/save", payload),
    onSuccess: () => {
      toast.success("已保存");
      qc.invalidateQueries({ queryKey: ["admin.config.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardContent className="py-4">
        <Tabs defaultValue={GROUPS[0]!.id}>
          <TabsList className="flex flex-wrap gap-1 h-auto">
            {GROUPS.map((g) => (
              <TabsTrigger key={g.id} value={g.id}>
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {GROUPS.map((g) => (
            <TabsContent key={g.id} value={g.id} className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {g.fields.map((f) => {
                  const v = values[f.key];
                  if (f.type === "switch") {
                    return (
                      <div key={f.key} className="flex items-center justify-between border-b pb-3">
                        <Label htmlFor={f.key} className="text-sm">
                          {f.label}
                        </Label>
                        <Switch
                          id={f.key}
                          checked={Boolean(v)}
                          onCheckedChange={(checked) =>
                            setValues((s) => ({ ...s, [f.key]: checked ? 1 : 0 }))
                          }
                        />
                      </div>
                    );
                  }
                  if (f.type === "textarea") {
                    return (
                      <div key={f.key} className="flex flex-col gap-1.5 md:col-span-2">
                        <Label htmlFor={f.key}>{f.label}</Label>
                        <Textarea
                          id={f.key}
                          rows={4}
                          value={(v as string) ?? ""}
                          onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <Label htmlFor={f.key}>{f.label}</Label>
                      <Input
                        id={f.key}
                        type={f.type === "number" ? "number" : "text"}
                        value={v == null ? "" : String(v)}
                        onChange={(e) =>
                          setValues((s) => ({
                            ...s,
                            [f.key]:
                              f.type === "number" && e.target.value !== ""
                                ? Number(e.target.value)
                                : e.target.value
                          }))
                        }
                        placeholder={f.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    const allowed = g.fields.map((f) => f.key);
                    const payload: Record<string, unknown> = {};
                    for (const k of allowed) payload[k] = values[k];
                    save.mutate(payload);
                  }}
                  disabled={save.isPending}
                >
                  保存 {g.label}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
