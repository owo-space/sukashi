import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useApplyTheme, useTheme } from "@/lib/theme";

export function AuthCard({
  children,
  footerLeft
}: {
  children: ReactNode;
  footerLeft?: ReactNode;
}) {
  const theme = useTheme();
  useApplyTheme("frontend");
  const hasBg = Boolean(theme.frontend_background_url);
  return (
    <div
      className={`relative flex min-h-screen items-center justify-center px-4 py-10 ${hasBg ? "" : "bg-[#e8eaf0]"}`}
      style={
        hasBg
          ? {
              backgroundImage: `url(${JSON.stringify(theme.frontend_background_url)})`,
              backgroundSize: "cover",
              backgroundAttachment: "fixed",
              backgroundPosition: "center"
            }
          : undefined
      }
    >
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card
        className={`w-full max-w-md overflow-hidden p-0 shadow-lg backdrop-blur ${
          hasBg ? "bg-white/70 ring-white/40" : "bg-white"
        }`}
      >
        <div className="px-8 pt-10 pb-2 text-center">
          <h1 className="text-4xl font-medium tracking-wide">{theme.app_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{theme.app_description}</p>
        </div>
        <div className="px-8 pb-6 pt-4">{children}</div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-8 py-3 text-sm text-muted-foreground">
          <div>{footerLeft}</div>
          <div />
        </div>
      </Card>
    </div>
  );
}
