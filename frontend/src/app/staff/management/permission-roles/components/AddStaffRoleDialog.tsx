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
import {
  staffRoleCanCreateRoleCode,
  staffRoleIsHeadIt,
  staffRoleIsHeadWh,
  suggestNextItRoleCode,
  suggestNextWhRoleCode,
} from '@/lib/staffRolePolicy';

export interface AddStaffRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerRole: string;
  allRoleCodes: readonly string[];
  onCreated: () => void | Promise<void>;
}

export default function AddStaffRoleDialog({
  open,
  onOpenChange,
  viewerRole,
  allRoleCodes,
  onCreated,
}: AddStaffRoleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const suggestedNextRoleCode = useMemo(() => {
    if (!open) return '';
    if (staffRoleIsHeadIt(viewerRole)) return suggestNextItRoleCode(allRoleCodes);
    if (staffRoleIsHeadWh(viewerRole)) return suggestNextWhRoleCode(allRoleCodes);
    return '';
  }, [open, viewerRole, allRoleCodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const code = staffRoleIsHeadIt(viewerRole)
      ? suggestNextItRoleCode(allRoleCodes)
      : staffRoleIsHeadWh(viewerRole)
        ? suggestNextWhRoleCode(allRoleCodes)
        : '';
    if (!code) {
      toast.error('เฉพาะหัวหน้าสาย IT-001 หรือ WH-001 เท่านั้นที่สร้าง Role ย่อยได้');
      return;
    }
    if (trimmedName.length < 2) {
      toast.error('ชื่อ Role ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (!staffRoleCanCreateRoleCode(viewerRole, code)) {
      toast.error('คุณสร้างได้เฉพาะ Role ในสายงานของคุณ (ไม่รวมระดับหัวหน้าสาย)');
      return;
    }
    try {
      setSubmitting(true);
      const response = await staffRoleApi.create({
        code,
        name: trimmedName,
        description: description.trim() || undefined,
        is_active: true,
      });
      if (response.success) {
        toast.success(response.message || 'สร้าง Role เรียบร้อยแล้ว');
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
            ระบบสร้างรหัสอัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">รหัสที่จะสร้าง: </span>
            <span className="font-mono font-semibold text-slate-900">{suggestedNextRoleCode || '—'}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role-name">ชื่อแสดง *</Label>
            <Input
              id="new-role-name"
              placeholder="เช่น IT ทีมสนับสนุน 3"
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
            <Button type="submit" disabled={submitting || !suggestedNextRoleCode}>
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
