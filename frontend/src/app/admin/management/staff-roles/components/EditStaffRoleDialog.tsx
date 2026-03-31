'use client';

import { useEffect, useState } from 'react';
import { staffRoleApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export type StaffRoleRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

function messageFromAxios(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined;
  const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
  const msg = data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

export interface EditStaffRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: StaffRoleRow | null;
  onSaved: () => void | Promise<void>;
}

export function EditStaffRoleDialog({ open, onOpenChange, role, onSaved }: EditStaffRoleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open || !role) return;
    setName(role.name);
    setDescription(role.description ?? '');
    setIsActive(role.is_active !== false);
  }, [open, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('ชื่อ Role ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    try {
      setSubmitting(true);
      const res = await staffRoleApi.update(role.id, {
        name: trimmed,
        description: description.trim(),
        is_active: isActive,
      });
      if (res.success === false) {
        toast.error((res as { message?: string }).message || 'บันทึกไม่สำเร็จ');
        return;
      }
      toast.success('บันทึกการแก้ไข Role แล้ว');
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(messageFromAxios(e) || 'บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            แก้ไข Staff Role
          </DialogTitle>
          <DialogDescription>
            รหัส <span className="font-mono font-medium text-foreground">{role?.code}</span> แก้ไขไม่ได้ — ปรับชื่อแสดง
            คำอธิบาย และสถานะใช้งาน
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-role-name">ชื่อแสดง *</Label>
            <Input
              id="edit-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!role}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role-desc">คำอธิบาย</Label>
            <Textarea
              id="edit-role-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!role}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label htmlFor="edit-role-active" className="cursor-pointer">
              ใช้งาน
            </Label>
            <Switch id="edit-role-active" checked={isActive} onCheckedChange={setIsActive} disabled={!role} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting || !role}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
