import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "发送失败";
      toast.error(msg);
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
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "重置失败";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="忘记密码">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emailCode">邮箱验证码</Label>
          <div className="flex gap-2">
            <Input
              id="emailCode"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              required
            />
            <Button type="button" variant="outline" onClick={sendEmailCode} disabled={sendingCode}>
              {sendingCode ? "发送中…" : "获取验证码"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">新密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting} className="mt-1">
          {submitting ? "提交中…" : "重置密码"}
        </Button>
        <div className="text-sm text-muted-foreground text-center">
          <Link to="/login" className="hover:text-primary">
            返回登录
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
