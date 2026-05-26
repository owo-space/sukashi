import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Form, Input, Select, Skeleton } from "antd";
import { apiGet, apiPost } from "@/lib/api";

interface FrontendConfig {
  frontend_theme?: string;
  frontend_theme_sidebar?: string;
  frontend_theme_header?: string;
  frontend_background_url?: string;
  custom_html?: string;
  logo?: string;
  homepage?: string;
}

const COLORS = [
  { value: "default", label: "默认（蓝色）" },
  { value: "darkblue", label: "暗蓝色" },
  { value: "black", label: "黑色" },
  { value: "green", label: "奶绿色" }
];

const LIGHT_DARK = [
  { value: "light", label: "亮" },
  { value: "dark", label: "暗" }
];

export function AdminThemePage() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<FrontendConfig>();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "config", "fetch", "frontend"],
    queryFn: () => apiGet<FrontendConfig>("/admin/config/fetch?key=frontend")
  });

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data, form]);

  const save = useMutation({
    mutationFn: (v: FrontendConfig) => apiPost("/admin/config/save", v),
    onSuccess: () => {
      message.success("已保存，刷新即可生效");
      void qc.invalidateQueries({ queryKey: ["admin", "config"] });
    }
  });

  if (isLoading) return <Skeleton active />;

  return (
    <Card title="主题配置" size="small">
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => save.mutate(v)}
        style={{ maxWidth: 560 }}
      >
        <Form.Item name="frontend_theme" label="主题色">
          <Select options={COLORS} />
        </Form.Item>
        <Form.Item name="frontend_theme_sidebar" label="边栏风格">
          <Select options={LIGHT_DARK} />
        </Form.Item>
        <Form.Item name="frontend_theme_header" label="顶部风格">
          <Select options={LIGHT_DARK} />
        </Form.Item>
        <Form.Item name="frontend_background_url" label="背景图 URL">
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="logo" label="Logo URL">
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="homepage" label="首页跳转 URL">
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="custom_html" label="自定义页脚 HTML">
          <Input.TextArea rows={4} placeholder="可注入客服 JS 等" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={save.isPending}>
          保存
        </Button>
      </Form>
    </Card>
  );
}
