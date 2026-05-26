import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import type { GuestConfig } from "@/lib/types";
import { AuthShell } from "./Login";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [form] = Form.useForm<{
    email: string;
    password: string;
    invite_code?: string;
    email_code?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [config, setConfig] = useState<GuestConfig | null>(null);

  useEffect(() => {
    void apiGet<GuestConfig>("/guest/comm/config")
      .then(setConfig)
      .catch(() => {});
  }, []);

  const needEmailVerify = config?.is_email_verify === 1;
  const inviteForced = config?.is_invite_force === 1;
  const inviteFromUrl = search.get("code") || "";

  async function sendEmailCode() {
    const email = form.getFieldValue("email") as string | undefined;
    if (!email) return;
    setSendingCode(true);
    try {
      await apiPost("/passport/comm/sendEmailVerify", { email });
    } finally {
      setSendingCode(false);
    }
  }

  async function onFinish(values: {
    email: string;
    password: string;
    invite_code?: string;
    email_code?: string;
  }) {
    setError(null);
    setLoading(true);
    try {
      const payload: {
        email: string;
        password: string;
        invite_code?: string;
        email_code?: string;
      } = { email: values.email, password: values.password };
      if (values.invite_code) payload.invite_code = values.invite_code;
      if (values.email_code) payload.email_code = values.email_code;
      await register(payload);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "注册失败"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="注册" subtitle="自由への道">
      {error ? (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      ) : null}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        initialValues={{ invite_code: inviteFromUrl }}
      >
        <Form.Item
          name="email"
          rules={[{ required: true, type: "email", message: "请输入正确的邮箱" }]}
        >
          <Input placeholder="邮箱" size="large" autoComplete="email" />
        </Form.Item>
        {needEmailVerify ? (
          <Form.Item
            name="email_code"
            rules={[{ required: true, message: "请输入邮箱验证码" }]}
          >
            <Input.Search
              placeholder="邮箱验证码"
              size="large"
              enterButton={<span>{sendingCode ? "发送中" : "发送验证码"}</span>}
              onSearch={() => void sendEmailCode()}
              loading={sendingCode}
            />
          </Form.Item>
        ) : null}
        <Form.Item
          name="password"
          rules={[
            { required: true, message: "请输入密码" },
            { min: 8, message: "密码至少 8 位" }
          ]}
        >
          <Input.Password placeholder="密码" size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="invite_code"
          rules={inviteForced ? [{ required: true, message: "请输入邀请码" }] : []}
        >
          <Input
            placeholder={inviteForced ? "邀请码（必填）" : "邀请码（可选）"}
            size="large"
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 12 }}>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            注册
          </Button>
        </Form.Item>
      </Form>
      <div className="sukashi-auth-footer">
        <span>
          已有账号？<Link to="/login">返回登入</Link>
        </span>
      </div>
    </AuthShell>
  );
}
