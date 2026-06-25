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
          <DialogTitle>ลบรหัสแผนกย่อย &quot;{target?.code}&quot;?</DialogTitle>
          <DialogDescription>
            ประวัติการใช้ที่เคยชี้รหัสนี้จะไม่ชี้ master แล้ว (sub_department_id เป็น null) — ข้อความรหัสใน usage ยังคงอยู่
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3">
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
