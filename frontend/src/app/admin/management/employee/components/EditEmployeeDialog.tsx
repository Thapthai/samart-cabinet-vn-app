'use client';

import { useEffect, useState } from 'react';
import { employeeApi, type EmployeeRow } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { isUserToSelectValue } from './employeeUserStatus';

const fieldInputClass = 'bg-white';

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRow | null;
  onSuccess: () => void;
}

export default function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isUser, setIsUser] = useState('1');

  const hasLinkedStaff = employee?.linkedStaffUser != null;
  const empCodeChanged = employee != null && empCode.trim() !== employee.empCode;

  useEffect(() => {
    if (open && employee) {
      setEmpCode(employee.empCode ?? '');
      setFirstName(employee.firstName ?? '');
      setLastName(employee.lastName ?? '');
      setIsUser(isUserToSelectValue(employee.isUser));
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const nextEmpCode = empCode.trim();
    if (!nextEmpCode) {
      toast.error('กรุณาระบุ EmpCode');
      return;
    }
    try {
      setLoading(true);
      const payload: {
        EmpCode?: string;
        FirstName: string;
        LastName: string;
        IsUser: 0 | 1;
      } = {
        FirstName: firstName.trim(),
        LastName: lastName.trim(),
        IsUser: isUser === '1' ? 1 : 0,
      };
      if (empCodeChanged) {
        payload.EmpCode = nextEmpCode;
      }
      const res = await employeeApi.update(employee.empCode, payload);
      if (res.success) {
        toast.success(res.message || 'บันทึกแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'ไม่สามารถบันทึกได้');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            แก้ไขพนักงาน
          </DialogTitle>
          <DialogDescription>แก้ไขข้อมูลพนักงานในตาราง employee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-emp-code">EmpCode</Label>
            <Input
              id="edit-emp-code"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              maxLength={20}
              placeholder="เช่น E001234"
              className={fieldInputClass}
            />
            {empCodeChanged && hasLinkedStaff ? (
              <p className="text-xs text-amber-700">
                เปลี่ยน EmpCode จะอัปเดตการผูกกับ Staff User ที่เชื่อมอยู่ด้วย
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-first-name">ชื่อ (FirstName)</Label>
            <Input
              id="edit-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              className={fieldInputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-last-name">นามสกุล (LastName)</Label>
            <Input
              id="edit-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
              className={fieldInputClass}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="space-y-0.5 pr-3">
              <Label htmlFor="edit-is-user" className="cursor-pointer">
                {isUser === '1' ? 'ใช้งาน' : 'ปิดการใช้งาน'}
              </Label>
            </div>
            <Switch
              id="edit-is-user"
              checked={isUser === '1'}
              onCheckedChange={(checked) => setIsUser(checked ? '1' : '0')}
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || !employee}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
