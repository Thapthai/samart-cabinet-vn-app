'use client';

import { staffCabinetApi, staffCabinetUsersApi } from '@/lib/staffApi/cabinetApi';
import CabinetUsersWorkspace from './components/CabinetUsersWorkspace';

export default function StaffCabinetUsersPage() {
  return (
    <CabinetUsersWorkspace cabinetUsers={staffCabinetUsersApi} cabinets={staffCabinetApi} />
  );
}
