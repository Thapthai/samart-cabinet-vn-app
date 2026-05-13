'use client';

import staffApi from '@/lib/staffApi';
import { createCabinetListGetAll, createCabinetUsersApi } from '@/lib/cabinet-http-clients';
import StaffCabinetUsersWorkspace from './components/CabinetUsersWorkspace';

const cabinetUsers = createCabinetUsersApi(staffApi);
const cabinets = createCabinetListGetAll(staffApi);

export default function StaffCabinetUsersPage() {
  return (
    <>

      <StaffCabinetUsersWorkspace cabinetUsers={cabinetUsers} cabinets={cabinets} />
    </>
  );
}
