'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import EmployeeTab from '@/app/admin/management/staff-users/components/employee-tab/EmployeeTab';

export default function EmployeeManagementPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <EmployeeTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
