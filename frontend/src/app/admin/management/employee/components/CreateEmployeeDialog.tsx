'use client';

import { useEffect, useState } from 'react';
import { employeeApi } from '@/lib/api';
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
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateEmployeeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (!open) {
      setEmpCode('');
      setFirstName('');
      setLastName('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = empCode.trim();
    if (!code) {
      toast.error('กรุณาระบุ EmpCode');
      return;
    }
    try {
      setLoading(true);
      const res = await employeeApi.create({
        EmpCode: code,
        FirstName: firstName.trim() || undefined,
        LastName: lastName.trim() || undefined,
      });
      if (res.success) {
        toast.success(res.message || 'เพิ่มพนักงานแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'ไม่สามารถเพิ่มได้');
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
            <UserPlus className="h-5 w-5" />
            เพิ่มพนักงาน
          </DialogTitle>
          <DialogDescription>
            บันทึกรหัสพนักงาน (EmpCode) สำหรับผูกกับ Staff User หรือผู้ใช้ตู้
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-emp-code">EmpCode</Label>
            <Input
              id="create-emp-code"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              maxLength={20}
              placeholder="เช่น E001234"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-first-name">ชื่อ (FirstName)</Label>
            <Input
              id="create-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-last-name">นามสกุล (LastName)</Label>
            <Input
              id="create-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
