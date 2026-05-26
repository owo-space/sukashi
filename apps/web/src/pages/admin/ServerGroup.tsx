import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Table } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { apiGet, apiPost } from "@/lib/api";
import type { ServerGroup } from "@/lib/types";

export function AdminServerGroupPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<ServerGroup | null>(null);
  const [form] = Form.useForm<{ name: string }>();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "server", "group", "fetch"],
    queryFn: () => apiGet<ServerGroup[]>("/admin/server/group/fetch")
  });

  const save = useMutation({
    mutationFn: (v: { id?: number; name: string }) =>
      apiPost("/admin/server/group/save", v),
    onSuccess: () => {
      message.success(editing ? "已更新" : "已添加");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ["admin", "server", "group"] });
    }
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/group/drop", { id }),
    onSuccess: () => {
      message.success("已删除");
      void qc.invalidateQueries({ queryKey: ["admin", "server", "group"] });
    }
  });

  return (
    <Card
      size="small"
      extra={
        <Button
          type="default"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          添加权限组
        </Button>
      }
    >
      <Table<ServerGroup>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={false}
        columns={[
          { title: "组ID", dataIndex: "id", width: 100 },
          { title: "组名称", dataIndex: "name" },
          { title: "用户数量", dataIndex: "user_count", width: 140, render: (v) => v ?? 0 },
          { title: "节点数量", dataIndex: "server_count", width: 140, render: (v) => v ?? 0 },
          {
            title: "操作",
            width: 140,
            align: "right",
            render: (_, row) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setEditing(row);
                    form.setFieldsValue({ name: row.name });
                    setOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该权限组？"
                  onConfirm={() => drop.mutate(row.id)}
                >
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        open={open}
        title={editing ? "编辑权限组" : "添加权限组"}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            save.mutate(editing ? { id: editing.id, ...v } : v)
          }
        >
          <Form.Item name="name" label="组名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
