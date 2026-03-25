'use client';

import { useState, useEffect } from 'react';
import { staffRolePermissionApi, staffRoleApi } from '@/lib/api';
import { toast } from 'sonner';
import { readStaffRoleCodeFromStorage, staffRoleIsStaffPermissionHead } from '@/lib/staffRolePolicy';
import { getStaffPermissionMenuItems } from './getStaffPermissionMenuItems';
import type { StaffPermissionRole, StaffRolePermissionRow } from './types';
import PermissionRolesPageLoading from './components/PermissionRolesPageLoading';
import PermissionRolesTableCard from './components/PermissionRolesTableCard';
import AddStaffRoleDialog from './components/AddStaffRoleDialog';

export default function ManageRolesPage() {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [roles, setRoles] = useState<StaffPermissionRole[]>([]);
  const [menuItems, setMenuItems] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewerRole, setViewerRole] = useState('');
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [allRoleCodes, setAllRoleCodes] = useState<string[]>([]);

  useEffect(() => {
    setViewerRole(readStaffRoleCodeFromStorage());
  }, []);

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

      setMenuItems(getStaffPermissionMenuItems());

      if (rolesResponse.success && rolesResponse.data) {
        const rawRoles = rolesResponse.data as StaffPermissionRole[];
        setAllRoleCodes(rawRoles.map((r) => r.code));
        const activeRoles = rawRoles.filter((role) => role.is_active);
        setRoles(activeRoles);

        const permissionsMap: Record<string, Record<string, boolean>> = {};
        const menus = getStaffPermissionMenuItems();

        activeRoles.forEach((role) => {
          permissionsMap[role.code] = {};
          menus.forEach((menu) => {
            permissionsMap[role.code][menu.value] = false;
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
        setAllRoleCodes([]);
        toast.error(rolesResponse.message || 'ไม่สามารถโหลดข้อมูล Roles ได้');
        initializeDefaultPermissions();
      }
    } catch (error: unknown) {
      console.error('Load data error:', error);
      setAllRoleCodes([]);
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
      initializeDefaultPermissions();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPermissions: Record<string, Record<string, boolean>> = {};
    const menuItemsList = getStaffPermissionMenuItems();

    roles.forEach((role) => {
      defaultPermissions[role.code] = {};
      menuItemsList.forEach((menu) => {
        const manageUserPaths = ['/staff/management/permission-users', '/staff/permissions/users'];
        const manageRolePaths = ['/staff/management/permission-roles', '/staff/permissions/roles'];
        const isManageUsers = manageUserPaths.includes(menu.value);
        const isManageRoles = manageRolePaths.includes(menu.value);
        if (staffRoleIsStaffPermissionHead(role.code)) {
          defaultPermissions[role.code][menu.value] = true;
        } else {
          defaultPermissions[role.code][menu.value] = !isManageUsers && !isManageRoles;
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

      const permissionsArray: Array<{ role_code: string; menu_href: string; can_access: boolean }> = [];

      Object.keys(permissions).forEach((role) => {
        Object.keys(permissions[role]).forEach((menu) => {
          permissionsArray.push({
            role_code: role,
            menu_href: menu,
            can_access: permissions[role][menu],
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

  if (loading) {
    return <PermissionRolesPageLoading />;
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">กำหนดสิทธิ์</h2>
        <p className="mt-1 text-gray-600">กำหนดสิทธิ์การเข้าถึงเมนูตามบทบาท (Role)</p>
      </div>

      <PermissionRolesTableCard
        roles={roles}
        menuItems={menuItems}
        permissions={permissions}
        viewerRole={viewerRole}
        saving={saving}
        onSave={handleSave}
        onOpenAddRole={() => setAddRoleOpen(true)}
        onPermissionChange={handlePermissionChange}
      />

      <AddStaffRoleDialog
        open={addRoleOpen}
        onOpenChange={setAddRoleOpen}
        viewerRole={viewerRole}
        allRoleCodes={allRoleCodes}
        onCreated={loadData}
      />

    </>
  );
}
