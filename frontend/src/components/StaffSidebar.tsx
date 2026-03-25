'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { staffRolePermissionApi } from '@/lib/api';
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react';
import {
  staffMenuItems,
  filterMenuByPermissions,
  type StaffMenuSubItem,
} from '@/app/staff/menus';
import { Button } from '@/components/ui/button';
import { ASSETS } from '@/lib/assets';
import { staffRoleDisplayLabel } from '@/lib/staffRolePolicy';

interface StaffSidebarProps {
  staffUser?: {
    fname?: string;
    lname?: string;
    name?: string;
    email: string;
    role?: string | { code?: string; name?: string };
  };
  onLogout?: () => void;
  isAdmin?: boolean;
}

const STAFF_SIDEBAR_COLLAPSED_KEY = 'staff-sidebar-collapsed';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** เมนูย่อยตอน sidebar หุบ — แสดงซ้อนลงใต้หัวข้อในแถบเดียวกัน */
function StaffCollapsedInlineSubItems({
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
        const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/');
        return (
          <Link
            key={sub.href}
            href={sub.href}
            title={sub.name}
            onClick={onNavigate}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 transition-colors',
              subActive ? 'bg-sky-200/90 text-slate-900' : 'text-slate-600 hover:bg-sky-100/90',
            )}
          >
            {SubIcon ? (
              <SubIcon className="h-4 w-4 shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function StaffSidebar({ staffUser, onLogout, isAdmin = false }: StaffSidebarProps) {
  const pathname = usePathname();
  const staffRoleCodeForMenu =
    typeof staffUser?.role === 'string'
      ? staffUser.role
      : (staffUser?.role && typeof staffUser.role === 'object' && staffUser.role.code
          ? staffUser.role.code
          : '') || '';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const skipInitialPersist = useRef(true);
  const isLg = useMediaQuery('(min-width: 1024px)');
  /** แถบแคบ (ไอคอนอย่างเดียว) — เมนูย่อยขยายลงด้านล่างในแถบเดียวกัน ไม่ใช้ dropdown */
  const useCollapsedNarrow = isCollapsed && isLg;

  // โหลดการหุบ/กางจากเครื่อง (หลัง mount)
  useEffect(() => {
    try {
      if (localStorage.getItem(STAFF_SIDEBAR_COLLAPSED_KEY) === '1') {
        setIsCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // จำค่าที่ผู้ใช้เลือก — รีเฟรชก็ยังหุบ/กางตามเดิม (คีย์แยกจาก admin-sidebar-collapsed)
  useEffect(() => {
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STAFF_SIDEBAR_COLLAPSED_KEY, isCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);

  // Next.js automatically strips basePath from pathname, so we can use it directly
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load permissions for current user's role
  useEffect(() => {
    if (isAdmin) {
      // Admin has access to all menus
      const allPermissions: Record<string, boolean> = {};
      staffMenuItems.forEach((item) => {
        allPermissions[item.href] = true;
        if (item.submenu) {
          item.submenu.forEach((subItem) => {
            allPermissions[subItem.href] = true;
          });
        }
      });
      setPermissions(allPermissions);
    } else if (staffUser?.role) {
      loadPermissions();
    }
  }, [staffUser?.role, isAdmin]);

  const loadPermissions = async () => {
    if (!staffUser?.role || isAdmin) return;

    try {
      const roleCode = typeof staffUser.role === 'string' ? staffUser.role : staffUser.role?.code;
      if (!roleCode) return;

      const response = await staffRolePermissionApi.getByRole(roleCode);
      if (response.success && response.data) {
        const permissionsMap: Record<string, boolean> = {};
        (response.data as Array<{ menu_href: string; can_access: boolean }>).forEach((perm) => {
          permissionsMap[perm.menu_href] = perm.can_access;
        });
        setPermissions(permissionsMap);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Fallback to default behavior if API fails
    }
  };

  const isPathActive = (path: string, href: string) =>
    path === href || path.startsWith(href + '/');

  const getRoleLabel = (role?: string | { code?: string; name?: string }) => {
    if (isAdmin) return 'Admin';

    const roleCode = typeof role === 'string' ? role : role?.code || '';
    const label = staffRoleDisplayLabel(roleCode);
    return label || roleCode || 'Staff';
  };

  return (
    <>
      {/* Mobile Menu Button */}
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

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen bg-gradient-to-b from-sky-50 via-blue-50/80 to-indigo-50 text-slate-800 transition-all duration-300 ease-in-out shadow-xl border-r border-sky-200/80',
          isCollapsed ? 'w-16 lg:w-16' : 'w-72 lg:w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with Logo */}
          <div
            className={cn(
              'flex items-center justify-between border-b border-sky-200/80 transition-[padding] duration-300',
              isCollapsed ? 'lg:px-2 lg:py-3 p-4' : 'p-4'
            )}
          >
            {!isCollapsed && (
              <Link
                href="/staff/dashboard"
                className="flex items-center gap-3 flex-1 min-w-0 no-underline"
              >
                <div className="w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md ring-1 ring-sky-200/60">
                  <img
                    src={ASSETS.LOGO}
                    alt="Logo"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold break-words leading-tight text-slate-800">Staff Portal</h2>
                  <p className="text-base text-slate-500 break-words leading-tight">Smart Cabinet</p>
                </div>
              </Link>
            )}
            {isCollapsed && (
              <Link
                href="/staff/dashboard"
                className="lg:mx-auto flex items-center justify-center w-11 h-11 rounded-xl bg-white/90 overflow-hidden shadow-md ring-1 ring-sky-200/60 flex-shrink-0"
                title="Staff Portal"
              >
                <img
                  src={ASSETS.LOGO}
                  alt="Logo"
                  className="w-7 h-7 object-contain"
                />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-sky-100 flex-shrink-0 transition-colors duration-200"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* User Avatar when collapsed */}
          {staffUser && isCollapsed && (
            <div className="px-2 py-4 border-b border-sky-200/80 flex justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-sky-300/50">
                {isAdmin
                  ? (staffUser.name?.charAt(0) || staffUser.email?.charAt(0) || 'A').toUpperCase()
                  : (staffUser.fname?.charAt(0) || 'S').toUpperCase()
                }
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 pl-2 pr-2 py-6 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-sidebar">
            {/* Admin - Back to Admin Panel Link */}
            {isAdmin &&
              (useCollapsedNarrow ? (
                <Link
                  href="/admin/items"
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'group relative mb-4 flex w-full items-center justify-center rounded-xl px-2 py-3 text-lg font-medium transition-all duration-200',
                    'bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30 hover:from-sky-500 hover:to-blue-500',
                  )}
                  title="กลับไปหน้า Admin"
                  aria-label="กลับไปหน้า Admin"
                >
                  <Shield className="h-5 w-5 flex-shrink-0 text-white" />
                </Link>
              ) : (
                <Link
                  href="/admin/items"
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'group relative flex items-center w-full pl-2 pr-2 py-3 text-lg font-medium rounded-xl transition-all duration-200 mb-4',
                    'bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30 hover:from-sky-500 hover:to-blue-500',
                    isCollapsed && 'lg:justify-center lg:px-2',
                  )}
                  title={isCollapsed ? 'กลับไปหน้า Admin' : undefined}
                >
                  <Shield className={cn('h-5 w-5 flex-shrink-0', isCollapsed ? 'lg:mx-auto' : 'mr-2')} />
                  {!isCollapsed && (
                    <span className="flex-1 font-semibold">กลับไปหน้า Admin</span>
                  )}
                </Link>
              ))}

            {filterMenuByPermissions(staffMenuItems, permissions, staffRoleCodeForMenu, {
                skipSubRoleGate: isAdmin,
              })
              .map((item) => {
                const Icon = item.icon;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isActive =
                  isPathActive(pathname, item.href) ||
                  (hasSubmenu && item.submenu!.some((s) => isPathActive(pathname, s.href)));
                const rowActiveClass = isActive
                  ? 'bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30'
                  : 'text-slate-700 hover:bg-sky-100/90 hover:text-slate-900';

                const groupOpen = openSubmenus[item.href] ?? isActive;

                return (
                  <div key={item.href}>
                    {useCollapsedNarrow ? (
                      <div className="w-full overflow-hidden rounded-xl">
                        <div className={cn('group relative w-full rounded-xl', rowActiveClass)}>
                          {hasSubmenu ? (
                            <button
                              type="button"
                              onClick={() =>
                                setOpenSubmenus((p) => {
                                  const cur = p[item.href] ?? isActive;
                                  return { ...p, [item.href]: !cur };
                                })
                              }
                              className={cn(
                                'relative flex w-full items-center justify-center rounded-xl px-2 py-3 text-lg font-medium outline-none transition-colors',
                                isActive ? 'text-white' : 'text-inherit',
                                'focus-visible:ring-2 focus-visible:ring-sky-400/50',
                              )}
                              aria-label={item.name}
                              aria-expanded={groupOpen}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-400 rounded-r-full" />
                              )}
                              <Icon
                                className={cn(
                                  'h-5 w-5 flex-shrink-0',
                                  isActive ? 'text-white' : 'text-slate-600',
                                )}
                              />
                            </button>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                'relative flex w-full items-center justify-center rounded-xl px-2 py-3 text-lg font-medium transition-colors',
                                isActive ? 'text-white' : 'text-inherit',
                              )}
                              title={item.name}
                              aria-label={item.name}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-400 rounded-r-full" />
                              )}
                              <Icon
                                className={cn(
                                  'h-5 w-5 flex-shrink-0',
                                  isActive ? 'text-white' : 'text-slate-600',
                                )}
                              />
                            </Link>
                          )}
                        </div>
                        {hasSubmenu && groupOpen && (
                          <StaffCollapsedInlineSubItems
                            items={item.submenu!}
                            pathname={pathname}
                            onNavigate={() => setIsMobileOpen(false)}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <div
                          className={cn(
                            'group relative flex items-center w-full rounded-xl transition-all duration-200',
                            rowActiveClass,
                            isCollapsed && 'lg:justify-center lg:px-2',
                          )}
                        >
                          {item.noHref && hasSubmenu ? (
                            <div
                              className={cn(
                                'relative flex flex-1 min-w-0 items-center pl-2 pr-2 py-3 text-lg font-medium rounded-xl text-inherit',
                                isActive && 'text-white',
                                isCollapsed && 'lg:justify-center lg:px-2',
                              )}
                            >
                              {isActive && !isCollapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-400 rounded-r-full" />
                              )}
                              <Icon className={cn('h-5 w-5 flex-shrink-0', isCollapsed ? 'lg:mx-auto' : 'mr-2')} />
                              {!isCollapsed && (
                                <span className="flex-1 min-w-0 break-words leading-tight text-left">{item.name}</span>
                              )}
                            </div>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                'flex flex-1 min-w-0 items-center pl-2 pr-2 py-3 text-lg font-medium rounded-xl text-inherit',
                                isActive && 'text-white',
                                isCollapsed && 'lg:justify-center lg:px-2',
                              )}
                              title={isCollapsed ? item.name : undefined}
                            >
                              {isActive && !isCollapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-400 rounded-r-full" />
                              )}
                              <Icon className={cn('h-5 w-5 flex-shrink-0', isCollapsed ? 'lg:mx-auto' : 'mr-2')} />
                              {!isCollapsed && (
                                <span className="flex-1 min-w-0 break-words leading-tight text-left">{item.name}</span>
                              )}
                            </Link>
                          )}
                        </div>

                        {hasSubmenu && (
                          <div className="ml-4 mt-2 space-y-1 border-l-2 border-sky-300/70 pl-4">
                            {item.submenu!.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = isPathActive(pathname, subItem.href);
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  onClick={() => setIsMobileOpen(false)}
                                  className={cn(
                                    'flex items-center pl-2 pr-2 py-2 text-lg rounded-lg transition-all duration-200',
                                    isSubActive
                                      ? 'bg-sky-100 text-slate-800 border-l-2 border-sky-400 font-medium'
                                      : 'text-slate-600 hover:bg-sky-50 hover:text-slate-800',
                                  )}
                                >
                                  {SubIcon ? (
                                    <SubIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-2" />
                                  )}
                                  <span className="break-words leading-tight">{subItem.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sky-200/80">
            {onLogout && (
              <Button
                variant="ghost"
                onClick={() => {
                  onLogout();
                  setIsMobileOpen(false);
                }}
                className={cn(
                  'w-full justify-start text-lg text-slate-600 hover:text-slate-900 hover:bg-red-50',
                  isCollapsed && 'lg:justify-center lg:px-2',
                )}
                title={isCollapsed ? 'ออกจากระบบ' : undefined}
              >
                <LogOut className={cn('h-5 w-5', isCollapsed ? 'lg:mx-auto' : 'mr-2')} />
                {!isCollapsed && <span>ออกจากระบบ</span>}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
