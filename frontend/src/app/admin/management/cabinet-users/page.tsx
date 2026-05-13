'use client';

import { cabinetApi, cabinetUsersApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import CabinetUsersWorkspace from './components/CabinetUsersWorkspace';

export default function AdminCabinetUsersPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
 
        <CabinetUsersWorkspace cabinetUsers={cabinetUsersApi} cabinets={cabinetApi} />
      </AppLayout>
    </ProtectedRoute>
  );
}
