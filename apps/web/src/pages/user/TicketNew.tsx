import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Form, Input, Select } from "antd";
import { apiPost } from "@/lib/api";

export function TicketNewPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(v: { subject: string; level: number; message: string }) {
    setError(null);
    setLoading(true);
    try {
      await apiPost("/user/ticket/save", v);
      navigate("/ticket");
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "创建失败"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="新建工单" size="small">
      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ level: 1 }}
        style={{ maxWidth: 560 }}
      >
        <Form.Item name="subject" label="主题" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="level" label="级别" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 0, label: "低" },
              { value: 1, label: "中" },
              { value: 2, label: "高" }
            ]}
          />
        </Form.Item>
        <Form.Item name="message" label="内容" rules={[{ required: true }]}>
          <Input.TextArea rows={5} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          提交
        </Button>
      </Form>
    </Card>
  );
}
