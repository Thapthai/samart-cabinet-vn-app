'use client';

import { useState, useEffect, useMemo } from 'react';
import { staffRoleApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { suggestNextItRoleCode, suggestNextWhRoleCode } from '@/lib/staffRolePolicy';

export interface AdminAddStaffRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCodes: readonly string[];
  onCreated: () => void | Promise<void>;
}

type StaffFamily = 'it' | 'wh' | '';

export function AdminAddStaffRoleDialog({ open, onOpenChange, existingCodes, onCreated }: AdminAddStaffRoleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [family, setFamily] = useState<StaffFamily>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const suggestedCode = useMemo(() => {
    if (family === 'it') return suggestNextItRoleCode(existingCodes);
    if (family === 'wh') return suggestNextWhRoleCode(existingCodes);
    return '';
  }, [family, existingCodes]);

  /** แสดงรหัสที่จะสร้างได้เมื่อเช็คแล้วว่ายังไม่มีในระบบ */
  const isSuggestedCodeAvailable = useMemo(() => {
    if (!suggestedCode.trim()) return false;
    const norm = suggestedCode.trim().toLowerCase();
    return !existingCodes.some((c) => String(c).trim().toLowerCase() === norm);
  }, [suggestedCode, existingCodes]);

  useEffect(() => {
    if (!open) {
      setFamily('');
      setName('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode =
      family === 'it' ? suggestNextItRoleCode(existingCodes) : family === 'wh' ? suggestNextWhRoleCode(existingCodes) : '';
    const trimmedName = name.trim();
    if (!family || !trimmedCode) {
      toast.error('กรุณาเลือกสาย IT หรือ Warehouse');
      return;
    }
    if (trimmedName.length < 2) {
      toast.error('ชื่อ Role ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    const norm = trimmedCode.toLowerCase();
    if (existingCodes.some((c) => String(c).trim().toLowerCase() === norm)) {
      toast.error('รหัส Role นี้มีในระบบแล้ว — ลองโหลดหน้าใหม่แล้วสร้างอีกครั้ง');
      return;
    }
    try {
      setSubmitting(true);
      const response = await staffRoleApi.create({
        code: trimmedCode,
        name: trimmedName,
        description: description.trim() || undefined,
        is_active: true,
      });
      if (response.success) {
        toast.success(response.message || 'สร้าง Role เรียบร้อยแล้ว (มีสิทธิ์เข้า /staff/dashboard อัตโนมัติ)');
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
            เพิ่ม Staff Role ใหม่
          </DialogTitle>
          <DialogDescription>เลือกสายงาน ระบบจะสร้างรหัส ถัดไปให้อัตโนมัติ</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>ประเภทของ ผู้ใช้งาน Staff *</Label>
            <Select value={family || undefined} onValueChange={(v) => setFamily(v as 'it' | 'wh')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกสาย IT หรือ Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it">IT</SelectItem>
                <SelectItem value="wh">Warehouse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {family && suggestedCode && isSuggestedCodeAvailable ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">รหัสที่จะสร้าง: </span>
              <span className="font-mono font-semibold text-slate-900">{suggestedCode}</span>
            </div>
          ) : null}
          {family && suggestedCode && !isSuggestedCodeAvailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              รหัส <span className="font-mono font-semibold">{suggestedCode}</span> มีในระบบแล้ว — ปิด dialog แล้วเปิดใหม่หรือรีเฟรชหน้าเพื่อโหลดรายการ Role ล่าสุด
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="admin-new-role-name">ชื่อแสดง *</Label>
            <Input
              id="admin-new-role-name"
              placeholder="เช่น IT ทีมสนับสนุน 4"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-new-role-desc">คำอธิบาย (ไม่บังคับ)</Label>
            <Textarea
              id="admin-new-role-desc"
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
            <Button type="submit" disabled={submitting || !family || !suggestedCode || !isSuggestedCodeAvailable}>
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
