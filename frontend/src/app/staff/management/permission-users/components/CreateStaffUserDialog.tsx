'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { staffRoleDisplayLabel } from '@/lib/staffRolePolicy';
import type { CreateStaffUserFormData, StaffRoleOption } from '../types';

export interface CreateStaffUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateStaffUserFormData;
  setFormData: Dispatch<SetStateAction<CreateStaffUserFormData>>;
  assignableRoles: StaffRoleOption[];
  onSubmit: (e: React.FormEvent) => void;
  addDisabled: boolean;
}

export default function CreateStaffUserDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  assignableRoles,
  onSubmit,
  addDisabled,
}: CreateStaffUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={addDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่ม User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่ม User ใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-email">อีเมล *</Label>
            <Input
              id="create-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="create-fname">ชื่อจริง *</Label>
            <Input
              id="create-fname"
              value={formData.fname}
              onChange={(e) => setFormData((f) => ({ ...f, fname: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="create-lname">นามสกุล *</Label>
            <Input
              id="create-lname"
              value={formData.lname}
              onChange={(e) => setFormData((f) => ({ ...f, lname: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="create-role">บทบาท (Role) *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData((f) => ({ ...f, role: value }))}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกบทบาท" />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.name || staffRoleDisplayLabel(r.code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="create-is-active" className="text-base">
                สถานะบัญชี (Active / Inactive)
              </Label>
              <p className="text-sm text-muted-foreground">Active = ใช้งาน · Inactive = ยังไม่ให้เข้าสู่ระบบ</p>
            </div>
            <Switch
              id="create-is-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((f) => ({ ...f, is_active: checked }))}
            />
          </div>
          <div>
            <Label htmlFor="create-password">รหัสผ่าน (ค่าเริ่มต้น: password123)</Label>
            <Input
              id="create-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">สร้าง</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
