import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { UserInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatCny } from "@/lib/format";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded border-slate-200">
      <CardHeader className="border-b border-slate-100 py-3">
        <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="py-4">{children}</CardContent>
    </Card>
  );
}

export function UserProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["user.info"],
    queryFn: () => apiGet<UserInfo>("/user/info")
  });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [giftCode, setGiftCode] = useState("");

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== newPasswordConfirm) throw new Error("两次新密码不一致");
      return apiPost("/user/changePassword", {
        old_password: oldPassword,
        new_password: newPassword
      });
    },
    onSuccess: () => {
      toast.success("密码已更新");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });

  const redeemGiftCard = useMutation({
    mutationFn: () => apiPost<boolean>("/user/giftcard/redeem", { code: giftCode }),
    onSuccess: () => {
      toast.success("兑换成功");
      setGiftCode("");
      qc.invalidateQueries({ queryKey: ["user.info"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });

  const resetSecurity = useMutation({
    mutationFn: () => apiGet("/user/resetSecurity"),
    onSuccess: () => {
      toast.success("订阅信息已重置");
      qc.invalidateQueries({ queryKey: ["user.info"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });

  const updateRemind = useMutation({
    mutationFn: (kind: "remind_expire" | "remind_traffic") =>
      apiPost(`/user/update`, { [kind]: data?.[kind] ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user.info"] })
  });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="我的钱包(仅消费)">
        <div className="relative">
          <WalletIcon className="absolute right-0 top-0 size-8 text-slate-300" />
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium text-slate-800">{formatCny(data.balance)}</span>
            <span className="text-sm text-slate-400">CNY</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-600">自动续费</span>
            <Switch defaultChecked={false} disabled />
          </div>
          <Button className="mt-3" disabled>
            充 值
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="礼品卡">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="请输入礼品卡"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
          />
          <div>
            <Button
              onClick={() => redeemGiftCard.mutate()}
              disabled={!giftCode || redeemGiftCard.isPending}
            >
              兑 换
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="修改密码">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">旧密码</span>
            <Input
              type="password"
              placeholder="请输入旧密码"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">新密码</span>
            <Input
              type="password"
              placeholder="请输入新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">新密码</span>
            <Input
              type="password"
              placeholder="请输入新密码"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
            />
          </div>
          <div>
            <Button
              onClick={() => changePassword.mutate()}
              disabled={!oldPassword || !newPassword || changePassword.isPending}
            >
              保 存
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="通知">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">到期邮件提醒</span>
            <Switch
              checked={Boolean(data.remind_expire)}
              onCheckedChange={() => updateRemind.mutate("remind_expire")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">流量邮件提醒</span>
            <Switch
              checked={Boolean(data.remind_traffic)}
              onCheckedChange={() => updateRemind.mutate("remind_traffic")}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="重置订阅信息">
        <div className="flex flex-col gap-3">
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            当你的订阅地址或账户发生泄漏被他人滥用时，可以在此重置订阅信息。避免带来不必要的损失。
          </div>
          <div>
            <Button
              variant="destructive"
              onClick={() => resetSecurity.mutate()}
              disabled={resetSecurity.isPending}
            >
              重 置
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
