import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "switch" | "select" | "password";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  span?: 1 | 2;
  hint?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel = "保存",
  size = "md",
  extra
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldDef[];
  values: Record<string, unknown>;
  onChange: (k: string, v: unknown) => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  size?: "md" | "lg";
  extra?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((f) => {
            const value = values[f.key];
            const wrap = f.span === 2 || f.type === "textarea" ? "md:col-span-2" : "";
            if (f.type === "switch") {
              return (
                <div key={f.key} className={`flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 ${wrap}`}>
                  <Label htmlFor={f.key} className="text-sm">
                    {f.label}
                  </Label>
                  <Switch
                    id={f.key}
                    checked={Boolean(value)}
                    onCheckedChange={(v) => onChange(f.key, v)}
                  />
                </div>
              );
            }
            if (f.type === "textarea") {
              return (
                <div key={f.key} className={`flex flex-col gap-1.5 ${wrap}`}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Textarea
                    id={f.key}
                    rows={4}
                    value={(value as string) ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                  {f.hint ? <span className="text-xs text-muted-foreground">{f.hint}</span> : null}
                </div>
              );
            }
            if (f.type === "select") {
              // Radix Select forbids SelectItem with value="". We use the
              // sentinel "__empty__" to render an "unselect" choice and
              // translate back to "" on change.
              const SENTINEL = "__empty__";
              const display =
                value == null || value === "" ? SENTINEL : String(value);
              return (
                <div key={f.key} className={`flex flex-col gap-1.5 ${wrap}`}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Select
                    value={display}
                    onValueChange={(v) => onChange(f.key, v === SENTINEL ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={f.placeholder ?? "请选择"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((opt) => (
                        <SelectItem
                          key={opt.value || SENTINEL}
                          value={opt.value === "" ? SENTINEL : opt.value}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            return (
              <div key={f.key} className={`flex flex-col gap-1.5 ${wrap}`}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
                  value={value == null ? "" : String(value)}
                  onChange={(e) =>
                    onChange(
                      f.key,
                      f.type === "number" && e.target.value !== ""
                        ? Number(e.target.value)
                        : e.target.value
                    )
                  }
                  placeholder={f.placeholder}
                  required={f.required}
                />
                {f.hint ? <span className="text-xs text-muted-foreground">{f.hint}</span> : null}
              </div>
            );
          })}
        </div>
        {extra}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "保存中…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
