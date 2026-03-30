'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { staffRoleDisplayLabel, staffRoleHierarchyLabel } from '@/lib/staffRolePolicy';
import type { StaffRoleOption, StaffUser } from '../types';

export interface EditStaffUserFormData {
  role: string;
  is_active: boolean;
}

export interface EditStaffUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStaff: StaffUser | null;
  editRoleData: EditStaffUserFormData;
  setEditRoleData: Dispatch<SetStateAction<EditStaffUserFormData>>;
  assignableRoles: StaffRoleOption[];
  onSubmit: (e: FormEvent) => void;
}

export default function EditStaffUserDialog({
  open,
  onOpenChange,
  selectedStaff,
  editRoleData,
  setEditRoleData,
  assignableRoles,
  onSubmit,
}: EditStaffUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>แก้ไข User</DialogTitle>
        </DialogHeader>
        {selectedStaff && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>ผู้ใช้</Label>
              <Input
                value={`${selectedStaff.fname} ${selectedStaff.lname} (${selectedStaff.email})`}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">บทบาท (Role) *</Label>
              <Select
                value={editRoleData.role}
                onValueChange={(value) => setEditRoleData((d) => ({ ...d, role: value }))}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name || staffRoleDisplayLabel(r.code)} · {staffRoleHierarchyLabel(r.hierarchy_level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-is-active" className="text-base">
                  สถานะบัญชี (Active / Inactive)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Active = ใช้งาน · Inactive = ระงับการเข้าสู่ระบบ (ไม่ลบบัญชี)
                </p>
              </div>
              <Switch
                id="edit-is-active"
                checked={editRoleData.is_active}
                onCheckedChange={(checked) => setEditRoleData((d) => ({ ...d, is_active: checked }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
