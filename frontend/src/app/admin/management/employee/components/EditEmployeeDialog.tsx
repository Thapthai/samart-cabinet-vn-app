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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { isUserToSelectValue } from './employeeUserStatus';

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isUser, setIsUser] = useState('1');

  const hasLinkedStaff = employee?.linkedStaffUser != null;

  useEffect(() => {
    if (open && employee) {
      setFirstName(employee.firstName ?? '');
      setLastName(employee.lastName ?? '');
      setIsUser(isUserToSelectValue(employee.isUser));
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      setLoading(true);
      const payload: { FirstName: string; LastName: string; IsUser: 0 | 1 } = {
        FirstName: firstName.trim(),
        LastName: lastName.trim(),
        IsUser: isUser === '1' ? 1 : 0,
      };
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
          <DialogDescription>
            EmpCode: <span className="font-mono font-medium">{employee?.empCode ?? '—'}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-first-name">ชื่อ (FirstName)</Label>
            <Input
              id="edit-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-last-name">นามสกุล (LastName)</Label>
            <Input
              id="edit-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>สถานะ</Label>
            <Select value={isUser} onValueChange={setIsUser} disabled={loading}>
              <SelectTrigger id="edit-is-user" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">ใช้งาน</SelectItem>
                <SelectItem value="0">ปิดการใช้งาน</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              บันทึกลงตาราง employee
              {hasLinkedStaff ? ' และ sync สถานะ Staff User ที่ผูก EmpCode นี้' : ''}
            </p>
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
