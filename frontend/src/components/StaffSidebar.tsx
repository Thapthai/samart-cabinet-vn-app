'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { staffRolePermissionApi } from '@/lib/api';
import { Menu, X, ChevronLeft, ChevronRight, LogOut, Shield } from 'lucide-react';
import {
  staffMenuItems,
  filterMenuByPermissions,
  type StaffMenuItem,
  type StaffMenuSubItem,
} from '@/app/staff/menus';
import { Button } from '@/components/ui/button';
import { ASSETS } from '@/lib/assets';

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

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

function isSectionActive(item: StaffMenuItem, pathname: string): boolean {
  return (item.submenu ?? []).some((s) => isPathActive(pathname, s.href));
}

/** เมนูย่อยตอน sidebar หุบ — เหมือน Admin Sidebar */
function StaffCollapsedSubIcons({
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
        const subActive = isPathActive(pathname, sub.href);
        return (
          <Link
            key={sub.href}
            href={sub.href}
            title={sub.name}
            onClick={onNavigate}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 transition-colors',
              subActive
                ? 'bg-sky-200/90 text-slate-900 ring-1 ring-sky-400/50'
                : 'text-slate-600 hover:bg-sky-100/90',
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
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const skipInitialPersist = useRef(true);
  const isLg = useMediaQuery('(min-width: 1024px)');
  const useCollapsedNarrow = isCollapsed && isLg;
  const showExpandedChrome = !isCollapsed || !isLg;

  useEffect(() => {
    try {
      if (localStorage.getItem(STAFF_SIDEBAR_COLLAPSED_KEY) === '1') {
        setIsCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

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

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isAdmin) {
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
    }
  };

  const filteredMenuItems = filterMenuByPermissions(
    staffMenuItems,
    permissions,
    staffRoleCodeForMenu,
    { skipSubRoleGate: isAdmin },
  );

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
          'fixed lg:sticky top-0 left-0 z-50 h-[100dvh] max-h-[100dvh] bg-gradient-to-b from-sky-50 via-blue-50/80 to-indigo-50 text-slate-800 transition-[transform,width] duration-300 ease-in-out shadow-xl border-r border-sky-200/80',
          'w-[min(20rem,calc(100vw-1rem))] max-w-[100vw]',
          isCollapsed ? 'lg:w-16' : 'lg:w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full min-h-0">
          <div
            className={cn(
              'flex shrink-0 items-center justify-between border-b border-sky-200/80 transition-[padding] duration-300 gap-2',
              showExpandedChrome ? 'p-4' : 'lg:px-2 lg:py-3 p-4',
            )}
          >
            {showExpandedChrome ? (
              <Link
                href="/staff/dashboard"
                className="flex items-center gap-3 flex-1 min-w-0 no-underline"
                onClick={() => setIsMobileOpen(false)}
              >
                <div className="w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md ring-1 ring-sky-200/60">
                  <img src={ASSETS.LOGO} alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold break-words leading-tight text-slate-800">Staff Portal</h2>
                  <p className="text-sm sm:text-base text-slate-500 break-words leading-tight">Smart Cabinet</p>
                </div>
              </Link>
            ) : (
              <Link
                href="/staff/dashboard"
                className="lg:mx-auto flex items-center justify-center w-11 h-11 rounded-xl bg-white/90 overflow-hidden shadow-md ring-1 ring-sky-200/60 flex-shrink-0"
                title="Staff Portal"
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
              aria-label={isCollapsed ? 'ขยายเมนู' : 'หุบเมนู'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {staffUser && isCollapsed && isLg && (
            <div className="px-2 py-4 border-b border-sky-200/80 flex justify-center shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-sky-300/50">
                {isAdmin
                  ? (staffUser.name?.charAt(0) || staffUser.email?.charAt(0) || 'A').toUpperCase()
                  : (staffUser.fname?.charAt(0) || 'S').toUpperCase()}
              </div>
            </div>
          )}

          <nav
            className={cn(
              'flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-sidebar py-4 space-y-3',
              'px-3 sm:px-3',
              useCollapsedNarrow ? 'lg:px-2 lg:pr-2' : 'lg:pl-2 lg:pr-2',
            )}
          >
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
                  <Shield className="h-5 w-5 shrink-0 text-white" />
                </Link>
              ) : (
                <Link
                  href="/admin/items"
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'group relative flex items-center w-full px-3 py-2.5 text-lg font-medium rounded-xl transition-all duration-200 mb-3',
                    'bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30 hover:from-sky-500 hover:to-blue-500',
                  )}
                >
                  <Shield className="h-5 w-5 shrink-0 mr-2" />
                  <span className="flex-1 font-semibold">กลับไปหน้า Admin</span>
                </Link>
              ))}

            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              if (!item.submenu?.length) {
                if (!Icon) return null;
                const leafActive = isPathActive(pathname, item.href);
                if (useCollapsedNarrow) {
                  return (
                    <div
                      key={item.href}
                      className={cn(
                        'overflow-hidden rounded-xl',
                        leafActive &&
                          'bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30',
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          'relative flex w-full items-center justify-center rounded-xl px-2 py-3 text-lg font-medium transition-colors',
                          leafActive ? 'text-white' : 'text-slate-700 hover:bg-sky-100/90',
                        )}
                        title={item.name}
                        aria-label={item.name}
                      >
                        {leafActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-400 rounded-r-full" />
                        )}
                        <Icon className={cn('h-5 w-5 shrink-0', leafActive ? 'text-white' : 'text-slate-600')} />
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
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-lg font-medium transition-colors',
                      leafActive
                        ? 'bg-sky-100 text-slate-900 border border-sky-300/90 shadow-sm'
                        : 'text-slate-700 hover:bg-sky-50/90',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-slate-600" />
                    <span className="break-words leading-tight">{item.name}</span>
                  </Link>
                );
              }

              if (!item.submenu!.length) return null;
              if (!Icon) return null;

              const sectionActive = isSectionActive(item, pathname);

              if (useCollapsedNarrow) {
                return (
                  <div key={item.href} className="w-full overflow-hidden rounded-xl">
                    <div
                      className={cn(
                        'flex w-full items-center justify-center rounded-xl px-2 py-2.5',
                        sectionActive
                          ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md'
                          : 'text-slate-700',
                      )}
                      title={item.name}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', sectionActive ? 'text-white' : 'text-slate-600')} />
                    </div>
                    <StaffCollapsedSubIcons
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
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-lg font-semibold select-none',
                      sectionActive
                        ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md shadow-sky-300/25'
                        : 'text-slate-800',
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', sectionActive ? 'text-white' : 'text-slate-600')} />
                    <span className="break-words leading-tight">{item.name}</span>
                  </div>
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-sky-300/80 pl-3">
                    {item.submenu!.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = isPathActive(pathname, sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base transition-colors',
                            subActive
                              ? 'bg-sky-100/95 text-slate-900 border border-sky-300 font-medium shadow-sm'
                              : 'text-slate-600 hover:bg-sky-50 hover:text-slate-800',
                          )}
                        >
                          {SubIcon ? (
                            <SubIcon className="h-4 w-4 shrink-0 text-slate-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          )}
                          <span className="break-words leading-snug">{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div
            className={cn(
              'shrink-0 border-t border-sky-200/80 space-y-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
              !showExpandedChrome && 'lg:px-2',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2 text-slate-500 overflow-hidden text-xs sm:text-sm',
                !showExpandedChrome && 'lg:justify-center',
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-sky-200/50">
                <img src={ASSETS.LOGO} alt="" width={18} height={18} className="object-contain opacity-90" />
              </div>
              <span className={cn('font-medium break-words leading-snug', !showExpandedChrome && 'lg:sr-only')}>
                © 2026 POSE Intelligence
              </span>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                onClick={() => {
                  onLogout();
                  setIsMobileOpen(false);
                }}
                className={cn(
                  'w-full justify-start text-base sm:text-lg text-slate-600 hover:text-slate-900 hover:bg-red-50 min-h-[44px] sm:min-h-0',
                  !showExpandedChrome && 'lg:justify-center lg:px-2',
                )}
                title={!showExpandedChrome ? 'ออกจากระบบ' : undefined}
              >
                <LogOut
                  className={cn('h-5 w-5 shrink-0', !showExpandedChrome && 'lg:mx-auto', showExpandedChrome && 'mr-2')}
                />
                {showExpandedChrome && <span>ออกจากระบบ</span>}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
