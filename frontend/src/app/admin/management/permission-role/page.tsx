"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { staffRolePermissionApi, staffRoleApi } from "@/lib/api";
import { staffRoleIsStaffPermissionHead } from "@/lib/staffRolePolicy";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Save, Loader2, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { staffMenuItems, type StaffMenuSubItem } from "@/app/staff/menus";


// Flatten staffMenuItems (and submenus) from menus.ts for permission table.
// Dedupe by href so the same path (e.g. parent + sub both /staff/items) appears only once.
const getMenuItems = (): Array<{ value: string; label: string }> => {
  const seen = new Set<string>();
  const menuItems: Array<{ value: string; label: string }> = [];
  staffMenuItems.forEach((menu) => {
    if (!seen.has(menu.href)) {
      seen.add(menu.href);
      menuItems.push({ value: menu.href, label: menu.name });
    }
    if (menu.submenu) {
      menu.submenu.forEach((submenu: StaffMenuSubItem) => {
        if (seen.has(submenu.href)) return;
        seen.add(submenu.href);
        menuItems.push({ value: submenu.href, label: submenu.name });
      });
    }
  });
  return menuItems;
};

interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Permission {
  id: number;
  role_code?: string;
  role_id?: number;
  menu_href: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
  role?: {
    code: string;
    name: string;
  };
}

