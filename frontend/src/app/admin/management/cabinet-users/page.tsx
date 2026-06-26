'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import CabinetUsersTab from '@/app/admin/management/staff-users/components/cabinet-users-tab/CabinetUsersTab';

export default function AdminCabinetUsersPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <CabinetUsersTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
