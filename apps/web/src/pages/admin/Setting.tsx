import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

interface SettingsResponse {
  [group: string]: Record<string, unknown>;
}

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "number" | "switch" | "textarea" | "select" | "password";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface TabDef {
  id: string;
  label: string;
  fields: FieldDef[];
}

const TABS: TabDef[] = [
  {
    id: "site",
    label: "站点",
    fields: [
      { key: "app_name", label: "站点名称", hint: "用于显示需要站点名称的地方。" },
      { key: "app_description", label: "站点描述", hint: "用于显示需要站点描述的地方。" },
      {
        key: "app_url",
        label: "站点网址",
        hint: "当前网站最新网址,将会在邮件等需要用于网址处使用。",
        placeholder: "https://"
      },
      { key: "force_https", label: "强制HTTPS", type: "switch", hint: "当站点没有使用HTTPS、CDN或反向代理开启强制HTTPS时需要开启。" },
      { key: "logo", label: "LOGO", placeholder: "请输入LOGO URL,末尾不要 /", hint: "用于显示需要LOGO的地方。" },
      { key: "subscribe_url", label: "订阅URL", type: "textarea", placeholder: "https://...", hint: "用于订阅时使用,留空则为站点URL。如果多个订阅URL随机获取使用请使用回车进行分割。" },
      {
        key: "subscribe_path",
        label: "订阅路径",
        hint: "用于订阅使用,留空则为/api/v1/client/subscribe。如需要修改不同的订阅路径请设置。",
        placeholder: "/api/v1/client/subscribe"
      },
      { key: "tos_url", label: "用户条款(TOS)URL", placeholder: "请输入用户条款URL,末尾不要 /", hint: "用于跳转到用户条款(TOS)。" },
      { key: "stop_register", label: "停止新用户注册", type: "switch", hint: "开启后任何人都将无法进行注册。" },
      {
        key: "try_out_plan_id",
        label: "注册试用",
        type: "select",
        options: [{ value: "0", label: "关闭" }],
        hint: "选择需要试用的订阅,如果没有选项请先创建订阅管理增加。"
      },
      { key: "try_out_hour", label: "试用时间(小时)", type: "number" },
      { key: "currency", label: "货币单位", hint: "仅用于展示使用。更改后系统中所有的货币单位都将发生变更。" },
      { key: "currency_symbol", label: "货币符号", hint: "仅用于展示使用。更改后系统中所有的货币符号都将发生变更。" }
    ]
  },
  {
    id: "safe",
    label: "安全",
    fields: [{ key: "email_verify", label: "邮箱验证", type: "switch", hint: "注册时强制要求验证邮箱验证码。" }]
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
    id: "deposit",
    label: "充值",
    fields: [{ key: "deposit_bounus", label: "充值加成 (JSON)", type: "textarea", placeholder: "[]" }]
  },
  {
    id: "ticket",
    label: "工单",
    fields: [{ key: "ticket_status", label: "关闭工单系统", type: "switch" }]
  },
  {
    id: "invite",
    label: "邀请&佣金",
    fields: [
      { key: "invite_force", label: "强制邀请注册", type: "switch" },
      { key: "invite_commission", label: "邀请佣金 (%)", type: "number" },
      { key: "invite_gen_limit", label: "邀请码生成上限", type: "number" },
      { key: "invite_never_expire", label: "邀请码永久有效", type: "switch" },
      { key: "commission_first_time_enable", label: "仅首次订单返佣", type: "switch" },
      { key: "commission_auto_check_enable", label: "自动审核佣金", type: "switch" },
      { key: "commission_withdraw_limit", label: "提现门槛 (CNY)", type: "number" },
      { key: "withdraw_close_enable", label: "关闭佣金提现", type: "switch" },
      { key: "commission_distribution_enable", label: "多级佣金分配", type: "switch" },
      { key: "commission_distribution_l1", label: "一级佣金比例 %", type: "number" },
      { key: "commission_distribution_l2", label: "二级佣金比例 %", type: "number" },
      { key: "commission_distribution_l3", label: "三级佣金比例 %", type: "number" }
    ]
  },
  {
    id: "frontend",
    label: "个性化",
    fields: [
      {
        key: "frontend_theme",
        label: "主题模板",
        type: "select",
        options: [{ value: "default", label: "default" }]
      },
      {
        key: "frontend_theme_sidebar",
        label: "侧边栏样式",
        type: "select",
        options: [
          { value: "light", label: "浅色" },
          { value: "dark", label: "深色" }
        ]
      },
      {
        key: "frontend_theme_header",
        label: "顶栏样式",
        type: "select",
        options: [
          { value: "light", label: "浅色" },
          { value: "dark", label: "深色" }
        ]
      },
      {
        key: "frontend_theme_color",
        label: "主题色",
        type: "select",
        options: [
          { value: "default", label: "默认蓝 #0665d0" },
          { value: "darkblue", label: "暗蓝 #3b5998" },
          { value: "black", label: "暗黑 #343a40" },
          { value: "green", label: "青绿 #319795" }
        ]
      },
      { key: "frontend_background_url", label: "背景图 URL" }
    ]
  },
  {
    id: "server",
    label: "节点",
    fields: [
      { key: "server_token", label: "节点通讯密钥" },
      { key: "server_pull_interval", label: "拉取间隔 (秒)", type: "number" },
      { key: "server_push_interval", label: "上报间隔 (秒)", type: "number" },
      { key: "server_node_report_min_traffic", label: "节点最小上报流量 (Bytes)", type: "number" },
      { key: "server_device_online_min_traffic", label: "在线设备最小流量 (Bytes)", type: "number" },
      { key: "device_limit_mode", label: "设备限制模式 (0/1)", type: "number" }
    ]
  },
  {
    id: "email",
    label: "邮件",
    fields: [
      { key: "email_host", label: "SMTP 主机" },
      { key: "email_port", label: "SMTP 端口", type: "number" },
      { key: "email_username", label: "用户名" },
      { key: "email_password", label: "密码", type: "password" },
      {
        key: "email_encryption",
        label: "加密方式",
        type: "select",
        options: [
          { value: "", label: "不加密" },
          { value: "tls", label: "TLS" },
          { value: "ssl", label: "SSL" }
        ]
      },
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
    label: "APP",
    fields: [
      { key: "windows_version", label: "Windows 版本号" },
      { key: "windows_download_url", label: "Windows 下载链接" },
      { key: "macos_version", label: "macOS 版本号" },
      { key: "macos_download_url", label: "macOS 下载链接" },
      { key: "android_version", label: "Android 版本号" },
      { key: "android_download_url", label: "Android 下载链接" }
    ]
  }
];

export function AdminSettingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.config.fetch"],
    queryFn: () => apiGet<SettingsResponse>("/admin/config/fetch")
  });

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [active, setActive] = useState<string>(TABS[0]!.id);

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
  const tab = TABS.find((t) => t.id === active)!;

  function saveCurrentTab() {
    const payload: Record<string, unknown> = {};
    for (const f of tab.fields) payload[f.key] = values[f.key];
    save.mutate(payload);
  }

  return (
    <Card className="rounded border-border">
      <CardContent className="p-0">
        {/* Top tab bar */}
        <div className="flex flex-wrap gap-0 border-b border-border px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "px-4 py-3 text-sm transition-colors border-b-2 -mb-px",
                active === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/80 hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {tab.fields.map((f) => (
            <div
              key={f.key}
              className="flex items-start gap-6 border-b border-border px-6 py-4 last:border-0"
            >
              <div className="w-60 shrink-0">
                <div className="text-sm text-foreground">{f.label}</div>
                {f.hint ? (
                  <div className="mt-1 text-xs text-muted-foreground">{f.hint}</div>
                ) : null}
              </div>
              <div className="flex-1">
                <FieldInput field={f} value={values[f.key]} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
              </div>
            </div>
          ))}

          <div className="px-6 py-4">
            <Button onClick={saveCurrentTab} disabled={save.isPending}>
              {save.isPending ? "保存中…" : `保存 ${tab.label}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldInput({
  field,
  value,
  onChange
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "switch") {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(c) => onChange(c ? 1 : 0)}
      />
    );
  }
  if (field.type === "textarea") {
    return (
      <Textarea
        rows={4}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "select") {
    const v = value == null || value === "" ? "__empty__" : String(value);
    return (
      <Select
        value={v}
        onValueChange={(nv) => onChange(nv === "__empty__" ? "" : nv)}
      >
        <SelectTrigger className="max-w-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((opt) => (
            <SelectItem
              key={opt.value || "__empty__"}
              value={opt.value === "" ? "__empty__" : opt.value}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"}
      value={value == null ? "" : String(value)}
      onChange={(e) =>
        onChange(
          field.type === "number" && e.target.value !== ""
            ? Number(e.target.value)
            : e.target.value
        )
      }
      placeholder={field.placeholder}
      className="max-w-md"
    />
  );
}
