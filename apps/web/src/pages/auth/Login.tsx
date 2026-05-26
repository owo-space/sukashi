import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("请输入邮箱与密码");
      return;
    }
    setSubmitting(true);
    try {
      const r = await login(email.trim(), password);
      const target = redirect || (r.is_admin ? "/admin" : "/dashboard");
      navigate(target, { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "登录失败";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="登录">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting} className="mt-1">
          {submitting ? "登录中…" : "登录"}
        </Button>
        <div className="flex justify-between text-sm text-muted-foreground">
          <Link to="/register" className="hover:text-primary">
            注册账号
          </Link>
          <Link to="/forget" className="hover:text-primary">
            忘记密码？
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
