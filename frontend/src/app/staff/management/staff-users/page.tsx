'use client';

import { useState } from 'react';
import { Users, Boxes, IdCard } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import EmployeeTab from './components/employee-tab/EmployeeTab';
import StaffUsersTab from './components/staff-users-tab/StaffUsersTab';
import CabinetUsersTab from './components/cabinet-users-tab/CabinetUsersTab';

const TABS = [
  {
    value: 'employee',
    label: 'จัดการพนักงาน',
    icon: IdCard,
    iconClass: 'bg-teal-100 text-teal-700',
  },
  {
    value: 'cabinet-users',
    label: 'ผู้ใช้งานในตู้ Cabinet',
    icon: Boxes,
    iconClass: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'staff-users',
    label: 'จัดการผู้ใช้งาน Staff',
    icon: Users,
    iconClass: 'bg-indigo-100 text-indigo-700',
  },
] as const;

export default function StaffUsersPage() {
  const [activeTab, setActiveTab] = useState<string>('employee');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Users className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการพนักงาน</h1>
          <p className="text-sm text-gray-500">จัดการผู้ใช้งาน Staff และผู้ใช้งานในตู้ Cabinet</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                        : 'border-slate-200 hover:bg-muted/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        tab.iconClass,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-base font-medium text-slate-900 sm:text-lg">
                        {tab.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <TabsContent value="employee">
          <EmployeeTab />
        </TabsContent>

        <TabsContent value="cabinet-users">
          <CabinetUsersTab />
        </TabsContent>

        <TabsContent value="staff-users">
          <StaffUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
