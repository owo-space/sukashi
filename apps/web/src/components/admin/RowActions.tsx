import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

/**
 * The "操作 ▼" blue-text dropdown trigger the legacy panel uses on the
 * right edge of every admin table row. Wraps shadcn DropdownMenu so
 * each page just nests DropdownMenuItem children inside.
 */
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-sm text-primary hover:underline"
        >
          操作
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
