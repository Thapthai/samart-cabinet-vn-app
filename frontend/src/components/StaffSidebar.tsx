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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

/** เมนูย่อยแบบรายการเดียว (staff ไม่มีเมนูซ้อน) — ใช้ตอน sidebar หุบ desktop */
function StaffCollapsedFlyoutSubItems({
  items,
  pathname,
  onNavigate,
}: {
  items: StaffMenuSubItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      {items.map((sub) => {
        const SubIcon = sub.icon;
        const subActive =
          pathname === sub.href || pathname.startsWith(sub.href + '/');
        return (
          <DropdownMenuItem key={sub.href} asChild>
            <Link
              href={sub.href}
              onClick={onNavigate}
              className={cn(
                'flex cursor-pointer items-center gap-2',
                subActive && 'bg-sky-50 font-medium text-slate-900',
              )}
            >
              {SubIcon ? (
                <SubIcon className="h-4 w-4 shrink-0" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              )}
              <span className="break-words leading-tight">{sub.name}</span>
            </Link>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

export default function StaffSidebar({ staffUser, onLogout, isAdmin = false }: StaffSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const skipInitialPersist = useRef(true);
  const isLg = useMediaQuery('(min-width: 1024px)');
  /** ไอคอน + เปิดแผงเมนูทางขวา (เฉพาะ desktop ตอน sidebar หุบ) */
  const useCollapsedFlyout = isCollapsed && isLg;

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
    const roleMap: Record<string, string> = {
      it1: 'IT 1',
      it2: 'IT 2',
      it3: 'IT 3',
      warehouse1: 'Warehouse 1',
      warehouse2: 'Warehouse 2',
      warehouse3: 'Warehouse 3',
    };
    return roleMap[roleCode] || roleCode || 'Staff';
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
              (useCollapsedFlyout ? (
                <div className="mb-4 w-full rounded-xl bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-center rounded-xl px-2 py-3 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                        aria-label="กลับไปหน้า Admin"
                        aria-haspopup="menu"
                      >
                        <Shield className="h-5 w-5 flex-shrink-0 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      sideOffset={8}
                      className="w-56 max-w-[min(18rem,calc(100vw-4rem))]"
                    >
                      <DropdownMenuLabel className="font-semibold text-slate-900">
                        กลับไปหน้า Admin
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin/items"
                          onClick={() => setIsMobileOpen(false)}
                          className="cursor-pointer"
                        >
                          ไปที่หน้า Admin
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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

            {filterMenuByPermissions(staffMenuItems, permissions)
              .map((item) => {
                const Icon = item.icon;
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                const isActive =
                  isPathActive(pathname, item.href) ||
                  (hasSubmenu && item.submenu!.some((s) => isPathActive(pathname, s.href)));
                const open = openSubmenus[item.href] ?? isActive;
                const rowActiveClass = isActive
                  ? 'bg-gradient-to-r from-sky-400 to-blue-400 text-white shadow-md shadow-sky-300/30'
                  : 'text-slate-700 hover:bg-sky-100/90 hover:text-slate-900';

                return (
                  <div key={item.href}>
                    {useCollapsedFlyout ? (
                      <div className={cn('group relative w-full rounded-xl', rowActiveClass)}>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'relative flex w-full items-center justify-center rounded-xl px-2 py-3 text-lg font-medium outline-none transition-colors',
                                isActive ? 'text-white' : 'text-inherit',
                                'focus-visible:ring-2 focus-visible:ring-sky-400/50',
                              )}
                              aria-label={item.name}
                              aria-haspopup="menu"
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
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            sideOffset={8}
                            className="w-64 max-h-[min(70vh,24rem)] max-w-[min(18rem,calc(100vw-4rem))] overflow-y-auto"
                          >
                            <DropdownMenuLabel className="font-semibold text-slate-900">
                              {item.name}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {hasSubmenu ? (
                              <StaffCollapsedFlyoutSubItems
                                items={item.submenu!}
                                pathname={pathname}
                                onNavigate={() => setIsMobileOpen(false)}
                              />
                            ) : (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={item.href}
                                  onClick={() => setIsMobileOpen(false)}
                                  className="cursor-pointer"
                                >
                                  ไปที่หน้า{item.name}
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                            <button
                              type="button"
                              onClick={() => {
                                setOpenSubmenus((p) => ({ ...p, [item.href]: !open }));
                                setIsMobileOpen(false);
                              }}
                              className={cn(
                                'flex flex-1 min-w-0 items-center pl-2 pr-2 py-3 text-lg font-medium rounded-xl text-inherit text-left cursor-pointer',
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
                            </button>
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
                          {hasSubmenu && !isCollapsed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenSubmenus((p) => ({ ...p, [item.href]: !open }));
                              }}
                              className={cn(
                                'flex-shrink-0 p-2 rounded-lg text-inherit hover:bg-sky-100/80 transition-colors',
                                isActive && 'text-white',
                              )}
                              aria-expanded={open}
                              aria-label={open ? 'ปิดเมนูย่อย' : 'เปิดเมนูย่อย'}
                            >
                              <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-90')} />
                            </button>
                          )}
                        </div>

                        {hasSubmenu && open && !isCollapsed && (
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
            {onLogout &&
              (useCollapsedFlyout ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-center px-2 text-lg text-slate-600 hover:text-slate-900 hover:bg-red-50"
                      aria-label="ออกจากระบบ"
                      aria-haspopup="menu"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-48">
                    <DropdownMenuItem
                      className="cursor-pointer text-red-700 focus:text-red-800"
                      onClick={() => {
                        onLogout();
                        setIsMobileOpen(false);
                      }}
                    >
                      ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
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
              ))}
          </div>
        </div>
      </aside>
    </>
  );
}
