import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Two-field datetime picker:
 *   [ Calendar popover - shows YYYY-MM-DD ]  [ HH:MM 24-hour ]
 *
 * Value/onChange use the local-time string format `YYYY-MM-DDTHH:MM`
 * — same as <input type="datetime-local"> — so callers can swap this
 * in without changing their isoToUnix helpers.
 *
 * The legacy V2Board uses 24-hour everywhere; we force HH:MM step=60s
 * here regardless of the user's browser locale (the native
 * datetime-local in zh-CN otherwise renders 12-hour AM/PM).
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "选择日期与时间",
  className
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { dateStr, timeStr } = useMemo(() => {
    if (!value) return { dateStr: "", timeStr: "" };
    const [d, t] = value.split("T");
    return { dateStr: d ?? "", timeStr: (t ?? "").slice(0, 5) };
  }, [value]);

  const date = useMemo(() => {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  }, [dateStr]);

  function emit(nextDate: string, nextTime: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(`${nextDate}T${nextTime || "00:00"}`);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 flex-1 justify-start gap-2 font-normal",
              !dateStr && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4 opacity-70" />
            {dateStr || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (!d) return;
              const pad = (n: number) => String(n).padStart(2, "0");
              const next = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              emit(next, timeStr);
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        step={60}
        value={timeStr}
        onChange={(e) => emit(dateStr, e.target.value)}
        className="h-10 w-28 font-mono"
        // some browsers honor lang/style hints for 24h
        lang="en-GB"
      />
    </div>
  );
}
