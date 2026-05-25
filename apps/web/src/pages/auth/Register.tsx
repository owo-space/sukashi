import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Alert, Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import type { GuestConfig } from "@/lib/types";
import { AuthShell } from "./Login";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
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

  async function sendEmailCode(email: string) {
    if (!email) return;
    setSendingCode(true);
    try {
      await apiPost("/passport/comm/sendEmailVerify", { email });
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      await register({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        invite_code: String(data.get("invite_code") ?? "") || undefined,
        email_code: String(data.get("email_code") ?? "") || undefined
      });
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
    <AuthShell title="注册">
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {error ? (
          <Alert variant="danger" title="注册失败">
            {error}
          </Alert>
        ) : null}
        <TextField isRequired name="email" type="email">
          <Label>邮箱</Label>
          <Input id="reg-email" autoComplete="email" placeholder="you@example.com" />
          <FieldError />
        </TextField>
        {needEmailVerify ? (
          <div className="flex items-end gap-2">
            <TextField isRequired name="email_code" className="flex-1">
              <Label>邮箱验证码</Label>
              <Input placeholder="6 位数字" />
              <FieldError />
            </TextField>
            <Button
              variant="secondary"
              isPending={sendingCode}
              onPress={() => {
                const el = document.getElementById("reg-email") as HTMLInputElement | null;
                void sendEmailCode(el?.value ?? "");
              }}
            >
              发送验证码
            </Button>
          </div>
        ) : null}
        <TextField isRequired name="password" type="password">
          <Label>密码</Label>
          <Input autoComplete="new-password" placeholder="至少 8 位" />
          <FieldError />
        </TextField>
        <TextField
          name="invite_code"
          isRequired={inviteForced}
          defaultValue={inviteFromUrl}
        >
          <Label>{inviteForced ? "邀请码（必填）" : "邀请码（可选）"}</Label>
          <Input placeholder="如有邀请码请填写" />
          <FieldError />
        </TextField>
        <Button type="submit" isPending={loading} className="w-full">
          注册
        </Button>
        <div className="text-sm">
          已有账号？
          <Link className="ml-1 text-primary hover:underline" to="/login">
            返回登录
          </Link>
        </div>
      </Form>
    </AuthShell>
  );
}
