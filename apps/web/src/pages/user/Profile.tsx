import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, FieldError, Form, Input, Label, Skeleton, Switch, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Snippet } from "@/components/Snippet";
import { formatUnix } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { UserInfo } from "@/lib/types";

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: info, isLoading } = useQuery({
    queryKey: ["user", "info"],
    queryFn: () => apiGet<UserInfo>("/user/info")
  });
  const { data: sessions } = useQuery({
    queryKey: ["user", "getActiveSession"],
    queryFn: () => apiGet<Record<string, { ip?: string; loginAt: number; userAgent?: string }>>("/user/getActiveSession")
  });

  const updatePrefs = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost("/user/update", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
    }
  });

  const resetSecret = useMutation({
    mutationFn: () => apiPost("/user/resetSecurity"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "info"] });
      void queryClient.invalidateQueries({ queryKey: ["user", "getSubscribe"] });
      setSuccess("订阅 token 已重置，旧链接已失效。");
    }
  });

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    try {
      const ok = await apiPost<boolean>("/user/changePassword", {
        old_password: String(fd.get("old_password") ?? ""),
        new_password: String(fd.get("new_password") ?? "")
      });
      if (ok) {
        setSuccess("密码已更新，请重新登录");
        setTimeout(() => {
          logout();
          navigate("/login", { replace: true });
        }, 1200);
      } else {
        setError("旧密码错误或新密码不合法");
      }
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "失败"
      );
    }
  }

  const removeSession = useMutation({
    mutationFn: (sid: string) => apiPost("/user/removeActiveSession", { session_id: sid }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "getActiveSession"] });
    }
  });

  if (isLoading || !info) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  return (
    <>
      <PageHeader title="个人中心" description="账户信息、订阅 token 与会话管理。" />

      {error ? <Alert variant="danger" title="操作失败" className="mb-4">{error}</Alert> : null}
      {success ? <Alert variant="success" className="mb-4">{success}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Title>账户信息</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
            <Row label="邮箱" value={info.email} />
            <Row label="UUID" value={<span className="font-mono text-xs">{info.uuid}</span>} />
            <Row label="注册时间" value={formatUnix(info.created_at)} />
            <Row label="上次登录" value={info.last_login_at ? formatUnix(info.last_login_at) : "-"} />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>偏好设置</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3">
            <SwitchRow
              label="自动续费"
              value={Boolean(info.auto_renewal)}
              onChange={(v) => updatePrefs.mutate({ auto_renewal: v })}
            />
            <SwitchRow
              label="到期提醒"
              value={Boolean(info.remind_expire)}
              onChange={(v) => updatePrefs.mutate({ remind_expire: v })}
            />
            <SwitchRow
              label="流量提醒"
              value={Boolean(info.remind_traffic)}
              onChange={(v) => updatePrefs.mutate({ remind_traffic: v })}
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>订阅 token</Card.Title>
            <Card.Description>重置后旧的订阅链接立即失效。</Card.Description>
          </Card.Header>
          <Card.Content>
            <Snippet className="w-full">{info.token}</Snippet>
            <Button
              variant="danger-soft"
              className="mt-3"
              onPress={() => resetSecret.mutate()}
              isPending={resetSecret.isPending}
            >
              重置订阅 token
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>修改密码</Card.Title>
          </Card.Header>
          <Card.Content>
            <Form onSubmit={changePassword} className="flex flex-col gap-3">
              <TextField isRequired name="old_password" type="password">
                <Label>当前密码</Label>
                <Input autoComplete="current-password" />
                <FieldError />
              </TextField>
              <TextField isRequired name="new_password" type="password">
                <Label>新密码</Label>
                <Input autoComplete="new-password" />
                <FieldError />
              </TextField>
              <Button type="submit">更新密码</Button>
            </Form>
          </Card.Content>
        </Card>
      </div>

      <Card className="mt-4">
        <Card.Header>
          <Card.Title>活跃会话</Card.Title>
          <Card.Description>已经登录到你账户的设备列表。</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-2">
          {sessions && Object.keys(sessions).length > 0 ? (
            Object.entries(sessions).map(([sid, s]) => (
              <div
                key={sid}
                className="flex items-center justify-between rounded-md bg-default-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{s.ip ?? "未知 IP"}</div>
                  <div className="truncate text-xs text-muted">{s.userAgent ?? ""}</div>
                  <div className="text-xs text-muted">{formatUnix(s.loginAt)}</div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onPress={() => removeSession.mutate(sid)}
                >
                  注销
                </Button>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted">无活跃会话</div>
          )}
        </Card.Content>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-default-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function SwitchRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-default-50 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch isSelected={value} onChange={onChange} />
    </div>
  );
}
