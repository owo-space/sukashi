import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ApiError, apiGet, apiPost } from "@/lib/api";

/**
 * Common currencies the panel offers. Stripe expects lowercase ISO 4217;
 * we display uppercase to the admin. Order roughly by relevance for CN /
 * APAC operators.
 */
const CURRENCIES = [
  "cny",
  "usd",
  "hkd",
  "twd",
  "jpy",
  "krw",
  "sgd",
  "eur",
  "gbp",
  "aud",
  "cad",
  "nzd"
] as const;

interface AdminPayment {
  id: number;
  uuid: string;
  name: string;
  payment: string;
  enable: boolean | number;
  config?: {
    stripe_public_key?: string;
    stripe_secret_key?: string;
    stripe_webhook_secret?: string;
    currency?: string;
  };
}

/**
 * Sukashi is intentionally Stripe-only. There is exactly one payment row
 * (or none) — no list, no "添加 Stripe" button. The admin lands on the
 * single config form for that row directly.
 */
export function AdminPaymentPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.payment.fetch"],
    queryFn: () => apiGet<AdminPayment[]>("/admin/payment/fetch")
  });

  const row = (data ?? [])[0] ?? null;

  const [form, setForm] = useState<{
    id?: number;
    uuid?: string;
    name: string;
    enable: 0 | 1;
    config: {
      stripe_public_key: string;
      stripe_secret_key: string;
      stripe_webhook_secret: string;
      currency: string;
    };
  }>(() => ({
    name: "Stripe",
    enable: 1,
    config: {
      stripe_public_key: "",
      stripe_secret_key: "",
      stripe_webhook_secret: "",
      currency: "cny"
    }
  }));

  useEffect(() => {
    if (row) {
      setForm({
        id: row.id,
        uuid: row.uuid,
        name: row.name ?? "Stripe",
        enable: row.enable ? 1 : 0,
        config: {
          stripe_public_key: row.config?.stripe_public_key ?? "",
          stripe_secret_key: row.config?.stripe_secret_key ?? "",
          stripe_webhook_secret: row.config?.stripe_webhook_secret ?? "",
          currency: (row.config?.currency ?? "cny").toLowerCase()
        }
      });
    }
  }, [row?.id]);

  const save = useMutation({
    mutationFn: () =>
      apiPost("/admin/payment/save", {
        ...(form.id ? { id: form.id, uuid: form.uuid } : {}),
        name: form.name,
        payment: "Stripe",
        enable: form.enable,
        config: form.config
      }),
    onSuccess: () => {
      toast.success("已保存");
      qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const webhookUrl = form.uuid
    ? `${window.location.origin}/api/v1/guest/payment/notify/Stripe/${form.uuid}`
    : "(保存后生成)";

  async function copyWebhook() {
    if (!form.uuid) {
      toast.error("请先保存,生成 uuid 后再复制");
      return;
    }
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("已复制 Webhook 地址");
  }

  function setCfg<K extends keyof typeof form.config>(k: K, v: string) {
    setForm((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded border-border">
        <CardHeader className="border-b border-border py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium text-foreground">Stripe 支付配置</CardTitle>
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              启用
              <Switch
                checked={Boolean(form.enable)}
                onCheckedChange={(c) => setForm((s) => ({ ...s, enable: c ? 1 : 0 }))}
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 py-5 md:grid-cols-2">
          <Field label="名称" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label="货币" hint="Stripe 结算用的币种">
            <Select
              value={form.config.currency}
              onValueChange={(v) => setCfg("currency", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择货币" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Stripe Publishable Key" hint="pk_live_... / pk_test_...">
            <Input
              value={form.config.stripe_public_key}
              onChange={(e) => setCfg("stripe_public_key", e.target.value)}
              placeholder="pk_live_..."
            />
          </Field>
          <Field label="Stripe Secret Key" required hint="sk_live_... / sk_test_...">
            <Input
              type="password"
              value={form.config.stripe_secret_key}
              onChange={(e) => setCfg("stripe_secret_key", e.target.value)}
              placeholder="sk_live_..."
            />
          </Field>
          <Field
            label="Webhook Signing Secret"
            hint="Stripe Dashboard → Webhooks → 选你建的端点 → Signing secret"
            span={2}
          >
            <Input
              value={form.config.stripe_webhook_secret}
              onChange={(e) => setCfg("stripe_webhook_secret", e.target.value)}
              placeholder="whsec_..."
            />
          </Field>
          <Field
            label="Webhook 接收地址"
            hint="把这个地址填到 Stripe Dashboard → Webhooks → Endpoint URL"
            span={2}
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
                {webhookUrl}
              </code>
              <Button variant="outline" onClick={copyWebhook} disabled={!form.uuid}>
                <Copy className="size-4" />
                复制
              </Button>
            </div>
          </Field>
        </CardContent>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "保存中…" : "保存"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  span,
  children
}: {
  label: string;
  required?: boolean;
  hint?: string;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span === 2 ? "md:col-span-2" : ""}`}>
      <Label className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
