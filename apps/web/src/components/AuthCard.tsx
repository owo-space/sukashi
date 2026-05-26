import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({
  children,
  footerLeft
}: {
  children: ReactNode;
  footerLeft?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8eaf0] px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden p-0 shadow-sm">
        <div className="px-8 pt-10 pb-2 text-center">
          <h1 className="text-4xl font-medium tracking-wide">透かし</h1>
          <p className="mt-1 text-sm text-muted-foreground">自由への道</p>
        </div>
        <div className="px-8 pb-6 pt-4">{children}</div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-8 py-3 text-sm text-muted-foreground">
          <div>{footerLeft}</div>
          <div className="flex items-center gap-1">
            <Globe className="size-4" />
            <span>简体中文</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
