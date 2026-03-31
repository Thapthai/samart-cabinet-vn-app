'use client';

import { useState, useEffect } from 'react';
import { staffRolePermissionApi, staffRoleApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  staffRoleIsStaffPermissionHead,
  readStaffRoleCodeFromStorage,
  staffPortalCanEditPermissionColumn,
} from '@/lib/staffRolePolicy';
import { getAllStaffPermissionHrefs } from '@/lib/staffPermissionTable';
import type { StaffPermissionRole, StaffRolePermissionRow } from './types';
import PermissionRolesPageLoading from './components/PermissionRolesPageLoading';
import PermissionRolesTableCard from './components/PermissionRolesTableCard';
import AddStaffRoleDialog from './components/AddStaffRoleDialog';

export default function ManageRolesPage() {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [roles, setRoles] = useState<StaffPermissionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [rolesResponse, permissionsResponse] = await Promise.all([
        staffRoleApi.getAll(),
        staffRolePermissionApi.getAll(),
      ]);

      if (rolesResponse.success && rolesResponse.data) {
        const rawRoles = rolesResponse.data as StaffPermissionRole[];
        const activeRoles = rawRoles.filter((role) => role.is_active);
        setRoles(activeRoles);

        const permissionsMap: Record<string, Record<string, boolean>> = {};
        const hrefs = getAllStaffPermissionHrefs();

        activeRoles.forEach((role) => {
          permissionsMap[role.code] = {};
          hrefs.forEach((href) => {
            permissionsMap[role.code][href] = false;
          });
        });

        if (permissionsResponse.success && permissionsResponse.data) {
          (permissionsResponse.data as StaffRolePermissionRow[]).forEach((perm) => {
            const roleCode = perm.role_code || perm.role?.code;
            if (roleCode && permissionsMap[roleCode] && permissionsMap[roleCode][perm.menu_href] !== undefined) {
              permissionsMap[roleCode][perm.menu_href] = perm.can_access;
            }
          });
        }

        setPermissions(permissionsMap);
      } else {
        toast.error(rolesResponse.message || 'ไม่สามารถโหลดข้อมูล Roles ได้');
        initializeDefaultPermissions();
      }
    } catch (error: unknown) {
      console.error('Load data error:', error);
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
      initializeDefaultPermissions();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPermissions: Record<string, Record<string, boolean>> = {};
    const hrefs = getAllStaffPermissionHrefs();
    const manageUserPaths = ['/staff/management/permission-users', '/staff/permissions/users'];
    const manageRolePaths = [
      '/staff/management/permission-roles',
      '/staff/management/staff-roles',
      '/staff/permissions/roles',
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

  const handlePermissionChange = (role: string, menu: string, checked: boolean) => {
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

      const viewerRoleCode = readStaffRoleCodeFromStorage();
      const permissionsArray: Array<{ role_code: string; menu_href: string; can_access: boolean }> = [];

      Object.keys(permissions).forEach((roleCode) => {
        if (!staffPortalCanEditPermissionColumn(viewerRoleCode, roleCode)) return;
        Object.keys(permissions[roleCode]).forEach((menu) => {
          permissionsArray.push({
            role_code: roleCode,
            menu_href: menu,
            can_access: permissions[roleCode][menu],
          });
        });
      });

      const response = await staffRolePermissionApi.bulkUpdate(permissionsArray);
      if (response.success) {
        toast.success('บันทึกการกำหนดสิทธิ์เรียบร้อยแล้ว');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(response.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  const viewerRoleCode = readStaffRoleCodeFromStorage();

  if (loading) {
    return <PermissionRolesPageLoading />;
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">กำหนดสิทธิ์</h2>
        <p className="mt-1 text-gray-600">
          หัวหน้าสายแก้สิทธิ์ของลูกสายในสายเดียวกันได้ — หรือแก้เฉพาะคอลัมน์ของ Role ที่ตรงกับบทบาทคุณ
        </p>
      </div>

      <PermissionRolesTableCard
        roles={roles}
        viewerRoleCode={viewerRoleCode}
        canCreateRole={staffRoleIsStaffPermissionHead(viewerRoleCode)}
        permissions={permissions}
        saving={saving}
        onSave={handleSave}
        onOpenAddRole={() => setAddRoleOpen(true)}
        onPermissionChange={handlePermissionChange}
      />

      <AddStaffRoleDialog
        open={addRoleOpen}
        onOpenChange={setAddRoleOpen}
        viewerRoleCode={viewerRoleCode}
        onCreated={loadData}
      />

    </>
  );
}
