import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";

interface Giftcard {
  id: number;
  name: string;
  code: string;
  type: number;
  value: number | null;
  plan_id: number | null;
  limit_use: number | null;
  started_at: number;
  ended_at: number;
  status?: number;
  created_at: number;
}

function isoToUnix(s: string): number {
  if (!s) return 0;
  return Math.floor(new Date(s).getTime() / 1000);
}

const FIELDS: FieldDef[] = [
  { key: "name", label: "礼品卡名称", required: true },
  { key: "generate_count", label: "生成数量", type: "number", required: true },
  {
    key: "type",
    label: "类型",
    type: "select",
    required: true,
    options: [
      { value: "1", label: "余额 (CNY)" },
      { value: "2", label: "订阅 (固定 plan)" }
    ]
  },
  { key: "value", label: "金额 (CNY)", type: "number" },
  { key: "plan_id", label: "Plan ID (type=2 时必填)", type: "number" },
  { key: "limit_use", label: "使用上限 (留空不限)", type: "number" },
  { key: "started_at", label: "开始日期 (YYYY-MM-DD)", required: true },
  { key: "ended_at", label: "结束日期 (YYYY-MM-DD)", required: true }
];

export function AdminGiftcardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.giftcard.fetch"],
    queryFn: () => apiGet<Giftcard[]>("/admin/giftcard/fetch")
  });

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const generate = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input };
      payload.type = Number(payload.type);
      if (typeof payload.started_at === "string") payload.started_at = isoToUnix(payload.started_at);
      if (typeof payload.ended_at === "string") payload.ended_at = isoToUnix(payload.ended_at);
      return apiPost("/admin/giftcard/generate", payload);
    },
    onSuccess: () => {
      toast.success("已生成");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin.giftcard.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/giftcard/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.giftcard.fetch"] })
  });

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setValues({ type: "1", generate_count: 1 });
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              生成礼品卡
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>金额/Plan</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.id}</TableCell>
                    <TableCell>{g.name}</TableCell>
                    <TableCell className="font-mono text-xs">{g.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{g.type === 1 ? "余额" : "订阅"}</Badge>
                    </TableCell>
                    <TableCell>
                      {g.type === 1 ? `¥ ${formatCny(g.value ?? 0)}` : `Plan #${g.plan_id}`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatUnixDate(g.started_at)} ~ {formatUnixDate(g.ended_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`删除 "${g.code}"？`)) drop.mutate(g.id);
                        }}
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

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="生成礼品卡"
        fields={FIELDS}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => generate.mutate(values)}
        submitting={generate.isPending}
        submitLabel="生成"
      />
    </>
  );
}
