import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ApiError, apiPost } from "@/lib/api";

export function ForgetPage() {
  const { forget } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [password, setPassword] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    if (!email || !password || !emailCode) {
      toast.error("请填齐所有字段");
      return;
    }
    setSubmitting(true);
    try {
      await forget({ email: email.trim(), password, email_code: emailCode });
      toast.success("密码已重置");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="h-10 bg-muted/50"
          required
        />
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
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="新密码"
          className="h-10 bg-muted/50"
          required
        />
        <Button type="submit" disabled={submitting} className="mt-1 h-10 text-base font-medium">
          <KeyRound className="size-4" />
          {submitting ? "提交中…" : "重置密码"}
        </Button>
      </form>
    </AuthCard>
  );
}
