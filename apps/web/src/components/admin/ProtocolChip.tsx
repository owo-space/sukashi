import { PROTOCOLS, type Protocol } from "./protocols";
import { cn } from "@/lib/utils";

/**
 * Small rounded protocol-colored chip with the protocol label. Used in
 * the legacy panel as the "节点 ID" column visual and inside the `+`
 * protocol-picker menu.
 */
export function ProtocolChip({
  protocol,
  className,
  children
}: {
  protocol: Protocol | string;
  className?: string;
  children?: React.ReactNode;
}) {
  const spec = PROTOCOLS[protocol as Protocol];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium text-white",
        spec?.bg ?? "bg-slate-500",
        className
      )}
    >
      {children ?? spec?.label ?? protocol}
    </span>
  );
}
