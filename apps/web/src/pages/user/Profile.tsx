import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Descriptions, Form, Input, Skeleton, Space, Switch, message } from "antd";
import { apiGet, apiPost } from "@/lib/api";
import { Snippet } from "@/components/Snippet";
import type { UserInfo } from "@/lib/types";

export function ProfilePage() {
  const qc = useQueryClient();
  const [pwError, setPwError] = useState<string | null>(null);

  const { data: info, isLoading } = useQuery({
    queryKey: ["user", "info"],
    queryFn: () => apiGet<UserInfo>("/user/info")
  });

  const changePw = useMutation({
    mutationFn: (v: { old_password: string; new_password: string }) =>
      apiPost("/user/changePassword", v),
    onSuccess: () => {
      message.success("密码已更新");
      void qc.invalidateQueries({ queryKey: ["user", "info"] });
    },
    onError: (err: unknown) => {
      setPwError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "修改失败"
      );
    }
  });

  const toggleRenewal = useMutation({
    mutationFn: (enable: boolean) =>
      apiPost("/user/update", { auto_renewal: enable ? 1 : 0 }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["user", "info"] })
  });

  if (isLoading || !info) return <Skeleton active />;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card title="基础信息" size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="邮箱">{info.email}</Descriptions.Item>
          <Descriptions.Item label="UUID">
            <Snippet>{info.uuid}</Snippet>
          </Descriptions.Item>
          <Descriptions.Item label="自动续费">
            <Switch
              checked={info.auto_renewal === 1}
              loading={toggleRenewal.isPending}
              onChange={(v) => toggleRenewal.mutate(v)}
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="修改密码" size="small">
        {pwError ? <Alert type="error" message={pwError} showIcon style={{ marginBottom: 16 }} /> : null}
        <Form
          layout="vertical"
          onFinish={(v) => {
            setPwError(null);
            changePw.mutate(v);
          }}
        >
          <Form.Item name="old_password" label="原密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true },
              { min: 8, message: "密码至少 8 位" }
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={changePw.isPending}>
            保存
          </Button>
        </Form>
      </Card>
    </Space>
  );
}
