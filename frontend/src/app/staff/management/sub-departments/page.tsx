import { redirect } from 'next/navigation';

/** URL เดิม — ใช้หน้า "จัดการแผนก" แทน */
export default function LegacyStaffSubDepartmentsRedirectPage() {
  redirect('/staff/management/departments');
}
