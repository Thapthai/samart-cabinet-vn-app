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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { staffRoleHierarchyLabel } from '@/lib/staffRolePolicy';
import type { StaffRoleRow } from '@/app/admin/management/staff-roles/components/EditStaffRoleDialog';

function messageFromAxios(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined;
  const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
  const msg = data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

export interface StaffEditStaffRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: StaffRoleRow | null;
  /** ระดับที่อนุญาตให้เลือก (ตาม hierarchy ของผู้ใช้) */
  allowedHierarchyLevels: readonly number[];
  onSaved: () => void | Promise<void>;
}

export function StaffEditStaffRoleDialog({
  open,
  onOpenChange,
  role,
  allowedHierarchyLevels,
  onSaved,
}: StaffEditStaffRoleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [hierarchyLevel, setHierarchyLevel] = useState(3);

  useEffect(() => {
    if (!open || !role) return;
    setName(role.name);
    setDescription(role.description ?? '');
    setIsActive(role.is_active !== false);
    const allowed = [...allowedHierarchyLevels];
    const cur = role.hierarchy_level;
    setHierarchyLevel(allowed.includes(cur) ? cur : allowed[0] ?? cur);
  }, [open, role, allowedHierarchyLevels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('ชื่อ Role ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (!allowedHierarchyLevels.includes(hierarchyLevel)) {
      toast.error('ไม่มีสิทธิ์ตั้งระดับสิทธิ์ Role นี้');
      return;
    }
    try {
      setSubmitting(true);
      const res = await staffRoleApi.update(role.id, {
        name: trimmed,
        description: description.trim(),
        is_active: isActive,
        hierarchy_level: hierarchyLevel,
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

  const levelSelectDisabled = !role || allowedHierarchyLevels.length <= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            แก้ไข Staff Role
          </DialogTitle>
          <DialogDescription>
            รหัส <span className="font-mono font-medium text-foreground">{role?.code}</span> แก้ไขไม่ได้ — ระดับสิทธิ์ที่เลือกได้ขึ้นกับระดับบทบาทของคุณ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-edit-role-name">ชื่อแสดง *</Label>
            <Input
              id="staff-edit-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!role}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-edit-role-desc">คำอธิบาย</Label>
            <Textarea
              id="staff-edit-role-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!role}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-edit-role-hierarchy">ระดับสิทธิ์ Role</Label>
            <Select
              value={String(hierarchyLevel)}
              onValueChange={(v) => setHierarchyLevel(parseInt(v, 10))}
              disabled={levelSelectDisabled}
            >
              <SelectTrigger id="staff-edit-role-hierarchy" className="w-full">
                <SelectValue placeholder="เลือกระดับ" />
              </SelectTrigger>
              <SelectContent>
                {allowedHierarchyLevels.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {staffRoleHierarchyLabel(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allowedHierarchyLevels.length <= 1 ? (
              <p className="text-xs text-muted-foreground">ระดับสิทธิ์ถูกล็อกตามนโยบายของบทบาทคุณ</p>
            ) : (
              <p className="text-xs text-muted-foreground">1 = สูงสุด · 3 = ต่ำสุด</p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label htmlFor="staff-edit-role-active" className="cursor-pointer">
              ใช้งาน
            </Label>
            <Switch id="staff-edit-role-active" checked={isActive} onCheckedChange={setIsActive} disabled={!role} />
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
