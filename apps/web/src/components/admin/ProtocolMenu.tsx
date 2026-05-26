import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PROTOCOLS, PROTOCOL_ORDER, type Protocol } from "./protocols";
import { cn } from "@/lib/utils";

/**
 * The "+" button on /admin/server that, when clicked, drops a tight vertical
 * list of small colored protocol pills. Compact and rounded — matches the
 * legacy panel's protocol picker.
 */
export function ProtocolMenu({
  onPick
}: {
  onPick: (protocol: Protocol) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="size-9 rounded-md"
          aria-label="添加节点"
        >
          <Plus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-36 p-3">
        <div className="flex flex-col items-start gap-2.5">
          {PROTOCOL_ORDER.map((p) => {
            const spec = PROTOCOLS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPick(p)}
                className={cn(
                  "inline-flex items-center justify-start rounded-md px-3 py-1 text-xs font-medium text-white shadow-sm transition-transform hover:scale-[1.03]",
                  spec.bg
                )}
              >
                {spec.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
