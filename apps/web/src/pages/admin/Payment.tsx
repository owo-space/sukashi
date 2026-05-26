import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { RowActions } from "@/components/admin/RowActions";
import { DataDrawer } from "@/components/admin/DataDrawer";
import { ApiError, apiGet, apiPost } from "@/lib/api";

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

export function AdminPaymentPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.payment.fetch"],
    queryFn: () => apiGet<AdminPayment[]>("/admin/payment/fetch")
  });

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: AdminPayment } | null>(
    null
  );
  const [form, setForm] = useState<Record<string, unknown>>({
    name: "Stripe",
    payment: "Stripe",
    enable: 1,
    config: { currency: "usd" }
  });

  const save = useMutation({
    mutationFn: () => apiPost("/admin/payment/save", form),
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const showToggle = useMutation({
    mutationFn: (p: AdminPayment) =>
      apiPost("/admin/payment/show", { id: p.id, show: p.enable ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] })
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/payment/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] })
  });

  const cfg = (form.config as Record<string, string>) ?? {};

  function setConfig(key: string, value: string) {
    setForm((f) => ({ ...f, config: { ...(f.config as object), [key]: value } }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => {
                setForm({
                  name: "Stripe",
                  payment: "Stripe",
                  enable: 1,
                  config: { currency: "usd" }
                });
                setEditing({ mode: "create" });
              }}
            >
              <Plus className="size-4" />
              添加 Stripe
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-slate-500">ID</TableHead>
                <TableHead className="text-slate-500">名称</TableHead>
                <TableHead className="text-slate-500">类型</TableHead>
                <TableHead className="text-slate-500">状态</TableHead>
                <TableHead className="text-slate-500">UUID</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState message="尚未配置支付方式" />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((p) => (
                  <TableRow key={p.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{p.id}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
                        {p.payment}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(p.enable)}
                        onCheckedChange={() => showToggle.mutate(p)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{p.uuid}</TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuItem
                          onClick={() => {
                            setForm({
                              id: p.id,
                              uuid: p.uuid,
                              name: p.name,
                              payment: p.payment,
                              enable: p.enable ? 1 : 0,
                              config: p.config ?? {}
                            });
                            setEditing({ mode: "edit", row: p });
                          }}
                        >
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const url = `${window.location.origin}/api/v1/guest/payment/notify/Stripe/${p.uuid}`;
                            void navigator.clipboard.writeText(url);
                            toast.success("已复制 Webhook 地址");
                          }}
                        >
                          复制 Webhook 地址
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除 "${p.name}"？`)) drop.mutate(p.id);
                          }}
                        >
                          删除
                        </DropdownMenuItem>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.mode === "edit" ? "编辑支付方式" : "添加支付方式"}
        submitting={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="flex flex-col gap-3">
          <Field label="名称" required>
            <Input
              value={String(form.name ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Stripe Publishable Key">
            <Input
              placeholder="pk_live_..."
              value={cfg.stripe_public_key ?? ""}
              onChange={(e) => setConfig("stripe_public_key", e.target.value)}
            />
          </Field>
          <Field label="Stripe Secret Key" required>
            <Input
              type="password"
              placeholder="sk_live_..."
              value={cfg.stripe_secret_key ?? ""}
              onChange={(e) => setConfig("stripe_secret_key", e.target.value)}
            />
          </Field>
          <Field label="Webhook Signing Secret">
            <Input
              placeholder="whsec_..."
              value={cfg.stripe_webhook_secret ?? ""}
              onChange={(e) => setConfig("stripe_webhook_secret", e.target.value)}
            />
          </Field>
          <Field label="货币 (lowercase ISO 4217)">
            <Input
              placeholder="usd / cny / hkd"
              value={cfg.currency ?? "usd"}
              onChange={(e) => setConfig("currency", e.target.value)}
            />
          </Field>
          <Field label="启用">
            <Switch
              checked={Boolean(form.enable)}
              onCheckedChange={(c) => setForm((f) => ({ ...f, enable: c ? 1 : 0 }))}
            />
          </Field>
        </div>
      </DataDrawer>
    </div>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      {children}
    </div>
  );
}
