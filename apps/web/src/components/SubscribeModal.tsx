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
import { useTheme } from "@/lib/theme";

/**
 * URL-safe base64 (Shadowrocket expects `sub://` to be decodable by
 * its own base64-url variant — same trim as legacy V2Board).
 */
function base64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Each client deep-link follows the V2Board legacy template so the
 * imported subscription is tagged with the panel name (Shadowrocket
 * shows it as the subscription name, Clash shows it as the profile
 * name, sing-box uses it as the profile title, etc.).
 */
function buildClients(subscribe: string, panelName: string) {
  const enc = encodeURIComponent;
  const name = enc(panelName);
  return [
    {
      name: "Clash / Clash Verge",
      url: `clash://install-config?url=${enc(subscribe)}&name=${name}`
    },
    {
      name: "Mihomo (Clash Meta)",
      url: `clash://install-config?url=${enc(subscribe + "&flag=meta")}&name=${name}`
    },
    {
      name: "Shadowrocket",
      url:
        `shadowrocket://add/sub://${base64Url(subscribe + "&flag=shadowrocket")}` +
        `?remark=${name}`
    },
    {
      name: "Surge",
      url: `surge:///install-config?url=${enc(subscribe)}&name=${name}`
    },
    {
      name: "Stash",
      url: `stash://install-config?url=${enc(subscribe)}&name=${name}`
    },
    {
      name: "Sing-box",
      url: `sing-box://import-remote-profile?url=${enc(subscribe)}#${name}`
    },
    {
      name: "V2Box (iOS)",
      url: `v2box://install-sub?url=${enc(subscribe)}&name=${name}`
    }
  ];
}

export function SubscribeModal({
  open,
  onOpenChange,
  subscribeUrl
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribeUrl: string;
}) {
  const theme = useTheme();
  const panelName = theme.app_name || "Sukashi";
  const clients = subscribeUrl ? buildClients(subscribeUrl, panelName) : [];

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
            {clients.map((c) => (
              <Button
                key={c.name}
                variant="outline"
                size="sm"
                asChild
                className="justify-start"
              >
                <a href={c.url}>
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
