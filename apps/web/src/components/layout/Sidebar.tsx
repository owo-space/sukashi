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
    <aside className="hidden md:flex md:w-[208px] md:flex-col md:bg-sidebar md:text-sidebar-foreground md:border-r md:border-sidebar-border">
      <div className="flex h-14 items-center justify-center border-b border-sidebar-border bg-primary text-primary-foreground text-lg font-medium">
        {title}
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section, sectionIdx) => (
          <div key={`${section.label ?? "default"}-${sectionIdx}`} className="mb-2">
            {section.label ? (
              <div className="px-4 pt-3 pb-1.5 text-xs text-sidebar-foreground/55">
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
                          "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        )
                      }
                    >
                      <Icon className="size-4" />
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
        <div className="px-4 py-2 text-xs text-sidebar-foreground/45">{version}</div>
      ) : null}
    </aside>
  );
}
