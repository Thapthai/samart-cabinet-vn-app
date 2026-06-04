'use client';

import { useState } from 'react';
import { employeeApi, type EmployeeRow } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRow | null;
  onSuccess: () => void;
}

export default function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: DeleteEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);

  const linkedStaff = employee?.linkedStaffUser != null;
  const linkedLegacy = (employee?.linkedLegacyUserCount ?? 0) > 0;
  const cannotDelete = linkedStaff || linkedLegacy;

  const handleConfirm = async () => {
    if (!employee) return;
    if (cannotDelete) {
      toast.error('ไม่สามารถลบได้ — EmpCode ถูกผูกกับบัญชีในระบบแล้ว');
      return;
    }
    try {
      setLoading(true);
      const res = await employeeApi.delete(employee.empCode);
      if (res.success) {
        toast.success(res.message || 'ลบพนักงานแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'ไม่สามารถลบได้');
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบพนักงาน</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                ต้องการลบพนักงาน{' '}
                <span className="font-mono font-medium text-foreground">{employee?.empCode}</span>
                {employee?.displayName ? ` (${employee.displayName})` : ''} หรือไม่?
              </p>
              {linkedStaff && employee?.linkedStaffUser && (
                <p className="text-destructive">
                  ผูก Staff User แล้ว ({employee.linkedStaffUser.email}) — ไม่สามารถลบได้
                </p>
              )}
              {linkedLegacy && (
                <p className="text-destructive">
                  ผูกผู้ใช้ตู้ (legacy) {employee?.linkedLegacyUserCount} รายการ — ไม่สามารถลบได้
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading || cannotDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'กำลังลบ...' : 'ลบ'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
