'use client';

import { useEffect, useState } from 'react';
import { unitsApi } from '@/lib/api';
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
import { Ruler } from 'lucide-react';

interface CreateUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateUnitDialog({ open, onOpenChange, onSuccess }: CreateUnitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [bId, setBId] = useState('');

  useEffect(() => {
    if (!open) {
      setUnitName('');
      setBId('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = unitName.trim();
    if (!name) {
      toast.error('กรุณาระบุชื่อหน่วย');
      return;
    }
    try {
      setLoading(true);
      const payload: { UnitName: string; B_ID?: number } = { UnitName: name };
      if (bId.trim()) {
        const n = parseInt(bId, 10);
        if (!Number.isNaN(n)) payload.B_ID = n;
      }
      const res = await unitsApi.create(payload);
      if (res.success) {
        toast.success(res.message || 'เพิ่มหน่วยนับแล้ว');
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
            <Ruler className="h-5 w-5" />
            เพิ่มหน่วยนับ
          </DialogTitle>
          <DialogDescription>ชื่อหน่วยใช้แสดงและผูกกับรายการ Item</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-unit-name">ชื่อหน่วย (UnitName)</Label>
            <Input
              id="create-unit-name"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              maxLength={50}
              placeholder="เช่น ชิ้น, กล่อง, ม้วน"
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
