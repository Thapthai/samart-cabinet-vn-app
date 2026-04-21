import { redirect } from 'next/navigation';

/** ล็อกอินรวมที่ `/auth/login` แล้ว — เก็บ path เดิมไว้ redirect */
export default function StaffLoginRedirectPage() {
  redirect('/auth/login');
}
