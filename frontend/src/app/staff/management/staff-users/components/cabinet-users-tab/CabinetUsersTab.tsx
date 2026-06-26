'use client';

import { staffCabinetApi, staffCabinetUsersApi } from '@/lib/staffApi/cabinetApi';
import CabinetUsersWorkspace from '@/app/staff/management/cabinet-users/components/CabinetUsersWorkspace';

export default function CabinetUsersTab() {
  return <CabinetUsersWorkspace cabinetUsers={staffCabinetUsersApi} cabinets={staffCabinetApi} />;
}
