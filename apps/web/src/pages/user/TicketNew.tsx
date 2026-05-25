import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, FieldError, Form, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";
import { apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

export function TicketNewPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState("1");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/user/ticket/save", {
        subject: fd.get("subject"),
        message: fd.get("message"),
        level: Number(level)
      });
      navigate("/ticket");
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "创建失败"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="新建工单" />
      <Card>
        <Card.Content>
          <Form className="flex max-w-2xl flex-col gap-4" onSubmit={onSubmit}>
            {error ? <Alert variant="danger" title="提交失败">{error}</Alert> : null}
            <TextField isRequired name="subject">
              <Label>标题</Label>
              <Input placeholder="一句话概括你的问题" />
              <FieldError />
            </TextField>
            <Select selectedKey={level} onSelectionChange={(k) => setLevel(String(k))}>
              <Label>级别</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="0" textValue="低">低<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item id="1" textValue="中">中<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item id="2" textValue="高">高<ListBox.ItemIndicator /></ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            <div>
              <Label>详细描述</Label>
              <TextArea name="message" placeholder="请描述你遇到的问题…" rows={8} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" isPending={loading}>提交</Button>
              <Button variant="tertiary" onPress={() => navigate("/ticket")}>取消</Button>
            </div>
          </Form>
        </Card.Content>
      </Card>
    </>
  );
}
