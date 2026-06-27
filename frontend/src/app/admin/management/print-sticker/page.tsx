'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import PrintStickerTab from '@/app/admin/management/items/components/print-sticker-tab/PrintStickerTab';

export default function AdminPrintStickerPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <PrintStickerTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
