import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import { GlobalOutlined, LoginOutlined } from "@ant-design/icons";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { email: string; password: string }) {
    setError(null);
    setLoading(true);
    try {
      const result = await login(values.email, values.password);
      const redirect =
        search.get("redirect") || (result.is_admin ? "/dashboard" : "/dashboard");
      navigate(redirect, { replace: true });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "登入失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="透かし" subtitle="自由への道">
      {error ? (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      ) : null}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="email"
          rules={[{ required: true, type: "email", message: "请输入正确的邮箱" }]}
        >
          <Input placeholder="邮箱" size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
          <Input.Password placeholder="密码" size="large" autoComplete="current-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            icon={<LoginOutlined />}
          >
            登入
          </Button>
        </Form.Item>
      </Form>
      <div className="sukashi-auth-footer">
        <span>
          <Link to="/register">注册</Link>
          <span className="divider">|</span>
          <Link to="/forget">忘记密码</Link>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <GlobalOutlined />
          简体中文
        </span>
      </div>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sukashi-auth-shell">
      <div className="sukashi-auth-card">
        <div className="sukashi-auth-title">{title}</div>
        {subtitle ? <div className="sukashi-auth-subtitle">{subtitle}</div> : null}
        {children}
      </div>
    </div>
  );
}
