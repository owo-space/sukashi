import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  notify_domain?: string | null;
  handling_fee_fixed?: number | null;
  handling_fee_percent?: string | null;
}

export function AdminPaymentPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.payment.fetch"],
    queryFn: () => apiGet<AdminPayment[]>("/admin/payment/fetch")
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPayment | null>(null);

  const save = useMutation({
    mutationFn: (input: Partial<AdminPayment>) => apiPost("/admin/payment/save", input),
    onSuccess: () => {
      toast.success("已保存");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const show = useMutation({
    mutationFn: (p: AdminPayment) =>
      apiPost("/admin/payment/show", { id: p.id, show: p.enable ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] })
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/payment/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.payment.fetch"] })
  });

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertDescription>
          Sukashi 仅支持 Stripe。请在 Stripe Dashboard → Developers → API keys 取得密钥,并把
          webhook 指向{" "}
          <span className="font-mono">
            {window.location.origin}/api/v1/guest/payment/notify/Stripe/&lt;payment-uuid&gt;
          </span>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">支付配置</CardTitle>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" />
                添加 Stripe
              </Button>
            </DialogTrigger>
            <PaymentDialog
              key={editing?.id ?? "new"}
              value={editing}
              onSubmit={(v) => save.mutate(v)}
              submitting={save.isPending}
            />
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead className="text-right">操作</TableHead>
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
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge>{p.payment}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(p.enable)}
                        onCheckedChange={() => show.mutate(p)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.uuid}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => drop.mutate(p.id)}
                      >
                        <Trash2 className="size-4" />
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentDialog({
  value,
  onSubmit,
  submitting
}: {
  value: AdminPayment | null;
  onSubmit: (v: Partial<AdminPayment>) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(value?.name ?? "Stripe");
  const [stripePublic, setStripePublic] = useState(value?.config?.stripe_public_key ?? "");
  const [stripeSecret, setStripeSecret] = useState(value?.config?.stripe_secret_key ?? "");
  const [webhook, setWebhook] = useState(value?.config?.stripe_webhook_secret ?? "");
  const [currency, setCurrency] = useState(value?.config?.currency ?? "usd");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{value ? "编辑支付方式" : "新建支付方式"}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">名称</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stripePublic">Stripe Publishable Key</Label>
          <Input
            id="stripePublic"
            placeholder="pk_live_..."
            value={stripePublic}
            onChange={(e) => setStripePublic(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stripeSecret">Stripe Secret Key</Label>
          <Input
            id="stripeSecret"
            placeholder="sk_live_..."
            value={stripeSecret}
            onChange={(e) => setStripeSecret(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="webhook">Webhook Signing Secret</Label>
          <Input
            id="webhook"
            placeholder="whsec_..."
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Currency (lowercase ISO 4217)</Label>
          <Input
            id="currency"
            placeholder="usd / cny / hkd"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSubmit({
              ...(value ? { id: value.id, uuid: value.uuid } : {}),
              name,
              payment: "Stripe",
              enable: value?.enable ?? 1,
              config: {
                stripe_public_key: stripePublic,
                stripe_secret_key: stripeSecret,
                stripe_webhook_secret: webhook,
                currency
              }
            })
          }
          disabled={submitting || !stripeSecret}
        >
          保存
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
