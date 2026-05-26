import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { ApiError, apiGet, apiPost } from "@/lib/api";

interface GuestConfig {
  is_email_verify?: boolean | number;
  is_invite_force?: boolean | number;
  is_recaptcha?: boolean | number;
  email_whitelist_suffix?: string[];
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteFromUrl = params.get("code") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [emailCode, setEmailCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<GuestConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<GuestConfig>("/guest/comm/config")
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        if (!cancelled) setConfig({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendEmailCode() {
    if (!email) {
      toast.error("请先填邮箱");
      return;
    }
    setSendingCode(true);
    try {
      await apiPost("/passport/comm/sendEmailVerify", { email: email.trim() });
      toast.success("验证码已发送");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "发送失败";
      toast.error(msg);
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("请填邮箱和密码");
      return;
    }
    setSubmitting(true);
    try {
      const r = await register({
        email: email.trim(),
        password,
        invite_code: inviteCode || undefined,
        email_code: emailCode || undefined
      });
      navigate(r.is_admin ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "注册失败";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const needEmailCode = Boolean(config?.is_email_verify);
  const inviteRequired = Boolean(config?.is_invite_force);

  return (
    <AuthCard title="注册">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {needEmailCode ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emailCode">邮箱验证码</Label>
            <div className="flex gap-2">
              <Input
                id="emailCode"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendEmailCode}
                disabled={sendingCode}
              >
                {sendingCode ? "发送中…" : "获取验证码"}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite">
            邀请码{inviteRequired ? "" : "（可选）"}
          </Label>
          <Input
            id="invite"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required={inviteRequired}
          />
        </div>
        <Button type="submit" disabled={submitting} className="mt-1">
          {submitting ? "注册中…" : "注册"}
        </Button>
        <div className="text-sm text-muted-foreground text-center">
          已有账号？
          <Link to="/login" className="ml-1 hover:text-primary">
            去登录
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
