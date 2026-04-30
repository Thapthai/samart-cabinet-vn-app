'use client';

import { useEffect, useState } from 'react';
import { unitsApi, type UnitRow } from '@/lib/api';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Ruler } from 'lucide-react';

interface EditUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitRow | null;
  onSuccess: () => void;
}

export default function EditUnitDialog({
  open,
  onOpenChange,
  unit,
  onSuccess,
}: EditUnitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [bId, setBId] = useState('');
  const [restoreActive, setRestoreActive] = useState(false);

  useEffect(() => {
    if (open && unit) {
      setUnitName(unit.unitName || '');
      setBId(unit.bId != null ? String(unit.bId) : '');
      setRestoreActive(false);
    }
  }, [open, unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;
    const name = unitName.trim();
    if (!name) {
      toast.error('กรุณาระบุชื่อหน่วย');
      return;
    }
    try {
      setLoading(true);
      const payload: { UnitName: string; B_ID?: number; IsCancel?: boolean } = {
        UnitName: name,
      };
      if (bId.trim()) {
        const n = parseInt(bId, 10);
        if (!Number.isNaN(n)) payload.B_ID = n;
      }
      if (unit.isCancel && restoreActive) {
        payload.IsCancel = false;
      }
      const res = await unitsApi.update(unit.id, payload);
      if (res.success) {
        toast.success(res.message || 'อัปเดตแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'อัปเดตไม่สำเร็จ');
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
            <Ruler className="h-5 w-5" />
            แก้ไขหน่วยนับ {unit ? `#${unit.id}` : ''}
          </DialogTitle>
          <DialogDescription>แก้ไขชื่อหน่วยและ B_ID หรือคืนสถานะใช้งาน</DialogDescription>
        </DialogHeader>
        {unit && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-unit-name">ชื่อหน่วย</Label>
              <Input
                id="edit-unit-name"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                maxLength={50}
              />
            </div>

            {unit.isCancel && (
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <Checkbox
                  id="restore"
                  checked={restoreActive}
                  onCheckedChange={(c) => setRestoreActive(c === true)}
                />
                <Label htmlFor="restore" className="text-sm font-normal cursor-pointer">
                  คืนสถานะใช้งาน (ยกเลิกการยกเลิก)
                </Label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
