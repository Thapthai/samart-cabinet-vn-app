"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MenuNavLink } from "@/components/MenuNavLink";
import { ASSETS } from "@/lib/assets";
import { adminMenuItems, type StaffMenuItem, type StaffMenuSubItem } from "@/app/admin/menus";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function isSectionActive(item: StaffMenuItem, pathname: string): boolean {
  return (item.submenu ?? []).some((s) => isPathActive(pathname, s.href));
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** เมนูย่อยตอน sidebar หุบ — ไอคอนซ้อนใต้หัวกลุ่ม (แบบ Staff) */
function AdminCollapsedSubIcons({
  items,
  pathname,
  onNavigate,
}: {
  items: StaffMenuSubItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-sky-200/50 py-1">
      {items.map((sub) => {
        const SubIcon = sub.icon;
        const subActive = sub.externalHref ? false : isPathActive(pathname, sub.href);
        return (
          <MenuNavLink
            key={sub.href}
            href={sub.href}
            externalHref={sub.externalHref}
            title={sub.name}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-center rounded-lg p-2 transition-colors",
              subActive ? "bg-sky-200/90 text-slate-900 ring-1 ring-sky-400/50" : "text-slate-600 hover:bg-sky-100/90",
            )}
          >
            {SubIcon ? (
              <SubIcon className="h-4 w-4 shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
            )}
          </MenuNavLink>
        );
      })}
    </div>
  );
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");
  /** หุบแคบเฉพาะ desktop — มือถือใช้เมนูเต็มเสมอ (ไม่ผูกกับ isCollapsed จากจอใหญ่) */
  const useCollapsedNarrow = isCollapsed && isLg;
  /** มือถือ: หัว + ฟุตเตอร์แบบขยายเสมอ */
  const showExpandedChrome = !isCollapsed || !isLg;

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-lg hover:bg-sky-50 border-sky-200 h-9 w-9"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[45]"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-[100dvh] max-h-[100dvh] bg-gradient-to-b from-sky-50 via-blue-50/80 to-indigo-50 text-slate-800 transition-[transform,width] duration-300 ease-in-out shadow-xl border-r border-sky-200/80",
          /* มือถือ: ความกว้างตู้เมนูเต็มเสมอ — ไม่ใช้ w-16 จากโหมดหุบบน desktop */
          "w-[min(20rem,calc(100vw-1rem))] max-w-[100vw]",
          isCollapsed ? "lg:w-16" : "lg:w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full min-h-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-sky-200/80 transition-[padding] duration-300 gap-2",
              showExpandedChrome ? "p-4" : "lg:px-2 lg:py-3 p-4",
            )}
          >
            {showExpandedChrome ? (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 flex-1 min-w-0 no-underline"
                onClick={() => setIsMobileOpen(false)}
              >
                <div className="w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md ring-1 ring-sky-200/60">
                  <img src={ASSETS.LOGO} alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold break-words leading-tight text-slate-800">Admin Portal</h2>
                  <p className="text-sm sm:text-base text-slate-500 break-words leading-tight">Smart Cabinet</p>
                </div>
              </Link>
            ) : (
              <Link
                href="/admin/dashboard"
                className="lg:mx-auto flex items-center justify-center w-11 h-11 rounded-xl bg-white/90 overflow-hidden shadow-md ring-1 ring-sky-200/60 flex-shrink-0"
                title="Admin Portal"
                onClick={() => setIsMobileOpen(false)}
              >
                <img src={ASSETS.LOGO} alt="Logo" className="w-7 h-7 object-contain" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-sky-100 flex-shrink-0 transition-colors duration-200"
              aria-label={isCollapsed ? "ขยายเมนู" : "หุบเมนู"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav
            className={cn(
              "flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-sidebar py-4 space-y-3",
              /* มือถือ: padding ซ้ายขวาให้พอดีจอ — desktop หุบยังแคบได้ */
              "px-3 sm:px-3",
              useCollapsedNarrow ? "lg:px-2 lg:pr-2" : "lg:pl-2 lg:pr-2",
            )}
          >
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              if (!item.submenu?.length) {
                if (!Icon) return null;
                const leafActive = isPathActive(pathname, item.href);
                if (useCollapsedNarrow) {
                  return (
                    <div
                      key={item.href}
                      className={cn(
                        "overflow-hidden rounded-xl",
                        leafActive &&
                          "bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30",
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "relative flex w-full items-center justify-center rounded-xl px-2 py-3 text-lg font-medium transition-colors",
                          leafActive ? "text-white" : "text-slate-700 hover:bg-sky-100/90",
                        )}
                        title={item.name}
                        aria-label={item.name}
                      >
                        {leafActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-400 rounded-r-full" />
                        )}
                        <Icon className={cn("h-5 w-5 shrink-0", leafActive ? "text-white" : "text-slate-600")} />
                      </Link>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-lg font-medium transition-colors",
                      leafActive
                        ? "bg-sky-100 text-slate-900 border border-sky-300/90 shadow-sm"
                        : "text-slate-700 hover:bg-sky-50/90",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-slate-600" />
                    <span className="break-words leading-tight">{item.name}</span>
                  </Link>
                );
              }

              const sectionActive = isSectionActive(item, pathname);
              if (!Icon) return null;

              if (useCollapsedNarrow) {
                return (
                  <div key={item.href} className="w-full overflow-hidden rounded-xl">
                    <div
                      className={cn(
                        "flex w-full items-center justify-center rounded-xl px-2 py-2.5",
                        sectionActive
                          ? "bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md"
                          : "text-slate-700",
                      )}
                      title={item.name}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", sectionActive ? "text-white" : "text-slate-600")} />
                    </div>
                    <AdminCollapsedSubIcons
                      items={item.submenu!}
                      pathname={pathname}
                      onNavigate={() => setIsMobileOpen(false)}
                    />
                  </div>
                );
              }

              return (
                <div key={item.href} className="space-y-1">
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-lg font-semibold select-none",
                      sectionActive
                        ? "bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md shadow-sky-300/25"
                        : "text-slate-800",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", sectionActive ? "text-white" : "text-slate-600")} />
                    <span className="break-words leading-tight">{item.name}</span>
                  </div>
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-sky-300/80 pl-3">
                    {item.submenu!.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = sub.externalHref ? false : isPathActive(pathname, sub.href);
                      return (
                        <MenuNavLink
                          key={sub.href}
                          href={sub.href}
                          externalHref={sub.externalHref}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base transition-colors",
                            subActive
                              ? "bg-sky-100/95 text-slate-900 border border-sky-300 font-medium shadow-sm"
                              : "text-slate-600 hover:bg-sky-50 hover:text-slate-800",
                          )}
                        >
                          {SubIcon ? (
                            <SubIcon className="h-4 w-4 shrink-0 text-slate-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          )}
                          <span className="break-words leading-snug">{sub.name}</span>
                        </MenuNavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div
            className={cn(
              "shrink-0 border-t border-sky-200/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
              !showExpandedChrome && "lg:px-2",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 text-slate-500 overflow-hidden text-xs sm:text-sm",
                !showExpandedChrome && "lg:justify-center",
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-sky-200/50">
                <img src={ASSETS.LOGO} alt="" width={18} height={18} className="object-contain opacity-90" />
              </div>
              <span
                className={cn(
                  "font-medium break-words leading-snug",
                  !showExpandedChrome && "lg:sr-only",
                )}
              >
                © 2026 POSE Intelligence
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
