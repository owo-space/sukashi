import { useState } from "react";
import { Button } from "@heroui/react";
import { Check, Copy } from "lucide-react";

export function Snippet({
  value,
  children,
  className = ""
}: {
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = value ?? (typeof children === "string" ? children : "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* no-op */
    }
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-default-200 bg-default-50 px-3 py-1.5 font-mono text-sm ${className}`}
    >
      <span className="flex-1 truncate">{children ?? value}</span>
      <Button
        size="sm"
        variant="ghost"
        onPress={() => void copy()}
        aria-label="复制"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
