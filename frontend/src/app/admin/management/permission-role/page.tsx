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
import { Shield, Save, Loader2, CornerDownRight, Plus } from "lucide-react";
import { AdminAddStaffRoleDialog } from "./components/AdminAddStaffRoleDialog";
import { toast } from "sonner";
import {
  getAllStaffPermissionHrefs,
  getStaffPermissionTableRows,
  normalizeStaffPermissionMenuHref,
} from "@/lib/staffPermissionTable";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [allRoleCodes, setAllRoleCodes] = useState<string[]>([]);

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

      // Set roles (support both success+data and plain array from backend)
      const rolesData = Array.isArray(rolesResponse?.data)
        ? rolesResponse.data
        : (rolesResponse as any)?.success !== false && (rolesResponse as any)?.data
          ? (rolesResponse as any).data
          : [];
      const allCodes = (rolesData as Role[]).map((r) => r.code).filter(Boolean);
      setAllRoleCodes(allCodes);

      const activeRoles = (rolesData as Role[]).filter((r) => r.is_active !== false);
      setRoles(activeRoles);

      // Initialize permissions map: all roles × all menus = false
      const permissionsMap: Record<string, Record<string, boolean>> = {};
      const hrefs = getAllStaffPermissionHrefs();
      activeRoles.forEach((role) => {
        permissionsMap[role.code] = {};
        hrefs.forEach((href) => {
          permissionsMap[role.code][href] = false;
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
        const menuHref = normalizeStaffPermissionMenuHref(perm.menu_href);
        if (
          roleCode &&
          menuHref &&
          permissionsMap[roleCode] &&
          permissionsMap[roleCode][menuHref] !== undefined
        ) {
          permissionsMap[roleCode][menuHref] = perm.can_access;
        }
      });

      setPermissions(permissionsMap);

      if (!rolesData.length && (rolesResponse as any)?.success === false) {
        toast.error((rolesResponse as any)?.message ?? (rolesResponse as any)?.error ?? "ไม่สามารถโหลดข้อมูล Roles ได้");
      }
    } catch (error: any) {
      console.error("Load data error:", error);
      setAllRoleCodes([]);
      toast.error(error.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
      initializeDefaultPermissions();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPermissions: Record<string, Record<string, boolean>> = {};
    const hrefs = getAllStaffPermissionHrefs();
    const manageUserPaths = [
      "/staff/management/permission-users",
      "/staff/permissions/users",
    ];
    const manageRolePaths = [
      "/staff/management/permission-roles",
      "/staff/management/staff-roles",
      "/staff/permissions/roles",
    ];

    roles.forEach((role) => {
      defaultPermissions[role.code] = {};
      hrefs.forEach((href) => {
        if (staffRoleIsStaffPermissionHead(role.code)) {
          defaultPermissions[role.code][href] = true;
        } else {
          const isManageUsers = manageUserPaths.includes(href);
          const isManageRoles = manageRolePaths.includes(href);
          defaultPermissions[role.code][href] = !isManageUsers && !isManageRoles;
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddRoleOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่ม Role
                  </Button>
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

                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getStaffPermissionTableRows().map((row, rowIdx) => {
                      if (row.type === "section") {
                        return (
                          <TableRow
                            key={`section-${rowIdx}-${row.label}`}
                            className="bg-slate-50/90 hover:bg-slate-50/90"
                          >
                            <TableCell
                              colSpan={1 + roles.length}
                              className="py-2.5 font-semibold text-slate-800"
                            >
                              {row.label}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      const isDashboard = row.href === "/staff/dashboard";
                      return (
                        <TableRow key={`${row.href}-${rowIdx}`}>
                          <TableCell
                            className={
                              row.indent
                                ? "font-medium pl-8 flex items-center gap-2"
                                : "font-medium"
                            }
                          >
                            {row.indent ? (
                              <CornerDownRight className="inline-block h-4 w-4 shrink-0 text-gray-400" />
                            ) : null}
                            {row.label}
                          </TableCell>
                          {roles.map((role) => (
                            <TableCell key={role.code} className="text-center">
                              <Checkbox
                                checked={
                                  permissions[role.code]?.[row.href] || false
                                }
                                onCheckedChange={
                                  isDashboard
                                    ? undefined
                                    : (checked: boolean) =>
                                        handlePermissionChange(
                                          role.code,
                                          row.href,
                                          checked,
                                        )
                                }
                                disabled={isDashboard}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <AdminAddStaffRoleDialog
            open={addRoleOpen}
            onOpenChange={setAddRoleOpen}
            onCreated={loadData}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
