import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export function UserTicketNewPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("1");
  const [message, setMessage] = useState("");

  const save = useMutation({
    mutationFn: () =>
      apiPost<number>("/user/ticket/save", {
        subject,
        level: Number(level),
        message
      }),
    onSuccess: () => {
      toast.success("工单已创建");
      navigate("/ticket");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">新建工单</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subject">主题</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>级别</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">低</SelectItem>
              <SelectItem value="1">中</SelectItem>
              <SelectItem value="2">高</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message">内容</Label>
          <Textarea
            id="message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div>
          <Button
            onClick={() => save.mutate()}
            disabled={!subject || !message || save.isPending}
          >
            提交
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
