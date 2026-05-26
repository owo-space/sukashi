import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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

function SidebarBody({
  title,
  version,
  sections,
  onItemClick
}: {
  title: string;
  version?: string;
  sections: SidebarSection[];
  onItemClick?: () => void;
}) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-center bg-primary text-primary-foreground text-xl font-medium tracking-wider">
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
                      onClick={onItemClick}
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
    </>
  );
}

/**
 * Permanent sidebar on >= md, drawer-driven on < md. When the route
 * changes the drawer auto-closes so the user lands on the new page.
 */
export function Sidebar({
  title,
  version,
  sections,
  mobileOpen,
  onMobileClose
}: {
  title: string;
  version?: string;
  sections: SidebarSection[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* desktop */}
      <aside
        className={cn(
          "hidden md:flex md:w-[208px] md:flex-col md:border-r",
          "bg-white border-slate-200",
          "[html[data-sidebar=dark]_&]:border-transparent",
          "[html[data-sidebar=dark]_&]:[background:var(--brand-darker-bg)]"
        )}
      >
        <SidebarBody title={title} version={version} sections={sections} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          />
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r md:hidden",
              "bg-white border-slate-200",
              "[html[data-sidebar=dark]_&]:border-transparent",
              "[html[data-sidebar=dark]_&]:[background:var(--brand-darker-bg)]"
            )}
          >
            <SidebarBody
              title={title}
              version={version}
              sections={sections}
              onItemClick={onMobileClose}
            />
          </aside>
        </>
      ) : null}
    </>
  );
}
