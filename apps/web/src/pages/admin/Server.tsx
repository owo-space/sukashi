import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Form, Input, Label, ListBox, Modal, Select, Skeleton, Switch, Table, TextArea, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import type { ServerGroup, ServerNode, ServerRoute } from "@/lib/types";

const PROTOCOLS = ["mieru", "shadowsocks", "vless", "vmess", "trojan", "hysteria2", "tuic", "anytls"];

export function AdminServerPage() {
  const [tab, setTab] = useState<"node" | "group" | "route">("node");
  return (
    <>
      <PageHeader
        title="节点管理"
        actions={
          <div className="flex gap-1 rounded-lg bg-default-100 p-1">
            {[
              ["node", "节点"],
              ["group", "权限组"],
              ["route", "路由"]
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k as typeof tab)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  tab === k ? "bg-background shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {tab === "node" && <NodeTab />}
      {tab === "group" && <GroupTab />}
      {tab === "route" && <RouteTab />}
    </>
  );
}

function NodeTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ServerNode | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "server", "manage", "getNodes"],
    queryFn: () => apiGet<ServerNode[]>("/admin/server/manage/getNodes")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/server/v2node/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/v2node/drop", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server"] });
    }
  });
  const copy = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/v2node/copy", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server"] });
    }
  });

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>节点列表</Card.Title>
          <Card.Description>所有协议都使用统一的 v2node 数据模型。</Card.Description>
          <Card.Footer>
            <Button size="sm" onPress={() => setCreating(true)}>新建节点</Button>
          </Card.Footer>
        </Card.Header>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.length ? (
            <EmptyState title="暂无节点" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="节点列表" className="min-w-[900px]">
                  <Table.Header>
                    <Table.Column isRowHeader>名称</Table.Column>
                    <Table.Column>协议</Table.Column>
                    <Table.Column>地址</Table.Column>
                    <Table.Column>端口</Table.Column>
                    <Table.Column>倍率</Table.Column>
                    <Table.Column>在线</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((n) => (
                      <Table.Row key={n.id}>
                        <Table.Cell>{n.name}</Table.Cell>
                        <Table.Cell>{n.protocol}</Table.Cell>
                        <Table.Cell>{n.host}</Table.Cell>
                        <Table.Cell>{n.port}</Table.Cell>
                        <Table.Cell>{Number(n.rate).toFixed(2)}</Table.Cell>
                        <Table.Cell>{n.online}</Table.Cell>
                        <Table.Cell>
                          {n.show ? (
                            n.is_online ? (
                              <Chip variant="default" color="success">在线</Chip>
                            ) : (
                              <Chip variant="default" color="warning">未连接</Chip>
                            )
                          ) : (
                            <Chip variant="default">已隐藏</Chip>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onPress={() => setEditing(n)}>编辑</Button>
                            <Button size="sm" variant="ghost" onPress={() => copy.mutate(n.id)}>复制</Button>
                            <Button size="sm" variant="danger" onPress={() => drop.mutate(n.id)}>删除</Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>
      <NodeModal
        node={editing ?? null}
        open={Boolean(editing) || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSave={(body) => save.mutate(body)}
        saving={save.isPending}
      />
    </>
  );
}

function NodeModal({
  node,
  open,
  onClose,
  onSave,
  saving
}: {
  node: ServerNode | null;
  open: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [protocol, setProtocol] = useState<string>(node?.protocol ?? "mieru");
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(v) => !v && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[640px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{node ? `编辑节点 #${node.id}` : "新建节点"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              id="node-form"
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const body: Record<string, unknown> = { protocol };
                if (node) body.id = node.id;
                for (const k of ["name", "host", "port", "server_port", "rate", "tls", "network", "cipher", "server_key", "up_mbps", "down_mbps", "obfs", "obfs_password", "server_name"]) {
                  const v = fd.get(k);
                  if (v !== null && v !== "") body[k] = v;
                }
                body.show = fd.get("show") === "on" ? 1 : 0;
                body.insecure = fd.get("insecure") === "on" ? 1 : 0;
                body.group_id = (fd.get("group_id") as string ?? "").split(",").map((s) => s.trim()).filter(Boolean);
                body.route_id = (fd.get("route_id") as string ?? "").split(",").map((s) => s.trim()).filter(Boolean);
                onSave(body);
              }}
            >
              <Select className="col-span-2" selectedKey={protocol} onSelectionChange={(k) => setProtocol(String(k))}>
                <Label>协议</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {PROTOCOLS.map((p) => (
                      <ListBox.Item key={p} id={p} textValue={p}>
                        {p}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <TextField name="name" defaultValue={node?.name ?? ""} isRequired>
                <Label>名称</Label>
                <Input />
                <FieldError />
              </TextField>
              <TextField name="rate" defaultValue={String(node?.rate ?? "1")} isRequired>
                <Label>倍率</Label>
                <Input type="number" step="0.01" />
                <FieldError />
              </TextField>
              <TextField name="host" defaultValue={node?.host ?? ""} isRequired>
                <Label>主机地址</Label>
                <Input />
                <FieldError />
              </TextField>
              <TextField name="port" defaultValue={String(node?.port ?? "")} isRequired>
                <Label>客户端连接端口</Label>
                <Input />
                <FieldError />
              </TextField>
              <TextField name="server_port" defaultValue={String(node?.server_port ?? "")}>
                <Label>服务端监听端口</Label>
                <Input type="number" />
                <FieldError />
              </TextField>
              <TextField name="network" defaultValue={node?.network ?? "tcp"}>
                <Label>网络</Label>
                <Input placeholder="tcp / ws / grpc / quic" />
                <FieldError />
              </TextField>
              <TextField name="group_id" defaultValue={(node?.group_id ?? []).join(",")} className="col-span-2">
                <Label>权限组 ID（逗号分隔）</Label>
                <Input />
                <FieldError />
              </TextField>
              <TextField name="route_id" defaultValue={(node?.route_id ?? []).join(",")} className="col-span-2">
                <Label>路由 ID（逗号分隔）</Label>
                <Input />
                <FieldError />
              </TextField>
              {protocol === "shadowsocks" ? (
                <TextField name="cipher" defaultValue={node?.cipher ?? "2022-blake3-aes-256-gcm"} className="col-span-2">
                  <Label>加密方式</Label>
                  <Input />
                  <FieldError />
                </TextField>
              ) : null}
              {protocol === "hysteria2" || protocol === "tuic" || protocol === "anytls" ? (
                <>
                  <TextField name="server_name" defaultValue={node?.server_name ?? ""}>
                    <Label>SNI</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="insecure" defaultChecked={Boolean(node?.insecure)} />
                    跳过证书校验 (insecure)
                  </label>
                </>
              ) : null}
              {protocol === "hysteria2" ? (
                <>
                  <TextField name="up_mbps" defaultValue={String(node?.up_mbps ?? "")}>
                    <Label>上行带宽 Mbps</Label>
                    <Input type="number" />
                    <FieldError />
                  </TextField>
                  <TextField name="down_mbps" defaultValue={String(node?.down_mbps ?? "")}>
                    <Label>下行带宽 Mbps</Label>
                    <Input type="number" />
                    <FieldError />
                  </TextField>
                  <TextField name="obfs" defaultValue={node?.obfs ?? ""}>
                    <Label>Obfs</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <TextField name="obfs_password" defaultValue={node?.obfs_password ?? ""}>
                    <Label>Obfs Password</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                </>
              ) : null}
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="show" defaultChecked={Boolean(node?.show ?? 1)} />
                上架
              </label>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">取消</Button>
            <Button type="submit" form="node-form" isPending={saving}>保存</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function GroupTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ServerGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "server", "group", "fetch"],
    queryFn: () => apiGet<ServerGroup[]>("/admin/server/group/fetch")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/server/group/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server", "group"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/group/drop", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server", "group"] });
    }
  });

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>权限组</Card.Title>
          <Card.Footer>
            <Button size="sm" onPress={() => setCreating(true)}>新建权限组</Button>
          </Card.Footer>
        </Card.Header>
        <Card.Content className="p-0">
          <Table className="dense-table">
            <Table.ScrollContainer>
              <Table.Content aria-label="权限组列表">
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>名称</Table.Column>
                  <Table.Column>用户数</Table.Column>
                  <Table.Column>套餐数</Table.Column>
                  <Table.Column>节点数</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body>
                  {(data ?? []).map((g) => (
                    <Table.Row key={g.id}>
                      <Table.Cell>{g.id}</Table.Cell>
                      <Table.Cell>{g.name}</Table.Cell>
                      <Table.Cell>{g.user_count ?? 0}</Table.Cell>
                      <Table.Cell>{g.plan_count ?? 0}</Table.Cell>
                      <Table.Cell>{g.server_count ?? 0}</Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onPress={() => setEditing(g)}>编辑</Button>
                          <Button size="sm" variant="danger" onPress={() => drop.mutate(g.id)}>删除</Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>
      <Modal.Backdrop isOpen={Boolean(editing) || creating} onOpenChange={(v) => !v && (setEditing(null), setCreating(false))}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing ? `编辑权限组 #${editing.id}` : "新建权限组"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="group-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = { name: fd.get("name") };
                  if (editing) body.id = editing.id;
                  save.mutate(body);
                }}
              >
                <TextField name="name" defaultValue={editing?.name ?? ""} isRequired>
                  <Label>名称</Label>
                  <Input />
                  <FieldError />
                </TextField>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button type="submit" form="group-form" isPending={save.isPending}>保存</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

function RouteTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ServerRoute | null>(null);
  const [creating, setCreating] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "server", "route", "fetch"],
    queryFn: () => apiGet<ServerRoute[]>("/admin/server/route/fetch")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/server/route/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server", "route"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/route/drop", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "server", "route"] });
    }
  });

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>路由</Card.Title>
          <Card.Footer>
            <Button size="sm" onPress={() => setCreating(true)}>新建路由</Button>
          </Card.Footer>
        </Card.Header>
        <Card.Content className="p-0">
          <Table className="dense-table">
            <Table.ScrollContainer>
              <Table.Content aria-label="路由列表">
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>备注</Table.Column>
                  <Table.Column>动作</Table.Column>
                  <Table.Column>操作</Table.Column>
                </Table.Header>
                <Table.Body>
                  {(data ?? []).map((r) => (
                    <Table.Row key={r.id}>
                      <Table.Cell>{r.id}</Table.Cell>
                      <Table.Cell>{r.remarks}</Table.Cell>
                      <Table.Cell>{r.action}</Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onPress={() => setEditing(r)}>编辑</Button>
                          <Button size="sm" variant="danger" onPress={() => drop.mutate(r.id)}>删除</Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>
      <Modal.Backdrop isOpen={Boolean(editing) || creating} onOpenChange={(v) => !v && (setEditing(null), setCreating(false))}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing ? `编辑路由 #${editing.id}` : "新建路由"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="route-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = {
                    remarks: fd.get("remarks"),
                    action: fd.get("action"),
                    match: (fd.get("match") as string ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
                    action_value: fd.get("action_value") || null
                  };
                  if (editing) body.id = editing.id;
                  save.mutate(body);
                }}
              >
                <TextField name="remarks" defaultValue={editing?.remarks ?? ""} isRequired>
                  <Label>备注</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField name="action" defaultValue={editing?.action ?? "block"}>
                  <Label>动作 (block / dns / direct)</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <div>
                  <Label>匹配规则（每行一条）</Label>
                  <TextArea
                    name="match"
                    defaultValue={
                      Array.isArray(editing?.match)
                        ? (editing.match as unknown[]).map(String).join("\n")
                        : ""
                    }
                    rows={6}
                    placeholder="domain:google.com&#10;geosite:netflix"
                  />
                </div>
                <TextField name="action_value" defaultValue={String(editing?.action_value ?? "")}>
                  <Label>动作参数（可选）</Label>
                  <Input />
                  <FieldError />
                </TextField>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button type="submit" form="route-form" isPending={save.isPending}>保存</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
