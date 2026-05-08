'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import PrintStickerWorkspace from './PrintStickerWorkspace';

export default function AdminPrintStickerPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <PrintStickerWorkspace variant="admin" />
      </AppLayout>
    </ProtectedRoute>
  );
}
