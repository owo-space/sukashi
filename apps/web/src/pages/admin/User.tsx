import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, Input, Modal, Pagination, Skeleton, Table, TextField, Label, FieldError, Form } from "@heroui/react";
import { apiGetEnvelope, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatBytes, formatExpiry, formatUnix, bytesToGB } from "@/lib/format";
import type { UserInfo } from "@/lib/types";

interface FilterItem {
  key: string;
  condition: string;
  value: string;
}

export function AdminUserPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState("");
  const [editing, setEditing] = useState<UserInfo | null>(null);
  const [deleting, setDeleting] = useState<UserInfo | null>(null);

  const filters: FilterItem[] = emailFilter
    ? [{ key: "email", condition: "模糊", value: emailFilter }]
    : [];
  const filterParam = filters.length > 0 ? `&filter=${encodeURIComponent(JSON.stringify(filters))}` : "";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user", "fetch", page, emailFilter],
    queryFn: () =>
      apiGetEnvelope<UserInfo[]>(`/admin/user/fetch?current=${page}&pageSize=20${filterParam}`)
  });

  const del = useMutation({
    mutationFn: (id: number) => apiPost("/admin/user/delUser", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "user", "fetch"] });
      setDeleting(null);
    }
  });

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/user/update", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "user", "fetch"] });
      setEditing(null);
    }
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <PageHeader
        title="用户管理"
        description={`共 ${total} 名用户`}
        actions={
          <div className="flex items-center gap-2">
            <Input
              aria-label="搜索邮箱"
              value={emailFilter}
              onChange={(e) => {
                setEmailFilter(e.target.value);
                setPage(1);
              }}
              placeholder="按邮箱模糊搜索"
              className="w-56"
            />
          </div>
        }
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.data?.length ? (
            <EmptyState title="无匹配用户" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="用户列表" className="min-w-[900px]">
                  <Table.Header>
                    <Table.Column isRowHeader>ID</Table.Column>
                    <Table.Column>邮箱</Table.Column>
                    <Table.Column>套餐</Table.Column>
                    <Table.Column>已用/总流量</Table.Column>
                    <Table.Column>在线 IP</Table.Column>
                    <Table.Column>到期</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.data.map((u) => (
                      <Table.Row key={u.id}>
                        <Table.Cell>{u.id}</Table.Cell>
                        <Table.Cell>{u.email}</Table.Cell>
                        <Table.Cell>{u.plan_name ?? "-"}</Table.Cell>
                        <Table.Cell>
                          {formatBytes(Number(u.u) + Number(u.d))} /{" "}
                          {bytesToGB(u.transfer_enable).toFixed(0)} GB
                        </Table.Cell>
                        <Table.Cell>{u.alive_ip}</Table.Cell>
                        <Table.Cell>{formatExpiry(u.expired_at)}</Table.Cell>
                        <Table.Cell>
                          {u.banned ? (
                            <Chip variant="default" color="danger">已封禁</Chip>
                          ) : u.is_admin ? (
                            <Chip variant="default" color="success">管理员</Chip>
                          ) : (
                            <Chip variant="default">正常</Chip>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onPress={() => setEditing(u)}>
                              编辑
                            </Button>
                            <Button size="sm" variant="danger" onPress={() => setDeleting(u)}>
                              删除
                            </Button>
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
        {totalPages > 1 ? (
          <Card.Footer className="flex justify-center">
            <Pagination total={totalPages} page={page} onChange={setPage} />
          </Card.Footer>
        ) : null}
      </Card>

      {/* Edit modal */}
      <Modal.Backdrop isOpen={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>编辑用户 #{editing?.id}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {editing ? (
                <Form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    update.mutate({
                      id: editing.id,
                      email: fd.get("email"),
                      remarks: fd.get("remarks"),
                      banned: fd.get("banned") === "on" ? 1 : 0,
                      is_admin: fd.get("is_admin") === "on" ? 1 : 0,
                      is_staff: fd.get("is_staff") === "on" ? 1 : 0
                    });
                  }}
                >
                  <TextField name="email" defaultValue={editing.email}>
                    <Label>邮箱</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <TextField name="remarks" defaultValue={editing.remarks ?? ""}>
                    <Label>备注</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="banned" defaultChecked={Boolean(editing.banned)} />
                    封禁
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_admin" defaultChecked={Boolean(editing.is_admin)} />
                    管理员
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_staff" defaultChecked={Boolean(editing.is_staff)} />
                    员工
                  </label>
                  <Modal.Footer>
                    <Button slot="close" variant="tertiary">取消</Button>
                    <Button type="submit" isPending={update.isPending}>保存</Button>
                  </Modal.Footer>
                </Form>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete confirmation */}
      <Modal.Backdrop isOpen={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.Header>
              <Modal.Heading>删除用户</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              确定要删除 <strong>{deleting?.email}</strong> 吗？该操作不可恢复。
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button
                variant="danger"
                isPending={del.isPending}
                onPress={() => deleting && del.mutate(deleting.id)}
              >
                确认删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {data?.data?.[0] ? (
        <p className="mt-2 text-xs text-muted">
          最近注册：{formatUnix(data.data[0].created_at)}
        </p>
      ) : null}
    </>
  );
}
