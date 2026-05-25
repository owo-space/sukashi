import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, FieldError, Form, Input, Label, Skeleton, Switch, TextArea, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import type { ConfigTree } from "@/lib/types";

const TABS: Array<{ key: keyof ConfigTree; label: string; fields: Array<[string, string, "input" | "textarea" | "switch" | "number"]> }> = [
  {
    key: "site",
    label: "站点",
    fields: [
      ["app_name", "站点名称", "input"],
      ["app_description", "副标题", "input"],
      ["app_url", "站点 URL", "input"],
      ["logo", "Logo URL", "input"],
      ["subscribe_url", "订阅域名（可选，留空则用站点 URL）", "input"],
      ["currency", "货币代码", "input"],
      ["currency_symbol", "货币符号", "input"],
      ["tos_url", "服务条款 URL", "input"],
      ["stop_register", "关闭注册", "switch"],
      ["force_https", "强制 HTTPS", "switch"],
      ["try_out_plan_id", "试用套餐 ID", "number"],
      ["try_out_hour", "试用时长（小时）", "number"]
    ]
  },
  {
    key: "subscribe",
    label: "订阅",
    fields: [
      ["plan_change_enable", "允许更换套餐", "switch"],
      ["surplus_enable", "启用余额折抵", "switch"],
      ["allow_new_period", "允许重置 period", "switch"],
      ["reset_traffic_method", "流量重置方式 (0-4)", "number"],
      ["show_subscribe_method", "显示订阅方式", "number"],
      ["show_subscribe_expire", "订阅过期前几天提醒", "number"],
      ["show_info_to_server_enable", "节点接收用户信息", "switch"]
    ]
  },
  {
    key: "invite",
    label: "邀请佣金",
    fields: [
      ["invite_force", "强制邀请注册", "switch"],
      ["invite_commission", "佣金比例 (%)", "number"],
      ["invite_gen_limit", "可生成邀请码上限", "number"],
      ["invite_never_expire", "邀请码永不失效", "switch"],
      ["commission_first_time_enable", "仅首单返佣", "switch"],
      ["commission_auto_check_enable", "自动确认佣金", "switch"],
      ["commission_withdraw_limit", "最低提现金额 (元)", "number"],
      ["withdraw_close_enable", "关闭提现", "switch"]
    ]
  },
  {
    key: "ticket",
    label: "工单",
    fields: [["ticket_status", "工单状态 (0=开 1=关 2=只读)", "number"]]
  },
  {
    key: "email",
    label: "邮件",
    fields: [
      ["email_host", "SMTP Host", "input"],
      ["email_port", "SMTP Port", "input"],
      ["email_username", "SMTP 用户名", "input"],
      ["email_password", "SMTP 密码", "input"],
      ["email_encryption", "加密方式 (tls/ssl)", "input"],
      ["email_from_address", "发件地址", "input"]
    ]
  },
  {
    key: "telegram",
    label: "Telegram",
    fields: [
      ["telegram_bot_enable", "启用 Telegram Bot", "switch"],
      ["telegram_bot_token", "Bot Token", "input"],
      ["telegram_discuss_link", "讨论群链接", "input"]
    ]
  },
  {
    key: "frontend",
    label: "外观",
    fields: [
      ["frontend_theme", "主题", "input"],
      ["frontend_theme_color", "主题色", "input"],
      ["frontend_theme_sidebar", "侧栏风格", "input"],
      ["frontend_theme_header", "顶部风格", "input"],
      ["frontend_background_url", "背景图 URL", "input"]
    ]
  },
  {
    key: "safe",
    label: "安全",
    fields: [
      ["email_verify", "强制邮箱验证", "switch"],
      ["safe_mode_enable", "安全模式", "switch"],
      ["secure_path", "管理后台路径 (留空使用 admin)", "input"],
      ["email_whitelist_enable", "邮箱白名单", "switch"],
      ["email_whitelist_suffix", "白名单后缀（逗号分隔）", "textarea"],
      ["email_gmail_limit_enable", "Gmail 别名限制", "switch"],
      ["recaptcha_enable", "启用 reCAPTCHA", "switch"],
      ["recaptcha_key", "reCAPTCHA Secret Key", "input"],
      ["recaptcha_site_key", "reCAPTCHA Site Key", "input"],
      ["register_limit_by_ip_enable", "限制 IP 注册频率", "switch"],
      ["register_limit_count", "注册次数上限", "number"],
      ["register_limit_expire", "注册限制窗口（分钟）", "number"],
      ["password_limit_enable", "限制登录失败次数", "switch"],
      ["password_limit_count", "登录失败上限", "number"],
      ["password_limit_expire", "登录限制窗口（分钟）", "number"]
    ]
  },
  {
    key: "server",
    label: "节点 API",
    fields: [
      ["server_token", "节点 API Token", "input"],
      ["server_pull_interval", "拉取间隔（秒）", "number"],
      ["server_push_interval", "推送间隔（秒）", "number"],
      ["device_limit_mode", "设备限制模式 (0/1)", "number"]
    ]
  },
  {
    key: "app",
    label: "客户端版本",
    fields: [
      ["windows_version", "Windows 版本", "input"],
      ["windows_download_url", "Windows 下载链接", "input"],
      ["macos_version", "macOS 版本", "input"],
      ["macos_download_url", "macOS 下载链接", "input"],
      ["android_version", "Android 版本", "input"],
      ["android_download_url", "Android 下载链接", "input"]
    ]
  }
];

