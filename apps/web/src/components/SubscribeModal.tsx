import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClientButton {
  name: string;
  url: (subscribe: string) => string;
}

const CLIENTS: ClientButton[] = [
  { name: "Clash / Clash Verge", url: (s) => `clash://install-config?url=${encodeURIComponent(s)}` },
  { name: "Shadowrocket", url: (s) => `shadowrocket://add/${encodeURIComponent(s)}` },
  { name: "V2Box (iOS)", url: (s) => `v2box://install-sub?url=${encodeURIComponent(s)}` },
  { name: "Stash", url: (s) => `stash://install-config?url=${encodeURIComponent(s)}` },
  { name: "Surge", url: (s) => `surge:///install-config?url=${encodeURIComponent(s)}` },
  { name: "Sing-box", url: (s) => `sing-box://import-remote-profile?url=${encodeURIComponent(s)}` }
];

export function SubscribeModal({
  open,
  onOpenChange,
  subscribeUrl
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribeUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(subscribeUrl);
    setCopied(true);
    toast.success("订阅地址已复制");
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>订阅地址</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            {subscribeUrl ? (
              <div className="rounded border border-slate-200 bg-white p-3">
                <QRCodeSVG
                  value={subscribeUrl}
                  size={196}
                  level="M"
                  includeMargin={false}
                />
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Input value={subscribeUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={copy}>
              <Copy className="size-4" />
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            一键导入到客户端 (会唤起对应 App,需先安装):
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {CLIENTS.map((c) => (
              <Button
                key={c.name}
                variant="outline"
                size="sm"
                asChild
                className="justify-start"
              >
                <a href={c.url(subscribeUrl)}>
                  <ExternalLink className="size-4" />
                  {c.name}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
