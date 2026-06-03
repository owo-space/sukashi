import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HelpCircle, User, ArrowDownUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/EmptyState";
import { NodeStatusDot } from "@/components/admin/NodeStatusDot";
import { ProtocolChip } from "@/components/admin/ProtocolChip";
import { ProtocolMenu } from "@/components/admin/ProtocolMenu";
import { RowActions } from "@/components/admin/RowActions";
import { DataDrawer } from "@/components/admin/DataDrawer";
import { NodeInstallDialog } from "@/components/admin/NodeInstallDialog";
import { ServerNodeForm } from "@/pages/admin/ServerNodeForm";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { PROTOCOLS, type Protocol } from "@/components/admin/protocols";

interface AdminServer {
  id: number;
  type: string;
  name: string;
  install_command?: string;
  protocol: Protocol;
  host: string;
  port: string | number;
  server_port?: number;
  serverPort?: number;
  rate: string;
  show: number | boolean;
  available_status?: number | null;
  is_online?: number | boolean;
  online?: number;
  group_id?: number[] | string | null;
  route_id?: number[] | string | null;
  tags?: string[];
  sort?: number | null;
  // protocol-specific fields raw
  cipher?: string | null;
  server_key?: string | null;
  tls?: number;
  tls_settings?: unknown;
  flow?: string | null;
  network?: string;
  network_settings?: unknown;
  encryption?: string | null;
  up_mbps?: number;
  down_mbps?: number;
  obfs?: string | null;
  obfs_password?: string | null;
  udp_relay_mode?: string | null;
  zero_rtt_handshake?: boolean | number;
  congestion_control?: string | null;
  disable_sni?: boolean | number;
  padding_scheme?: unknown;
  mieru_settings?: unknown;
}

interface ServerGroup {
  id: number;
  name: string;
}

interface ServerRoute {
  id: number;
  remarks: string;
}

