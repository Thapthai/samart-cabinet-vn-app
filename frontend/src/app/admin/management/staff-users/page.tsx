'use client';

import { useState, useEffect, useCallback } from 'react';
import { staffUserApi, staffRoleApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import type { StaffUser, StaffRoleOption } from './components/types';
import { EditStaffUserDialog } from './components/EditStaffUserDialog';
import { StaffUsersSearchCard } from './components/StaffUsersSearchCard';
import { StaffUsersTable } from './components/StaffUsersTable';
import { RegeneratedCredentialsDialog } from './components/RegeneratedCredentialsDialog';

export default function StaffUsersPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [clientCredentials, setClientCredentials] = useState<{ client_id: string; client_secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchStaffUsers();
    fetchStaffRoles();
  }, []);

  const fetchStaffRoles = async () => {
    try {
      const response = (await staffRoleApi.getAll()) as { success?: boolean; data?: StaffRoleOption[]; message?: string };
      if (response?.success === false) {
        toast.error((response as { message?: string }).message || 'โหลดบทบาทไม่สำเร็จ');
        setStaffRoles([]);
        return;
      }
      setStaffRoles(Array.isArray(response?.data) ? response.data : []);
    } catch (error: unknown) {
      console.error('Failed to fetch staff roles:', error);
      const err = error as { message?: string };
      toast.error(err?.message || 'โหลดบทบาทไม่สำเร็จ');
      setStaffRoles([]);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      const response = (await staffUserApi.getAllStaffUsers()) as { success?: boolean; data?: StaffUser[]; message?: string };
      if (response?.success === false) {
        toast.error((response as { message?: string }).message || 'โหลดข้อมูล Staff User ไม่สำเร็จ');
        setStaffUsers([]);
        return;
      }
      setStaffUsers(Array.isArray(response?.data) ? response.data : []);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
      setStaffUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Staff User นี้?')) return;
    try {
      const response = (await staffUserApi.deleteStaffUser(id)) as { success?: boolean; message?: string };
      if (response?.success) {
        toast.success('ลบ Staff User เรียบร้อยแล้ว');
        fetchStaffUsers();
      } else {
        toast.error((response as { message?: string }).message || 'ไม่สามารถลบ Staff User ได้');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const handleRegenerateSecret = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการสร้าง Client Secret ใหม่? Secret เก่าจะใช้งานไม่ได้อีก')) return;
    try {
      const response = (await staffUserApi.regenerateClientSecret(id)) as {
        success?: boolean;
        data?: { client_id?: string; client_secret?: string };
        message?: string;
      };
      if (response?.success && response?.data) {
        toast.success('สร้าง Client Secret ใหม่เรียบร้อยแล้ว');
        setClientCredentials({
          client_id: response.data.client_id ?? '',
          client_secret: response.data.client_secret ?? '',
        });
        setShowSecret(false);
      } else {
        toast.error((response as { message?: string }).message || 'ไม่สามารถสร้าง Client Secret ใหม่ได้');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const openEditDialog = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  };

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`คัดลอก ${label} เรียบร้อยแล้ว`);
  }, []);

  const q = searchTerm.trim().toLowerCase();
  const filteredUsers = q
    ? staffUsers.filter(
        (u) =>
          `${u.fname} ${u.lname}`.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.client_id?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q) ||
          (u.role_name?.trim().toLowerCase().includes(q) ?? false),
      )
    : staffUsers;

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">จัดการ Staff Users</h1>
                <p className="text-sm text-gray-500 mt-1">จัดการบัญชี Staff และ Client Credentials สำหรับ API</p>
              </div>
            </div>
          </div>

          <StaffUsersSearchCard value={searchTerm} onChange={setSearchTerm} />

          <StaffUsersTable
            loading={loading}
            users={filteredUsers}
            searchTerm={searchTerm}
            staffRoles={staffRoles}
            isCreateDialogOpen={isCreateDialogOpen}
            onCreateDialogOpenChange={setIsCreateDialogOpen}
            showSecret={showSecret}
            onShowSecretChange={setShowSecret}
            onCopy={copyToClipboard}
            onUserCreated={fetchStaffUsers}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onRegenerateSecret={handleRegenerateSecret}
          />
        </div>

        <EditStaffUserDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setSelectedStaff(null);
          }}
          staff={selectedStaff}
          staffRoles={staffRoles}
          onSuccess={fetchStaffUsers}
        />

        {clientCredentials && !isCreateDialogOpen && (
          <RegeneratedCredentialsDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setClientCredentials(null);
                setShowSecret(false);
              }
            }}
            clientId={clientCredentials.client_id}
            clientSecret={clientCredentials.client_secret}
            showSecret={showSecret}
            onShowSecretChange={setShowSecret}
            onCopy={copyToClipboard}
          />
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}
