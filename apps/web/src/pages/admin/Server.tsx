import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

interface AdminServer {
  id: number;
  type: string;
  name: string;
  parentId?: number | null;
  rate: string | number;
  tags?: string[] | string | null;
  groupId?: number[] | string | null;
  group_id?: number[] | string | null;
  is_online?: boolean | number;
  show?: boolean | number;
  host?: string;
  port?: string | number;
  serverPort?: number;
  server_port?: number;
  online?: number;
  protocol?: string;
  cipher?: string | null;
  network?: string;
  tls?: number;
  sort?: number | null;
}

const PROTOCOL_OPTIONS = [
  { value: "shadowsocks", label: "Shadowsocks" },
  { value: "vless", label: "VLESS" },
  { value: "vmess", label: "VMess" },
  { value: "trojan", label: "Trojan" },
  { value: "hysteria2", label: "Hysteria2" },
  { value: "tuic", label: "TUIC" },
  { value: "anytls", label: "AnyTLS" },
  { value: "mieru", label: "Mieru" },
  { value: "snell", label: "Snell" }
];

const PROTOCOL_LABEL: Record<string, string> = Object.fromEntries(
  PROTOCOL_OPTIONS.map((o) => [o.value, o.label])
);

interface ServerGroup {
  id: number;
  name: string;
}

export function AdminServerPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.server.manage.getNodes"],
    queryFn: () => apiGet<AdminServer[]>("/admin/server/manage/getNodes"),
    refetchInterval: 30_000
  });
  const groups = useQuery({
    queryKey: ["admin.server.group.fetch"],
    queryFn: () => apiGet<ServerGroup[]>("/admin/server/group/fetch")
  });

  const [editing, setEditing] = useState<Partial<AdminServer> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  function openCreate() {
    setEditing({});
    setFormValues({ protocol: "shadowsocks", show: 1, rate: "1", port: "443", server_port: 443 });
  }
  function openEdit(s: AdminServer) {
    setEditing(s);
    setFormValues({
      id: s.id,
      name: s.name,
      protocol: s.protocol ?? "shadowsocks",
      host: s.host,
      port: s.port,
      server_port: s.server_port ?? s.serverPort,
      rate: typeof s.rate === "string" ? s.rate : String(s.rate),
      show: s.show ? 1 : 0,
      network: s.network ?? "tcp",
      sort: s.sort,
      group_id: Array.isArray(s.group_id) ? s.group_id.join(",") : s.group_id ?? ""
    });
  }

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost("/admin/server/v2node/save", input),
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (s: AdminServer) => apiPost("/admin/server/v2node/drop", { id: s.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] })
  });

  const copy = useMutation({
    mutationFn: (s: AdminServer) => apiPost("/admin/server/v2node/copy", { id: s.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] })
  });

  const toggleShow = useMutation({
    mutationFn: (s: AdminServer) =>
      apiPost("/admin/server/v2node/update", { id: s.id, show: s.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const fields: FieldDef[] = [
    { key: "name", label: "节点名称", required: true },
    {
      key: "protocol",
      label: "协议",
      type: "select",
      required: true,
      options: PROTOCOL_OPTIONS
    },
    { key: "host", label: "地址 (Host)", required: true, placeholder: "1.2.3.4 / hostname" },
    { key: "port", label: "公网端口", required: true, placeholder: "443" },
    { key: "server_port", label: "内部端口", type: "number", required: true, placeholder: "443" },
    { key: "rate", label: "倍率", required: true, placeholder: "1" },
    {
      key: "group_id",
      label: "权限组 ID (逗号分隔)",
      placeholder: groups.data?.map((g) => `${g.id}:${g.name}`).join("  ") ?? ""
    },
    { key: "sort", label: "排序", type: "number" },
    { key: "show", label: "对外显示", type: "switch", span: 2 }
  ];

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
          <div>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="size-4" />
              添加节点
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>显示</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>协议</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>倍率</TableHead>
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
                data.map((s) => (
                  <TableRow key={`${s.type}-${s.id}`}>
                    <TableCell>{s.id}</TableCell>
                    <TableCell>
                      <Switch checked={Boolean(s.show)} onCheckedChange={() => toggleShow.mutate(s)} />
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PROTOCOL_LABEL[s.protocol ?? ""] ?? s.protocol ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_online ? "default" : "outline"}>
                        {s.is_online ? "在线" : "离线"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.host}
                      {s.port ? `:${s.port}` : ""}
                    </TableCell>
                    <TableCell>{s.rate}x</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="size-4" />
                        编辑
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy.mutate(s)}>
                        <Copy className="size-4" />
                        复制
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`删除节点 "${s.name}"？`)) drop.mutate(s);
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
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing && "id" in editing ? "编辑节点" : "添加节点"}
        fields={fields}
        values={formValues}
        onChange={(k, v) => setFormValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => {
          const payload: Record<string, unknown> = { ...formValues };
          if (typeof payload.group_id === "string") {
            payload.group_id = (payload.group_id as string)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
          save.mutate(payload);
        }}
        submitting={save.isPending}
        size="lg"
      />
    </>
  );
}
