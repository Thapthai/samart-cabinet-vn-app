"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ASSETS } from "@/lib/assets";
import {
  LayoutDashboard,
  Package,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  ClipboardList,
  Users,
  RotateCcw,
  Network,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const mainMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    description: "ภาพรวมระบบ",
  },
  {
    name: "จัดการตู้ Cabinet - แผนก",
    href: "/admin/cabinet-departments",
    icon: Network,
    description: "จัดการตู้ Cabinet และเชื่อมโยงกับแผนก",
  },
  {
    name: "สต๊อกอุปกรณ์ในตู้",
    href: "/admin/items",
    icon: Package,
    description: "เมนูสต๊อกอุปกรณ์ที่มีในตู้ SmartCabinet",
  },
  {
    name: "เบิกอุปกรณ์จากตู้",
    href: "/admin/dispense-from-cabinet",
    icon: FileBarChart,
    description: "การเบิกอุปกรณ์จากตู้ SmartCabinet",
  },
  {
    name: "เติมอุปกรณ์เข้าตู้",
    href: "/admin/return-to-cabinet-report",
    icon: FileBarChart,
    description: "การเติมอุปกรณ์เข้าตู้ SmartCabinet",
  },
  {
    name: "เบิกอุปกรณ์กับคนไข้",
    href: "/admin/medical-supplies",
    icon: ClipboardList,
    description: "รายการเบิกอุปกรณ์กับคนไข้",
  },
  {
    name: "แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน",
    href: "/admin/return",
    icon: RotateCcw,
    description: "แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / ชำรุด",
  },
  {
    name: "เปรียบเทียบตามเวชภัณฑ์",
    href: "/admin/item-comparison",
    icon: FileBarChart,
    description: "เปรียบเทียบการเบิกกับการใช้งานตามเวชภัณฑ์",
  },
  {
    name: "จัดการตู้ Cabinet",
    href: "/admin/management/cabinets",
    icon: Package,
    description: "จัดการตู้ Cabinet",
  },
  {
    name: "Staff Users",
    href: "/admin/management/staff-users",
    icon: Users,
    description: "จัดการ Staff Users และ Client Credentials",
  },
  {
    name: "Staff Permission Role",
    href: "/admin/management/permission-role",
    icon: Users,
    description: "จัดการ Staff Permission Role",
  },
  {
    name: "ประวัติการใช้งาน",
    href: "/admin/logs-history",
    icon: ClipboardList,
    description: "ประวัติการใช้งานระบบ",
  },
];

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
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

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-lg hover:bg-sky-50 border border-sky-200 h-9 w-9 rounded-md flex items-center justify-center"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-gradient-to-b from-sky-50 via-blue-50/80 to-indigo-50 text-slate-800 shadow-xl overflow-x-hidden border-r border-sky-200/80",
          "w-72 max-w-[min(18rem,calc(100vw-2rem))] will-change-[width,transform]",
          "transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none",
          isCollapsed ? "lg:w-16 lg:max-w-none" : "lg:w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full min-h-0">
          <div
            className={cn(
              "flex shrink-0 border-b border-sky-200/80 transition-[padding] duration-300 ease-in-out",
              isCollapsed
                ? "lg:flex-col lg:items-stretch lg:gap-2 lg:px-2 lg:py-3"
                : "flex-row items-center justify-between gap-2 p-4"
            )}
          >
            <Link
              href="/admin/dashboard"
              className={cn(
                "flex items-center justify-center min-w-0 overflow-hidden rounded-lg outline-none ring-sky-400/0 focus-visible:ring-2",
                isCollapsed ? "lg:w-full" : "flex-1"
              )}
            >
              <img
                src={ASSETS.LOGO}
                alt="POSE Logo"
                className={cn(
                  "object-contain transition-[transform,width,height,max-width] duration-300 ease-in-out",
                  isCollapsed
                    ? "h-11 w-auto max-h-11 max-w-[2.75rem] lg:h-9 lg:max-h-9 lg:max-w-9"
                    : "h-12 max-h-14 w-auto max-w-[200px]"
                )}
              />
            </Link>
            <button
              type="button"
              onClick={() =>
                isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed)
              }
              className={cn(
                "hidden lg:inline-flex flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-sky-100/90 transition-colors duration-200",
                isCollapsed ? "h-9 w-full" : "h-9 w-9"
              )}
              aria-label={isCollapsed ? "ขยายเมนู" : "หุบเมนู"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="flex-1 pl-2 pr-2 py-6 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-sidebar">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isPathActive(pathname, item.href);
              const rowActiveClass = isActive
                ? "bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30"
                : "text-slate-700 hover:bg-sky-100/90 hover:text-slate-900";

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    title={isCollapsed && isLg ? item.name : undefined}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center w-full min-w-0 px-3 py-3 text-base font-medium rounded-xl",
                      rowActiveClass,
                      isCollapsed && "lg:justify-center lg:px-2",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0 transition-all duration-200",
                        isActive ? "text-white" : "text-slate-600",
                        isCollapsed ? "lg:mx-auto" : "mr-2",
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 min-w-0 text-left break-words leading-tight",
                        isCollapsed && "lg:sr-only",
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className={cn("p-4 border-t border-sky-200/80 transition-all duration-300", isCollapsed && "lg:px-2")}>
            <div className={cn("flex items-center gap-2 text-slate-500 overflow-hidden", isCollapsed && "lg:justify-center")}>
              <img src={ASSETS.LOGO} alt="POSE" width={20} height={20} className="object-contain flex-shrink-0 opacity-90" />
              <span className={cn("text-sm font-medium whitespace-nowrap", isCollapsed && "lg:sr-only")}>© 2026 POSE Intelligence</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
