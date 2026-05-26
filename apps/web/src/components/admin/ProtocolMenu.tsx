import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ProtocolChip } from "./ProtocolChip";
import { PROTOCOL_ORDER, type Protocol } from "./protocols";

/**
 * The "+" button on /admin/server that, when clicked, drops a vertical
 * list of colored protocol chips. Picking one triggers `onPick` so the
 * caller can open its add-Drawer pre-filled with that protocol.
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
      <PopoverContent align="start" className="w-44 p-2">
        <div className="flex flex-col gap-1.5">
          {PROTOCOL_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="flex"
            >
              <ProtocolChip protocol={p} className="w-full justify-start py-1.5 text-sm" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
