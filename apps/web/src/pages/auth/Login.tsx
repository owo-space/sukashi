import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Alert, Button, Card, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const result = await login(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? "")
      );
      const redirect = search.get("redirect") || (result.is_admin ? "/dashboard" : "/dashboard");
      navigate(redirect, { replace: true });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "登录失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="登录">
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {error ? (
          <Alert variant="danger" title="登录失败">
            {error}
          </Alert>
        ) : null}
        <TextField isRequired name="email" type="email">
          <Label>邮箱</Label>
          <Input autoComplete="email" placeholder="you@example.com" />
          <FieldError />
        </TextField>
        <TextField isRequired name="password" type="password">
          <Label>密码</Label>
          <Input autoComplete="current-password" placeholder="密码" />
          <FieldError />
        </TextField>
        <Button type="submit" isPending={loading} className="w-full">
          登录
        </Button>
        <div className="flex justify-between text-sm">
          <Link to="/register" className="text-primary hover:underline">
            注册账号
          </Link>
          <Link to="/forget" className="text-primary hover:underline">
            忘记密码
          </Link>
        </div>
      </Form>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-default-50 px-4">
      <Card className="w-full max-w-md p-2">
        <Card.Header>
          <div className="flex items-center gap-3">
            <img alt="logo" className="size-8" src="/favicon.svg" />
            <Card.Title>{title}</Card.Title>
          </div>
        </Card.Header>
        <Card.Content>{children}</Card.Content>
      </Card>
    </div>
  );
}