function PaginationFooter({
  count,
  page,
  pageSize,
  onChange
}: {
  count: number;
  page: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (count <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="flex justify-end gap-1 px-4 py-3 text-xs">
      <Button
        size="sm"
        variant="ghost"
        className="size-7 p-0"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </Button>
      <span className="inline-flex size-7 items-center justify-center rounded border border-primary bg-white text-primary">
        {page}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="size-7 p-0"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </Button>
      <span className="ml-2 inline-flex items-center text-muted-foreground">10 条/页</span>
    </div>
  );
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
  const routes = useQuery({
    queryKey: ["admin.server.route.fetch"],
    queryFn: () => apiGet<ServerRoute[]>("/admin/server/route/fetch")
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE = 10;

  const [sortMode, setSortMode] = useState(false);
  const [sortedIds, setSortedIds] = useState<number[] | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const [editing, setEditing] = useState<{
    mode: "create" | "edit";
    protocol: Protocol;
    initial?: AdminServer;
  } | null>(null);

  const rows = useMemo(() => {
    const all = data ?? [];
    // when sortMode is on we ignore search/pagination and show every node
    // in the order the user is dragging them into.
    if (sortMode) {
      const idOrder = sortedIds ?? all.map((s) => s.id);
      const byId = new Map(all.map((s) => [s.id, s]));
      return idOrder.map((id) => byId.get(id)).filter((s): s is AdminServer => Boolean(s));
    }
    const q = search.trim().toLowerCase();
    return q
      ? all.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.host.toLowerCase().includes(q) ||
            String(s.id) === q
        )
      : all;
  }, [data, search, sortMode, sortedIds]);
  const paged = sortMode ? rows : rows.slice((page - 1) * PAGE, page * PAGE);

  const [installFor, setInstallFor] = useState<{
    command: string;
    name: string;
    id: number;
    highlight?: boolean;
  } | null>(null);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const beforeIds = new Set((data ?? []).map((s) => s.id));
      const isCreate = !payload.id;
      await apiPost("/admin/server/v2node/save", payload);
      if (isCreate) {
        // refetch to pick up the newly assigned ID + per-node install_command
        const fresh = await qc.fetchQuery({
          queryKey: ["admin.server.manage.getNodes"],
          queryFn: () => apiGet<AdminServer[]>("/admin/server/manage/getNodes")
        });
        const created = (fresh as AdminServer[]).find(
          (s) => !beforeIds.has(s.id)
        );
        return created ?? null;
      }
      return null;
    },
    onSuccess: (created) => {
      toast.success("保存成功");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] });
      const cmd = (created as { install_command?: string } | null)?.install_command;
      if (created && cmd) {
        setInstallFor({
          command: cmd,
          name: created.name,
          id: created.id,
          highlight: true
        });
      }
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const update = useMutation({
    mutationFn: (input: { id: number; [k: string]: unknown }) =>
      apiPost("/admin/server/v2node/update", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] })
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/v2node/drop", { id }),
    onSuccess: () => {
      toast.success("已删除");
      qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const copy = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/v2node/copy", { id }),
    onSuccess: () => {
      toast.success("已复制");
      qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] });
    }
  });

  const sortMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiPost("/admin/server/manage/sort", {
        ids,
        // legacy v2board also accepts these aliases:
        sort: ids,
        server_ids: ids
      }),
    onSuccess: () => {
      toast.success("排序已保存");
      setSortMode(false);
      setSortedIds(null);
      qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  function moveSorted(fromId: number, toId: number) {
    setSortedIds((prev) => {
      const base = prev ?? (data ?? []).map((s) => s.id);
      const from = base.indexOf(fromId);
      const to = base.indexOf(toId);
      if (from < 0 || to < 0 || from === to) return base;
      const next = base.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          {/* toolbar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
            <ProtocolMenu
              onPick={(protocol) => setEditing({ mode: "create", protocol })}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入任意关键字搜索"
              className="h-9 max-w-xs"
            />
            <div className="ml-auto flex items-center gap-2">
              {sortMode ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      setSortMode(false);
                      setSortedIds(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-9"
                    disabled={sortMutation.isPending}
                    onClick={() =>
                      sortMutation.mutate(sortedIds ?? (data ?? []).map((s) => s.id))
                    }
                  >
                    {sortMutation.isPending ? "保存中…" : "保存排序"}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="h-9"
                  onClick={() => {
                    setSortMode(true);
                    setSortedIds((data ?? []).map((s) => s.id));
                  }}
                >
                  <ArrowDownUp className="size-4" />
                  编辑排序
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">节点ID</TableHead>
                <TableHead className="text-muted-foreground">显隐</TableHead>
                <TableHead className="text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    节点
                    <Help>节点名称及在线状态</Help>
                  </span>
                </TableHead>
                <TableHead className="text-muted-foreground">地址</TableHead>
                <TableHead className="text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    人数
                    <Help>当前在线人数</Help>
                  </span>
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    倍率
                    <Help>计费倍率,1x 表示按实际流量计费</Help>
                  </span>
                </TableHead>
                <TableHead className="text-muted-foreground">权限组</TableHead>
                <TableHead className="text-right text-muted-foreground">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((s) => {
                  const groupIds = Array.isArray(s.group_id)
                    ? s.group_id.map(Number)
                    : typeof s.group_id === "string"
                      ? (() => {
                          try {
                            const parsed = JSON.parse(s.group_id);
                            return Array.isArray(parsed) ? parsed.map(Number) : [];
                          } catch {
                            return [];
                          }
                        })()
                      : [];
                  const groupNames = groupIds
                    .map((id) => groups.data?.find((g) => g.id === id)?.name ?? `#${id}`)
                    .join(", ");
                  return (
                    <TableRow
                      key={s.id}
                      className={`border-b border-border ${
                        sortMode ? "cursor-move select-none" : ""
                      } ${dragId === s.id ? "opacity-40" : ""}`}
                      draggable={sortMode}
                      onDragStart={(e) => {
                        if (!sortMode) return;
                        setDragId(s.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        if (!sortMode || dragId == null || dragId === s.id) return;
                        e.preventDefault();
                        moveSorted(dragId, s.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                    >
                      <TableCell>
                        {sortMode ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-muted-foreground">≡</span>
                            <ProtocolChip protocol={s.protocol}>{s.id}</ProtocolChip>
                          </span>
                        ) : (
                          <ProtocolChip protocol={s.protocol}>{s.id}</ProtocolChip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={Boolean(s.show)}
                          onCheckedChange={() =>
                            update.mutate({ id: s.id, show: s.show ? 0 : 1 })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <NodeStatusDot
                            availableStatus={s.available_status ?? null}
                            isOnline={s.is_online ?? null}
                          />
                          <span>{s.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground/80">
                        {s.host}
                        {s.port ? `:${s.port}` : ""}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-foreground/80">
                          <User className="size-3.5" strokeWidth={1.75} />
                          {s.online ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs">
                          {s.rate} x
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground/80 text-xs">{groupNames || "—"}</TableCell>
                      <TableCell className="text-right">
                        <RowActions>
                          <DropdownMenuItem
                            onClick={() =>
                              setEditing({ mode: "edit", protocol: s.protocol, initial: s })
                            }
                          >
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setInstallFor({
                                command: s.install_command ?? "",
                                name: s.name,
                                id: s.id
                              })
                            }
                          >
                            安装脚本
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copy.mutate(s.id)}>
                            复制
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`删除节点 "${s.name}"？`)) drop.mutate(s.id);
                            }}
                          >
                            删除
                          </DropdownMenuItem>
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <PaginationFooter
            count={rows.length}
            page={page}
            pageSize={PAGE}
            onChange={setPage}
          />
        </CardContent>
      </Card>

      <DataDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={
          editing
            ? `${editing.mode === "create" ? "新建" : "编辑"} · ${PROTOCOLS[editing.protocol].label}`
            : ""
        }
        submitting={save.isPending}
        onSubmit={() => {
          /* submission is handled inside the form via ref */
        }}
        // we don't render the default footer because form has its own submit
        footer={<div className="flex items-center justify-between border-t px-6 py-3" data-server-footer="auto" />}
      >
        {editing ? (
          <ServerNodeForm
            mode={editing.mode}
            protocol={editing.protocol}
            initial={editing.initial as Record<string, unknown> | undefined}
            groups={groups.data ?? []}
            routes={routes.data ?? []}
            onCancel={() => setEditing(null)}
            onSubmit={(payload) => save.mutate(payload)}
            submitting={save.isPending}
          />
        ) : null}
      </DataDrawer>

      <NodeInstallDialog
        open={installFor !== null}
        onOpenChange={(o) => !o && setInstallFor(null)}
        command={installFor?.command ?? ""}
        nodeName={installFor?.name}
        nodeId={installFor?.id}
        highlight={installFor?.highlight}
      />
    </>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
