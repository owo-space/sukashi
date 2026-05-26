import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

interface Coupon {
  id: number;
  code: string;
  name: string;
  type: number;
  value: number;
  show: boolean | number;
  limit_use: number | null;
  limit_use_with_user: number | null;
  started_at: number;
  ended_at: number;
}

function isoToUnix(s: string): number {
  if (!s) return 0;
  return Math.floor(new Date(s).getTime() / 1000);
}
function unixToIso(u: number | null | undefined): string {
  if (!u) return "";
  return new Date(u * 1000).toISOString().slice(0, 10);
}

const FIELDS: FieldDef[] = [
  { key: "name", label: "名称", required: true },
  { key: "code", label: "代码 (留空自动)", placeholder: "例如 SUMMER2026" },
  {
    key: "type",
    label: "类型",
    type: "select",
    required: true,
    options: [
      { value: "1", label: "百分比" },
      { value: "2", label: "固定金额 (CNY)" }
    ]
  },
  { key: "value", label: "数值", type: "number", required: true },
  { key: "limit_use", label: "总使用上限", type: "number" },
  { key: "limit_use_with_user", label: "单用户上限", type: "number" },
  { key: "started_at", label: "开始日期 (YYYY-MM-DD)", required: true },
  { key: "ended_at", label: "结束日期 (YYYY-MM-DD)", required: true },
  { key: "show", label: "对外显示", type: "switch", span: 2 }
];

export function AdminCouponPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.coupon.fetch"],
    queryFn: () => apiGet<Coupon[]>("/admin/coupon/fetch")
  });

  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input };
      payload.type = Number(payload.type);
      if (typeof payload.started_at === "string") payload.started_at = isoToUnix(payload.started_at);
      if (typeof payload.ended_at === "string") payload.ended_at = isoToUnix(payload.ended_at);
      return apiPost("/admin/coupon/generate", payload);
    },
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/coupon/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] })
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
                setEditing({});
                setValues({ type: "1", show: 1, value: 10 });
              }}
            >
              <Plus className="size-4" />
              添加优惠券
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>显示</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.type === 1 ? "百分比" : "固定金额"}</TableCell>
                    <TableCell>{c.type === 1 ? `${c.value}%` : `¥ ${formatCny(c.value)}`}</TableCell>
                    <TableCell>
                      <Badge variant={c.show ? "default" : "outline"}>{c.show ? "显示" : "隐藏"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatUnixDate(c.started_at)} ~ {formatUnixDate(c.ended_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setValues({
                            id: c.id,
                            name: c.name,
                            code: c.code,
                            type: String(c.type),
                            value: c.value,
                            limit_use: c.limit_use ?? "",
                            limit_use_with_user: c.limit_use_with_user ?? "",
                            started_at: unixToIso(c.started_at),
                            ended_at: unixToIso(c.ended_at),
                            show: c.show ? 1 : 0
                          });
                        }}
                      >
                        <Pencil className="size-4" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`删除优惠券 "${c.name}"？`)) drop.mutate(c.id);
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
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing && "id" in editing ? "编辑优惠券" : "添加优惠券"}
        fields={FIELDS}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => save.mutate(values)}
        submitting={save.isPending}
      />
    </>
  );
}
