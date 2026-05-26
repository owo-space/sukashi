import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface SidebarSection {
  label?: string;
  items: SidebarItem[];
}

export function Sidebar({
  title,
  version,
  sections
}: {
  title: string;
  version?: string;
  sections: SidebarSection[];
}) {
  return (
    <aside
      className={cn(
        "hidden md:flex md:w-[208px] md:flex-col md:border-r",
        "bg-white border-slate-200",
        // dark sidebar uses a darker shade of the brand color (set by ThemeProvider)
        "[html[data-sidebar=dark]_&]:border-transparent",
        "[html[data-sidebar=dark]_&]:[background:var(--brand-darker-bg)]"
      )}
    >
      <div className="flex h-14 items-center justify-center bg-primary text-primary-foreground text-xl font-medium tracking-wider">
        {title}
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section, sectionIdx) => (
          <div key={`${section.label ?? "default"}-${sectionIdx}`} className="mb-2">
            {section.label ? (
              <div className="px-4 pt-3 pb-1.5 text-xs text-slate-400 [html[data-sidebar=dark]_&]:text-white/45">
                {section.label}
              </div>
            ) : null}
            <ul>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-4 py-2 text-[13px] transition-colors",
                          "text-slate-700 hover:bg-slate-100",
                          "[html[data-sidebar=dark]_&]:text-white/75 [html[data-sidebar=dark]_&]:hover:bg-white/10",
                          isActive && [
                            "bg-blue-50 text-primary",
                            "[html[data-sidebar=dark]_&]:bg-white/15 [html[data-sidebar=dark]_&]:text-white"
                          ]
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {version ? (
        <div className="px-4 py-2 text-xs text-slate-400 [html[data-sidebar=dark]_&]:text-white/45">
          {version}
        </div>
      ) : null}
    </aside>
  );
}
