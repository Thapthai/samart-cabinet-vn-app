'use client';

import { useState } from 'react';
import { staffUnitsApi } from '@/lib/staffApi/unitsApi';
import type { UnitRow } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Ban, Loader2 } from 'lucide-react';

interface CancelUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitRow | null;
  onSuccess: () => void;
}

export default function CancelUnitDialog({
  open,
  onOpenChange,
  unit,
  onSuccess,
}: CancelUnitDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!unit) return;
    try {
      setLoading(true);
      const res = await staffUnitsApi.softDelete(unit.id);
      if (res.success) {
        toast.success(res.message || 'ยกเลิกหน่วยนับแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'ดำเนินการไม่สำเร็จ');
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
            <Ban className="h-5 w-5 text-amber-600" />
            ยกเลิกหน่วยนับ? (Staff)
          </DialogTitle>
          <DialogDescription>
            ทำเครื่องหมายยกเลิกผ่าน API Staff (ไม่ลบจากฐานข้อมูล) รายการที่ยกเลิกจะไม่แสดงในรายการใช้งาน
            เว้นแต่เปิดตัวกรอง &quot;แสดงที่ยกเลิกแล้ว&quot;
          </DialogDescription>
        </DialogHeader>
        {unit && (
          <p className="text-sm text-slate-700 py-2">
            หน่วย: <span className="font-semibold">{unit.unitName || `#${unit.id}`}</span>
          </p>
        )}
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            กลับ
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleConfirm()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังดำเนินการ...
              </>
            ) : (
              'ยืนยันยกเลิก'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