export default function ManageStaffRolesPage() {
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load roles and menu items in parallel
      const [rolesResponse, permissionsResponse] = await Promise.all([
        staffRoleApi.getAll(),
        staffRolePermissionApi.getAll(),
      ]);

      // Set menu items
      setMenuItems(getMenuItems());

      // Set roles (support both success+data and plain array from backend)
      const rolesData = Array.isArray(rolesResponse?.data)
        ? rolesResponse.data
        : (rolesResponse as any)?.success !== false && (rolesResponse as any)?.data
          ? (rolesResponse as any).data
          : [];
      const activeRoles = (rolesData as Role[]).filter((r) => r.is_active !== false);
      setRoles(activeRoles);

      // Initialize permissions map: all roles × all menus = false
      const permissionsMap: Record<string, Record<string, boolean>> = {};
      activeRoles.forEach((role) => {
        permissionsMap[role.code] = {};
        getMenuItems().forEach((menu) => {
          permissionsMap[role.code][menu.value] = false;
        });
      });

      // Override from API
      const permsData = Array.isArray(permissionsResponse?.data)
        ? permissionsResponse.data
        : (permissionsResponse as any)?.success !== false && (permissionsResponse as any)?.data
          ? (permissionsResponse as any).data
          : [];
      (permsData as Permission[]).forEach((perm) => {
        const roleCode = perm.role_code ?? (perm as any).role?.code;
        if (
          roleCode &&
          permissionsMap[roleCode] &&
          permissionsMap[roleCode][perm.menu_href] !== undefined
        ) {
          permissionsMap[roleCode][perm.menu_href] = perm.can_access;
        }
      });

      setPermissions(permissionsMap);

      if (!rolesData.length && (rolesResponse as any)?.success === false) {
        toast.error((rolesResponse as any)?.message ?? (rolesResponse as any)?.error ?? "ไม่สามารถโหลดข้อมูล Roles ได้");
      }
    } catch (error: any) {
      console.error("Load data error:", error);
      toast.error(error.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
      initializeDefaultPermissions();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPermissions: Record<string, Record<string, boolean>> = {};
    const menuItemsList = getMenuItems();

    roles.forEach((role) => {
      defaultPermissions[role.code] = {};
      menuItemsList.forEach((menu) => {
        // Default: หัวหน้าสาย (IT-001 / WH-001 หรือ legacy it1) เห็นทุกเมนู
        if (staffRoleIsStaffPermissionHead(role.code)) {
          defaultPermissions[role.code][menu.value] = true;
        } else {
          defaultPermissions[role.code][menu.value] =
            menu.value !== "/staff/permissions/users" &&
            menu.value !== "/staff/permissions/roles";
        }
      });
    });
    setPermissions(defaultPermissions);
  };

  const handlePermissionChange = (
    role: string,
    menu: string,
    checked: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menu]: checked,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert permissions to API format
      const permissionsArray: Array<{
        role_code: string;
        menu_href: string;
        can_access: boolean;
      }> = [];

      Object.keys(permissions).forEach((role) => {
        Object.keys(permissions[role]).forEach((menu) => {
          permissionsArray.push({
            role_code: role, // Use role_code instead of role
            menu_href: menu,
            can_access: permissions[role][menu],
          });
        });
      });

      const response = (await staffRolePermissionApi.bulkUpdate(
        permissionsArray
      )) as { success?: boolean; message?: string; error?: string };
      if (response?.success) {
        toast.success("บันทึกการกำหนดสิทธิ์เรียบร้อยแล้ว");
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast.error((response as any)?.error ?? (response as any)?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
      }
    } catch (error: any) {
      toast.error(error.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role.startsWith("it")) {
      return "default";
    } else if (role.startsWith("warehouse")) {
      return "secondary";
    }
    return "outline";
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600">กำลังโหลด...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          {/* Header - aligned with other admin pages */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Shield className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">กำหนดสิทธิ์</h1>
              <p className="text-sm text-gray-500 mt-1">
                กำหนดสิทธิ์การเข้าถึงเมนูตามบทบาท (Role)
              </p>
            </div>
          </div>

          {/* Permissions Table */}
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ตารางกำหนดสิทธิ์</CardTitle>
                <CardDescription>
                  เลือกเมนูที่แต่ละ Role สามารถเข้าถึงได้
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    บันทึก
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">เมนู</TableHead>
                    {roles.map((role) => (
                      <TableHead
                        key={role.code}
                        className="text-center min-w-[150px]"
                      >
                        <div>
                          <Badge
                            variant={getRoleBadgeVariant(role.code)}
                            className="mb-1"
                          >
                            {role.name}
                          </Badge>
                          {role.description && (
                            <div className="text-xs text-gray-500 font-normal mt-1">
                              {role.description}
                            </div>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((menu) => {
                    // Detect submenu by checking if its value exists in any submenu of staffMenuItems
                    const isSubmenu = staffMenuItems.some((main) =>
                      main.submenu && main.submenu.some((sub) => sub.href === menu.value)
                    );
                    return (
                      <TableRow key={menu.value}>
                        <TableCell className={isSubmenu ? 'font-medium pl-8 flex items-center gap-2' : 'font-medium'}>
                          {isSubmenu && <CornerDownRight className="inline-block w-4 h-4 text-gray-400 mr-1" />}
                          {menu.label}
                        </TableCell>
                        {roles.map((role) => {
                          const isDashboard = menu.value === '/staff/dashboard';
                          return (
                            <TableCell key={role.code} className="text-center">
                              <Checkbox
                                checked={permissions[role.code]?.[menu.value] || false}
                                onCheckedChange={isDashboard ? undefined : (checked: boolean) =>
                                  handlePermissionChange(role.code, menu.value, checked)
                                }
                                disabled={isDashboard}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลการใช้งาน</CardTitle>
              <CardDescription>
                หน้านี้สำหรับกำหนดสิทธิ์การเข้าถึงเมนูตามบทบาท
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  • <strong>IT 1:</strong> เห็นทุกเมนู รวมถึงเมนูจัดการสิทธิ์และกำหนดสิทธิ์
                </p>
                <p className="text-sm text-gray-600">
                  • <strong>IT 2, IT 3, Warehouse 1-3:</strong> เห็นทุกเมนู ยกเว้นเมนูจัดการสิทธิ์และกำหนดสิทธิ์ (สามารถกำหนดเองได้)
                </p>
                <p className="text-sm text-gray-600">
                  • สามารถเปิด/ปิดสิทธิ์การเข้าถึงเมนูแต่ละเมนูได้
                </p>
                <p className="text-sm text-gray-600">
                  • คลิก <strong>บันทึก</strong> เพื่อบันทึกการเปลี่ยนแปลง
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
