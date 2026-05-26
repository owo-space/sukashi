import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import { useAuth } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { AuthShell } from "./Login";

export function ForgetPage() {
  const { forget } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<{ email: string; password: string; email_code: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendCode() {
    const email = form.getFieldValue("email") as string | undefined;
    if (!email) return;
    setSending(true);
    try {
      await apiPost("/passport/comm/sendEmailVerify", { email });
    } finally {
      setSending(false);
    }
  }

  async function onFinish(values: { email: string; password: string; email_code: string }) {
    setError(null);
    setLoading(true);
    try {
      await forget(values);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "重置失败"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="重置密码" subtitle="自由への道">
      {error ? (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      ) : null}
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="email"
          rules={[{ required: true, type: "email", message: "请输入正确的邮箱" }]}
        >
          <Input placeholder="邮箱" size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="email_code"
          rules={[{ required: true, message: "请输入邮箱验证码" }]}
        >
          <Input.Search
            placeholder="邮箱验证码"
            size="large"
            enterButton={<span>{sending ? "发送中" : "发送验证码"}</span>}
            onSearch={() => void sendCode()}
            loading={sending}
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 8, message: "密码至少 8 位" }
          ]}
        >
          <Input.Password placeholder="新密码" size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 12 }}>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            重置密码
          </Button>
        </Form.Item>
      </Form>
      <div className="sukashi-auth-footer">
        <span>
          <Link to="/login">返回登入</Link>
        </span>
      </div>
    </AuthShell>
  );
}
