import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Alert, Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { AuthShell } from "./Login";

export function ForgetPage() {
  const { forget } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendCode(email: string) {
    if (!email) return;
    setSending(true);
    try {
      await apiPost("/passport/comm/sendEmailVerify", { email });
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      await forget({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        email_code: String(data.get("email_code") ?? "")
      });
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
    <AuthShell title="重置密码">
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {error ? (
          <Alert variant="danger" title="重置失败">
            {error}
          </Alert>
        ) : null}
        <TextField isRequired name="email" type="email">
          <Label>邮箱</Label>
          <Input id="forget-email" autoComplete="email" placeholder="you@example.com" />
          <FieldError />
        </TextField>
        <div className="flex items-end gap-2">
          <TextField isRequired name="email_code" className="flex-1">
            <Label>邮箱验证码</Label>
            <Input placeholder="6 位数字" />
            <FieldError />
          </TextField>
          <Button
            variant="secondary"
            isPending={sending}
            onPress={() => {
              const el = document.getElementById("forget-email") as HTMLInputElement | null;
              void sendCode(el?.value ?? "");
            }}
          >
            发送验证码
          </Button>
        </div>
        <TextField isRequired name="password" type="password">
          <Label>新密码</Label>
          <Input autoComplete="new-password" placeholder="至少 8 位" />
          <FieldError />
        </TextField>
        <Button type="submit" isPending={loading} className="w-full">
          重置密码
        </Button>
        <div className="text-sm">
          <Link className="text-primary hover:underline" to="/login">
            返回登录
          </Link>
        </div>
      </Form>
    </AuthShell>
  );
}
