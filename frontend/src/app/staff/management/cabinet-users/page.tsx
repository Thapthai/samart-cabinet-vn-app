'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import staffApi from '@/lib/staffApi';
import { createCabinetListGetAll, createCabinetUsersApi } from '@/lib/cabinet-http-clients';
import { cn } from '@/lib/utils';
import { LayoutGrid, UserSquare } from 'lucide-react';
import StaffCabinetUsersWorkspace from './components/CabinetUsersWorkspace';

const CABINETS = '/staff/management/cabinets';
const CABINET_USERS = '/staff/management/cabinet-users';

function StaffCabinetUsersSubNav() {
  const pathname = usePathname();
  const tabs = [
    { href: CABINETS, label: 'รายการตู้', icon: LayoutGrid, exact: true },
    { href: CABINET_USERS, label: 'User ในตู้', icon: UserSquare, exact: false },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-blue-100 text-blue-900'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const cabinetUsers = createCabinetUsersApi(staffApi);
const cabinets = createCabinetListGetAll(staffApi);

export default function StaffCabinetUsersPage() {
  return (
    <>
      <StaffCabinetUsersSubNav />
      <StaffCabinetUsersWorkspace cabinetUsers={cabinetUsers} cabinets={cabinets} />
    </>
  );
}
