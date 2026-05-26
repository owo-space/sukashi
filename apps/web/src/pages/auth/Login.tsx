import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <AuthCard
      footerLeft={
        <div className="flex items-center gap-2">
          <Link to="/register" className="hover:text-primary">
            注册
          </Link>
          <span className="text-muted-foreground/50">|</span>
          <Link to="/forget" className="hover:text-primary">
            忘记密码
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="h-10 bg-muted/50"
          required
        />
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          className="h-10 bg-muted/50"
          required
        />
        <Button type="submit" disabled={submitting} className="mt-1 h-10 text-base font-medium">
          <LogIn className="size-4" />
          {submitting ? "登录中…" : "登入"}
        </Button>
      </form>
    </AuthCard>
  );
}
