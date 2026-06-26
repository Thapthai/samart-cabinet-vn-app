'use client';

import { cabinetApi, cabinetUsersApi } from '@/lib/api';
import CabinetUsersWorkspace from '@/app/admin/management/cabinet-users/components/CabinetUsersWorkspace';

export default function CabinetUsersTab() {
  return <CabinetUsersWorkspace cabinetUsers={cabinetUsersApi} cabinets={cabinetApi} />;
}
