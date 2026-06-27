'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import UnitTab from '@/app/admin/management/items/components/unit-tab/UnitTab';

export default function AdminUnitsManagementPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <UnitTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
