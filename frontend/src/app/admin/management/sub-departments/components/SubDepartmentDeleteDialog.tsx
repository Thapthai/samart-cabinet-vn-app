'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SubDepartmentRow } from '../types';

type Props = {
  target: SubDepartmentRow | null;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onConfirm: () => void;
};

export default function SubDepartmentDeleteDialog({ target, onOpenChange, saving, onConfirm }: Props) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบแผนกย่อย &quot;{target?.code}&quot;?</DialogTitle>
          <DialogDescription>
            รายการ usage ที่ชี้ master นี้จะถูกตัด FK (sub_department_id เป็น null) — คอลัมน์ข้อความรหัสแผนกย่อย (usage_type) ยังคงอยู่
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            ลบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
