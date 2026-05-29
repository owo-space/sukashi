import { Check, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LOCALES, useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0]!;

  return (
    <div data-i18n-skip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2"
            aria-label={t("语言")}
          >
            <Globe2 data-icon="inline-start" />
            <span className={compact ? "sr-only" : "hidden sm:inline"}>
              {current.label}
            </span>
            <span className={compact ? "text-xs" : "sm:hidden"}>{current.shortLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40" data-i18n-skip>
          {LOCALES.map((item) => (
            <DropdownMenuItem
              key={item.code}
              onClick={() => setLocale(item.code)}
              className="justify-between"
            >
              <span>{item.label}</span>
              {item.code === locale ? <Check data-icon="inline-end" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
