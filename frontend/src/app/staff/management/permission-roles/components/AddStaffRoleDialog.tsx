'use client';

import { useMemo, useState, useEffect } from 'react';
import { staffRoleApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { suggestNextAutoStaffRoleCode } from '@/lib/staffRolePolicy';

export interface AddStaffRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allRoleCodes: readonly string[];
  onCreated: () => void | Promise<void>;
}

export default function AddStaffRoleDialog({
  open,
  onOpenChange,
  allRoleCodes,
  onCreated,
}: AddStaffRoleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const previewCode = useMemo(() => suggestNextAutoStaffRoleCode(allRoleCodes), [allRoleCodes]);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error('ชื่อ Role ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    try {
      setSubmitting(true);
      const response = await staffRoleApi.create({
        name: trimmedName,
        description: description.trim() || undefined,
        is_active: true,
      });
      if (response.success) {
        const created = response.data as { code?: string } | undefined;
        toast.success(
          created?.code
            ? `สร้าง Role ${created.code} เรียบร้อย — มีสิทธิ์เข้า /staff/dashboard อัตโนมัติ`
            : response.message || 'สร้าง Role เรียบร้อย — มีสิทธิ์เข้า /staff/dashboard อัตโนมัติ',
        );
        onOpenChange(false);
        await onCreated();
      } else {
        toast.error(response.message || 'ไม่สามารถสร้าง Role ได้');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'เกิดข้อผิดพลาดในการสร้าง Role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            เพิ่ม Role ใหม่
          </DialogTitle>
          <DialogDescription>
            ระบบสร้างรหัสอัตโนมัติ (เช่น <span className="font-mono">STF-001</span>) — กรอกชื่อที่แสดงและคำอธิบาย
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">รหัสโดยประมาณถัดไป: </span>
            <span className="font-mono font-semibold text-slate-900">{previewCode}</span>
            <p className="mt-1 text-xs text-muted-foreground">ค่าจริงตอนบันทึกมาจากเซิร์ฟเวอร์</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role-name">ชื่อแสดง *</Label>
            <Input
              id="new-role-name"
              placeholder="เช่น ทีมสนับสนุน"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role-desc">คำอธิบาย (ไม่บังคับ)</Label>
            <Textarea
              id="new-role-desc"
              placeholder="รายละเอียดเพิ่มเติม"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-3 sm:gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                'สร้าง Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
