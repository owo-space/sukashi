import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The 480px right-sliding panel the legacy admin uses for every add/edit
 * affordance. Body scrolls, footer is sticky.
 */
export function DataDrawer({
  open,
  onOpenChange,
  title,
  children,
  footer,
  submitting,
  onSubmit,
  submitLabel = "提 交",
  cancelLabel = "取 消",
  extraLeft,
  width = 480
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  submitting?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  extraLeft?: ReactNode;
  width?: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("flex flex-col gap-0 p-0 sm:max-w-none")}
        style={{ width }}
      >
        <header className="flex items-center justify-between border-b px-6 py-4">
          <SheetTitle className="text-base font-medium">{title}</SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ?? (
          <footer className="flex items-center justify-between border-t px-6 py-3">
            <div>{extraLeft}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              {onSubmit ? (
                <Button onClick={onSubmit} disabled={submitting}>
                  {submitting ? "保存中…" : submitLabel}
                </Button>
              ) : null}
            </div>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