export function AdminSettingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<keyof ConfigTree>("site");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "config", "fetch"],
    queryFn: () => apiGet<ConfigTree>("/admin/config/fetch")
  });

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, string> = {};
    for (const section of TABS) {
      const obj = data[section.key] ?? {};
      for (const [key] of section.fields) {
        const v = (obj as Record<string, unknown>)[key];
        if (v === null || v === undefined) initial[key] = "";
        else if (Array.isArray(v)) initial[key] = v.join(",");
        else initial[key] = String(v);
      }
    }
    setDraft(initial);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/config/save", body),
    onSuccess: () => {
      setSuccess("配置已保存");
      setTimeout(() => setSuccess(null), 2400);
      void queryClient.invalidateQueries({ queryKey: ["admin", "config", "fetch"] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "保存失败"
      );
    }
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;

  const currentTab = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <PageHeader title="系统设置" />
      {success ? <Alert variant="success" className="mb-3">{success}</Alert> : null}
      {error ? <Alert variant="danger" className="mb-3" title="保存失败">{error}</Alert> : null}
      <Card>
        <Card.Header>
          <div className="flex flex-wrap gap-1 rounded-lg bg-default-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  tab === t.key ? "bg-background shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card.Header>
        <Card.Content>
          <Form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const body: Record<string, unknown> = {};
              for (const [key, , kind] of currentTab.fields) {
                const v = draft[key] ?? "";
                if (kind === "switch") body[key] = v === "1" || v === "true" ? 1 : 0;
                else if (kind === "number") body[key] = v === "" ? null : Number(v);
                else if (key === "email_whitelist_suffix") body[key] = v.split(",").map((s) => s.trim()).filter(Boolean);
                else body[key] = v === "" ? null : v;
              }
              save.mutate(body);
            }}
          >
            {currentTab.fields.map(([key, label, kind]) => {
              const value = draft[key] ?? "";
              if (kind === "switch") {
                return (
                  <div key={key} className="flex items-center justify-between rounded-md bg-default-50 px-3 py-2">
                    <span className="text-sm">{label}</span>
                    <Switch
                      isSelected={value === "1" || value === "true"}
                      onChange={(v) => setDraft((d) => ({ ...d, [key]: v ? "1" : "0" }))}
                    />
                  </div>
                );
              }
              if (kind === "textarea") {
                return (
                  <div key={key} className="md:col-span-2">
                    <Label>{label}</Label>
                    <TextArea
                      value={value}
                      onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                      rows={3}
                    />
                  </div>
                );
              }
              return (
                <TextField
                  key={key}
                  value={value}
                  onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  type={kind === "number" ? "number" : "text"}
                >
                  <Label>{label}</Label>
                  <Input />
                  <FieldError />
                </TextField>
              );
            })}
            <div className="md:col-span-2">
              <Button type="submit" isPending={save.isPending}>
                保存当前分组
              </Button>
            </div>
          </Form>
        </Card.Content>
      </Card>
    </>
  );
}
