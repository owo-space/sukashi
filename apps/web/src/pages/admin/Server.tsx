import { useMemo, useState } from "react";
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
import { NodeStatusDot } from "@/components/admin/NodeStatusDot";
import { ApiError, apiGet, apiPost } from "@/lib/api";

type Protocol =
  | "shadowsocks"
  | "vless"
  | "vmess"
  | "trojan"
  | "hysteria2"
  | "tuic"
  | "anytls"
  | "mieru"
  | "snell";

interface AdminServer {
  id: number;
  type: string;
  name: string;
  parentId?: number | null;
  rate: string | number;
  tags?: string[] | string | null;
  group_id?: number[] | string | null;
  is_online?: boolean | number;
  available_status?: number | null;
  show?: boolean | number;
  host?: string;
  port?: string | number;
  serverPort?: number;
  server_port?: number;
  online?: number;
  protocol?: Protocol;
  cipher?: string | null;
  server_key?: string | null;
  network?: string;
  network_settings?: unknown;
  tls?: number;
  tls_settings?: unknown;
  flow?: string | null;
  encryption?: string | null;
  encryption_settings?: unknown;
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
  sort?: number | null;
}

const PROTOCOL_OPTIONS: Array<{ value: Protocol; label: string }> = [
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

const NETWORK_OPTIONS = [
  { value: "tcp", label: "TCP" },
  { value: "ws", label: "WebSocket" },
  { value: "grpc", label: "gRPC" },
  { value: "h2", label: "HTTP/2" },
  { value: "http", label: "HTTP" }
];
const TLS_OPTIONS = [
  { value: "0", label: "无 TLS" },
  { value: "1", label: "TLS" },
  { value: "2", label: "Reality" }
];

interface ServerGroup {
  id: number;
  name: string;
}

const COMMON_PREFIX: FieldDef[] = [
  { key: "name", label: "节点名称", required: true },
  { key: "protocol", label: "协议", type: "select", required: true, options: PROTOCOL_OPTIONS },
  { key: "host", label: "地址 (Host)", required: true, placeholder: "1.2.3.4 / hostname" },
  { key: "port", label: "公网端口", required: true, placeholder: "443" },
  { key: "server_port", label: "内部端口", type: "number", required: true, placeholder: "443" },
  { key: "rate", label: "倍率", required: true, placeholder: "1" },
  { key: "sort", label: "排序", type: "number" }
];

const COMMON_SUFFIX: FieldDef[] = [
  { key: "show", label: "对外显示", type: "switch", span: 2 }
];

const PROTOCOL_FIELDS: Record<Protocol, FieldDef[]> = {
  shadowsocks: [
    {
      key: "cipher",
      label: "加密方式",
      type: "select",
      options: [
        { value: "aes-128-gcm", label: "aes-128-gcm" },
        { value: "aes-256-gcm", label: "aes-256-gcm" },
        { value: "chacha20-ietf-poly1305", label: "chacha20-ietf-poly1305" },
        { value: "2022-blake3-aes-128-gcm", label: "2022-blake3-aes-128-gcm" },
        { value: "2022-blake3-aes-256-gcm", label: "2022-blake3-aes-256-gcm" },
        { value: "2022-blake3-chacha20-poly1305", label: "2022-blake3-chacha20-poly1305" }
      ]
    },
    { key: "server_key", label: "密码 / Server Key", required: true },
    {
      key: "obfs",
      label: "Obfs",
      type: "select",
      options: [
        { value: "", label: "无" },
        { value: "http", label: "http" },
        { value: "tls", label: "tls" }
      ]
    }
  ],
  vless: [
    { key: "tls", label: "TLS", type: "select", options: TLS_OPTIONS },
    { key: "flow", label: "Flow", placeholder: "xtls-rprx-vision (留空=无)" },
    { key: "network", label: "传输协议", type: "select", options: NETWORK_OPTIONS },
    {
      key: "network_settings",
      label: "传输协议设置 (JSON)",
      type: "textarea",
      span: 2,
      placeholder: '{"path":"/ws","host":"example.com"}'
    },
    { key: "tls_settings", label: "TLS 设置 (JSON)", type: "textarea", span: 2 },
    { key: "encryption", label: "加密 (Reality / xtls)" }
  ],
  vmess: [
    { key: "tls", label: "TLS", type: "select", options: TLS_OPTIONS.slice(0, 2) },
    { key: "network", label: "传输协议", type: "select", options: NETWORK_OPTIONS },
    { key: "network_settings", label: "传输协议设置 (JSON)", type: "textarea", span: 2 },
    { key: "tls_settings", label: "TLS 设置 (JSON)", type: "textarea", span: 2 }
  ],
  trojan: [
    { key: "server_key", label: "密码", required: true },
    { key: "tls", label: "TLS", type: "select", options: TLS_OPTIONS.slice(0, 2) },
    { key: "network", label: "传输协议", type: "select", options: NETWORK_OPTIONS },
    { key: "network_settings", label: "传输协议设置 (JSON)", type: "textarea", span: 2 },
    { key: "tls_settings", label: "TLS 设置 (JSON)", type: "textarea", span: 2 }
  ],
  hysteria2: [
    { key: "server_key", label: "认证密码 (auth_str)", required: true },
    { key: "up_mbps", label: "上行 Mbps", type: "number" },
    { key: "down_mbps", label: "下行 Mbps", type: "number" },
    {
      key: "obfs",
      label: "Obfs",
      type: "select",
      options: [
        { value: "", label: "无" },
        { value: "salamander", label: "salamander" }
      ]
    },
    { key: "obfs_password", label: "Obfs 密码" }
  ],
  tuic: [
    { key: "server_key", label: "UUID:Password", required: true, placeholder: "uuid:password" },
    {
      key: "udp_relay_mode",
      label: "UDP 中继",
      type: "select",
      options: [
        { value: "native", label: "native" },
        { value: "quic", label: "quic" }
      ]
    },
    {
      key: "congestion_control",
      label: "拥塞控制",
      type: "select",
      options: [
        { value: "bbr", label: "bbr" },
        { value: "cubic", label: "cubic" },
        { value: "new_reno", label: "new_reno" }
      ]
    },
    { key: "zero_rtt_handshake", label: "0-RTT 握手", type: "switch" },
    { key: "disable_sni", label: "禁用 SNI", type: "switch" }
  ],
  anytls: [
    { key: "server_key", label: "密码", required: true },
    {
      key: "padding_scheme",
      label: "Padding Scheme (JSON, 留空使用默认)",
      type: "textarea",
      span: 2
    }
  ],
  mieru: [
    { key: "server_key", label: "用户密码", required: true },
    {
      key: "network",
      label: "传输协议",
      type: "select",
      options: [
        { value: "tcp", label: "TCP" },
        { value: "udp", label: "UDP" },
        { value: "mixed", label: "TCP + UDP" }
      ]
    },
    {
      key: "mieru_settings",
      label: "Mieru Settings (JSON, 留空使用默认)",
      type: "textarea",
      span: 2,
      placeholder:
        '{"mtu":0,"port_bindings":[{"port":443,"protocol":"TCP"}],"traffic_pattern":null,"user_hint_is_mandatory":false}'
    }
  ],
  snell: [
    { key: "server_key", label: "PSK", required: true },
    {
      key: "obfs",
      label: "Obfs",
      type: "select",
      options: [
        { value: "", label: "无" },
        { value: "http", label: "http" },
        { value: "tls", label: "tls" }
      ]
    },
    { key: "obfs_password", label: "Obfs Host" }
  ]
};

function fieldsFor(protocol: Protocol, groupHint: string): FieldDef[] {
  return [
    ...COMMON_PREFIX,
    {
      key: "group_id",
      label: "权限组 ID (逗号分隔)",
      placeholder: groupHint,
      hint: "可填多个权限组,逗号分隔"
    },
    ...PROTOCOL_FIELDS[protocol],
    ...COMMON_SUFFIX
  ];
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
  const groupHint = useMemo(
    () => (groups.data ?? []).map((g) => `${g.id}=${g.name}`).join(", "),
    [groups.data]
  );

  const [editing, setEditing] = useState<Partial<AdminServer> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const currentProtocol = (values.protocol as Protocol) ?? "shadowsocks";
  const fields = useMemo(() => fieldsFor(currentProtocol, groupHint), [currentProtocol, groupHint]);

  function openCreate() {
    setEditing({});
    setValues({
      protocol: "shadowsocks",
      show: 1,
      rate: "1",
      port: "443",
      server_port: 443,
      network: "tcp",
      tls: "0"
    });
  }
  function openEdit(s: AdminServer) {
    setEditing(s);
    setValues({
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
      group_id: Array.isArray(s.group_id) ? s.group_id.join(",") : s.group_id ?? "",
      cipher: s.cipher ?? "",
      server_key: s.server_key ?? "",
      tls: s.tls != null ? String(s.tls) : "0",
      tls_settings: s.tls_settings ? JSON.stringify(s.tls_settings, null, 2) : "",
      flow: s.flow ?? "",
      network_settings: s.network_settings ? JSON.stringify(s.network_settings, null, 2) : "",
      encryption: s.encryption ?? "",
      up_mbps: s.up_mbps ?? 0,
      down_mbps: s.down_mbps ?? 0,
      obfs: s.obfs ?? "",
      obfs_password: s.obfs_password ?? "",
      udp_relay_mode: s.udp_relay_mode ?? "native",
      zero_rtt_handshake: s.zero_rtt_handshake ? 1 : 0,
      congestion_control: s.congestion_control ?? "bbr",
      disable_sni: s.disable_sni ? 1 : 0,
      padding_scheme: s.padding_scheme ? JSON.stringify(s.padding_scheme, null, 2) : "",
      mieru_settings: s.mieru_settings ? JSON.stringify(s.mieru_settings, null, 2) : ""
    });
  }

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input };
      if (typeof payload.group_id === "string") {
        payload.group_id = (payload.group_id as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      // textarea -> JSON for the per-protocol JSON-shaped fields
      for (const k of [
        "tls_settings",
        "network_settings",
        "padding_scheme",
        "mieru_settings"
      ]) {
        const v = payload[k];
        if (typeof v === "string" && v.trim()) {
          try {
            payload[k] = JSON.parse(v as string);
          } catch {
            throw new Error(`${k} 不是合法的 JSON`);
          }
        }
        if (typeof v === "string" && !v.trim()) {
          delete payload[k];
        }
      }
      payload.tls = Number(payload.tls ?? 0);
      payload.zero_rtt_handshake = payload.zero_rtt_handshake ? 1 : 0;
      payload.disable_sni = payload.disable_sni ? 1 : 0;
      return apiPost("/admin/server/v2node/save", payload);
    },
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
    onSuccess: () => {
      toast.success("已复制");
      qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] });
    }
  });
  const toggleShow = useMutation({
    mutationFn: (s: AdminServer) =>
      apiPost("/admin/server/v2node/update", { id: s.id, show: s.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

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
                <TableHead>在线人数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
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
                      <Badge variant="secondary">
                        {PROTOCOL_LABEL[s.protocol ?? ""] ?? s.protocol ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <NodeStatusDot
                        availableStatus={s.available_status ?? null}
                        isOnline={s.is_online ?? null}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.host}
                      {s.port ? `:${s.port}` : ""}
                    </TableCell>
                    <TableCell>{s.rate}x</TableCell>
                    <TableCell>{s.online ?? 0}</TableCell>
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
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => save.mutate(values)}
        submitting={save.isPending}
        size="lg"
      />
    </>
  );
}
