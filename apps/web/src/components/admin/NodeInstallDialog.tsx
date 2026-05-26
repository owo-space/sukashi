import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Shown after a node is successfully created — gives the operator the
 * one-line install command they need to run on the node host. Also
 * accessible from each row's 操作 menu for existing nodes.
 */
export function NodeInstallDialog({
  open,
  onOpenChange,
  command,
  nodeName,
  nodeId,
  highlight
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command: string;
  nodeName?: string;
  nodeId?: number;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("已复制安装命令");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {highlight ? <CheckCircle2 className="size-5 text-emerald-500" /> : null}
            节点{nodeName ? ` "${nodeName}"` : ""} 安装命令
            {nodeId ? <span className="text-sm text-muted-foreground">#{nodeId}</span> : null}
          </DialogTitle>
          <DialogDescription>
            {highlight
              ? "节点已创建。在节点服务器以 root 用户执行下面的脚本即可完成 Sukad 安装与连接。"
              : "在节点服务器以 root 用户执行下面的脚本即可。"}
          </DialogDescription>
        </DialogHeader>
        <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap break-all">
          {command || "(暂无可用的安装命令)"}
        </pre>
        <div className="flex justify-end">
          <Button onClick={copy} disabled={!command}>
            <Copy className="size-4" />
            {copied ? "已复制" : "复制命令"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
