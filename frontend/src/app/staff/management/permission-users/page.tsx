'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { staffUserApi, staffRoleApi } from '@/lib/api';
import {
  staffRoleDisplayLabel,
  staffPortalCanPickAssignableRole,
  staffPortalCanManageStaffUserRow,
  readStaffHierarchyLevelFromStorage,
  readStaffUserIdFromStorage,
  clampStaffRoleHierarchyLevel,
} from '@/lib/staffRolePolicy';
import { toast } from 'sonner';
import { emptyCreateStaffUserForm, type CreateStaffUserFormData, type StaffRoleOption, type StaffUser } from './types';
import CreateStaffUserDialog from './components/CreateStaffUserDialog';
import EditStaffUserDialog, { type EditStaffUserFormData } from './components/EditStaffUserDialog';
import PermissionUsersTableCard from './components/PermissionUsersTableCard';

export default function ManageUsersPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  const [formData, setFormData] = useState<CreateStaffUserFormData>(emptyCreateStaffUserForm);

  const [editRoleData, setEditRoleData] = useState<EditStaffUserFormData>({
    role: '',
    is_active: true,
  });

  const [rolesCatalog, setRolesCatalog] = useState<StaffRoleOption[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await staffRoleApi.getAll();
        if (res.success && Array.isArray(res.data)) {
          setRolesCatalog(
            (res.data as { code: string; name: string; is_active?: boolean; hierarchy_level?: unknown }[])
              .filter((r) => r.is_active !== false)
              .map((r) => ({
                code: r.code,
                name: r.name,
                hierarchy_level: clampStaffRoleHierarchyLevel(r.hierarchy_level),
              })),
          );
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    fetchStaffUsers();
  }, []);

  const viewerLevel = readStaffHierarchyLevelFromStorage();
  const assignableRoles = useMemo(
    () => rolesCatalog.filter((r) => staffPortalCanPickAssignableRole(viewerLevel, r.hierarchy_level)),
    [rolesCatalog, viewerLevel],
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(staffUsers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = staffUsers.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.fname.toLowerCase().includes(query) ||
          user.lname.toLowerCase().includes(query) ||
          staffRoleDisplayLabel(user.role).toLowerCase().includes(query) ||
          (user.role_name?.trim().toLowerCase().includes(query) ?? false),
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, staffUsers]);

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      const response = await staffUserApi.getAllStaffUsers();
      if (response.success) {
        setStaffUsers((response.data as StaffUser[]) || []);
        setFilteredUsers((response.data as StaffUser[]) || []);
      } else {
        toast.error(response.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.role?.trim()) {
      toast.error('กรุณาเลือก Role');
      return;
    }
    const chosen = rolesCatalog.find((r) => r.code === formData.role);
    if (!chosen || !staffPortalCanPickAssignableRole(readStaffHierarchyLevelFromStorage(), chosen.hierarchy_level)) {
      toast.error('ไม่มีสิทธิ์สร้างผู้ใช้ด้วย Role นี้');
      return;
    }
    try {
      const response = await staffUserApi.createStaffUser(formData);
      if (response.success) {
        toast.success('สร้าง User เรียบร้อยแล้ว');
        setIsCreateDialogOpen(false);
        setFormData(emptyCreateStaffUserForm());
        fetchStaffUsers();
      } else {
        toast.error(response.message || 'ไม่สามารถสร้าง User ได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const handleEditRole = (user: StaffUser) => {
    const targetLvl = rolesCatalog.find((r) => r.code === user.role)?.hierarchy_level ?? 3;
    if (
      !staffPortalCanManageStaffUserRow(
        readStaffHierarchyLevelFromStorage(),
        readStaffUserIdFromStorage(),
        user.id,
        targetLvl,
      )
    ) {
      toast.error('ไม่มีสิทธิ์แก้ไขผู้ใช้รายนี้');
      return;
    }
    setSelectedStaff(user);
    setEditRoleData({ role: user.role, is_active: user.is_active });
    setIsEditRoleDialogOpen(true);
  };

  const handleUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!editRoleData.role?.trim()) {
      toast.error('กรุณาเลือก Role');
      return;
    }
    const oldLvl = rolesCatalog.find((r) => r.code === selectedStaff.role)?.hierarchy_level ?? 3;
    if (
      !staffPortalCanManageStaffUserRow(
        readStaffHierarchyLevelFromStorage(),
        readStaffUserIdFromStorage(),
        selectedStaff.id,
        oldLvl,
      )
    ) {
      toast.error('ไม่มีสิทธิ์แก้ไขผู้ใช้รายนี้');
      return;
    }
    const newLvl = rolesCatalog.find((r) => r.code === editRoleData.role)?.hierarchy_level ?? 3;
    if (!staffPortalCanPickAssignableRole(readStaffHierarchyLevelFromStorage(), newLvl)) {
      toast.error('ไม่มีสิทธิ์มอบ Role นี้');
      return;
    }

    try {
      const response = await staffUserApi.updateStaffUser(selectedStaff.id, {
        role: editRoleData.role,
        is_active: editRoleData.is_active,
      });
      if (response.success) {
        toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
        setIsEditRoleDialogOpen(false);
        setSelectedStaff(null);
        fetchStaffUsers();
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขสิทธิ์ได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">จัดการ User</h2>
        <p className="mt-1 text-gray-600">จัดการข้อมูลผู้ใช้งานในระบบ</p>
      </div>

      <PermissionUsersTableCard
        visibleUsers={filteredUsers}
        rolesCatalog={rolesCatalog}
        loading={loading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onEditUser={handleEditRole}
        createDialog={
          <CreateStaffUserDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            formData={formData}
            setFormData={setFormData}
            assignableRoles={assignableRoles}
            onSubmit={handleCreate}
            addDisabled={false}
          />
        }
      />

      <EditStaffUserDialog
        open={isEditRoleDialogOpen}
        onOpenChange={setIsEditRoleDialogOpen}
        selectedStaff={selectedStaff}
        editRoleData={editRoleData}
        setEditRoleData={setEditRoleData}
        assignableRoles={assignableRoles}
        onSubmit={handleUpdateRole}
      />

    </>
  );
}
