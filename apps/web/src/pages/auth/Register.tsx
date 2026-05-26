import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Smile } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [passwordConfirm, setPasswordConfirm] = useState("");
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
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
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
    if (password !== passwordConfirm) {
      toast.error("两次密码不一致");
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
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const needEmailCode = Boolean(config?.is_email_verify);
  const inviteRequired = Boolean(config?.is_invite_force);

  return (
    <AuthCard
      footerLeft={
        <Link to="/login" className="hover:text-primary">
          返回登入
        </Link>
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
        {needEmailCode ? (
          <div className="flex gap-2">
            <Input
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              placeholder="邮箱验证码"
              className="h-10 bg-muted/50"
              required
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendEmailCode}
              disabled={sendingCode}
              className="h-10"
            >
              {sendingCode ? "发送中…" : "获取验证码"}
            </Button>
          </div>
        ) : null}
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          className="h-10 bg-muted/50"
          required
        />
        <Input
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="密码"
          className="h-10 bg-muted/50"
          required
        />
        <Input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder={inviteRequired ? "邀请码" : "邀请码(选填)"}
          className="h-10 bg-muted/50"
          required={inviteRequired}
        />
        <Button type="submit" disabled={submitting} className="mt-1 h-10 text-base font-medium">
          <Smile className="size-4" />
          {submitting ? "注册中…" : "注册"}
        </Button>
      </form>
    </AuthCard>
  );
}
