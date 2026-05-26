import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { apiGet, apiPost } from "@/lib/api";
import type { ServerRoute } from "@/lib/types";

const ACTIONS = [
  { value: "block", label: "封锁" },
  { value: "dns", label: "DNS 重定向" },
  { value: "route", label: "节点中转" }
];

export function AdminServerRoutePage() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<ServerRoute | null>(null);
  const [form] = Form.useForm<{
    remarks: string;
    match: string;
    action: string;
    action_value: string;
  }>();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "server", "route", "fetch"],
    queryFn: () => apiGet<ServerRoute[]>("/admin/server/route/fetch")
  });

  const save = useMutation({
    mutationFn: (v: {
      id?: number;
      remarks: string;
      match: string;
      action: string;
      action_value?: string;
    }) =>
      apiPost("/admin/server/route/save", {
        ...v,
        match: v.match.split("\n").map((s) => s.trim()).filter(Boolean)
      }),
    onSuccess: () => {
      message.success(editing ? "已更新" : "已添加");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ["admin", "server", "route"] });
    }
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/route/drop", { id }),
    onSuccess: () => {
      message.success("已删除");
      void qc.invalidateQueries({ queryKey: ["admin", "server", "route"] });
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
          添加路由
        </Button>
      }
    >
      <Table<ServerRoute>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={false}
        columns={[
          { title: "ID", dataIndex: "id", width: 100 },
          { title: "备注", dataIndex: "remarks" },
          {
            title: "匹配数量",
            dataIndex: "match",
            width: 140,
            render: (m) => (Array.isArray(m) ? m.length : 0)
          },
          { title: "动作", dataIndex: "action", width: 160 },
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
                    form.setFieldsValue({
                      remarks: row.remarks,
                      match: Array.isArray(row.match) ? row.match.join("\n") : "",
                      action: row.action,
                      action_value: row.action_value ? String(row.action_value) : ""
                    });
                    setOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该路由？"
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
        title={editing ? "编辑路由" : "添加路由"}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save.mutate(editing ? { id: editing.id, ...v } : v)}
        >
          <Form.Item name="remarks" label="备注" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="match"
            label="匹配规则（每行一条）"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={5} placeholder="例：geosite:google" />
          </Form.Item>
          <Form.Item name="action" label="动作" rules={[{ required: true }]}>
            <Select options={ACTIONS} />
          </Form.Item>
          <Form.Item name="action_value" label="动作参数（如 DNS 服务器或节点 ID）">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
