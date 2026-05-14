import { Button } from '@/components/ui/button';
import { Plus, UserSquare } from 'lucide-react';

export function CabinetUsersPageHeader({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-indigo-100 p-2">
          <UserSquare className="h-6 w-6 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User ในตู้</h1>
          <p className="text-sm text-gray-500">เพิ่มชื่อผู้ใช้ตู้และกำหนดว่าขึ้นได้ที่ตู้ไหน</p>
        </div>
      </div>

      <Button
        onClick={onAddClick}
        className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        เพิ่ม User ในตู้
      </Button>
    </div>
  );
}
