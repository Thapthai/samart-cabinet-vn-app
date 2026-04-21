'use client';

import { useState, useEffect } from 'react';
import { staffUserApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StaffUser, StaffRoleOption } from './types';
import { StaffEmployeePicker } from './StaffEmployeePicker';

interface EditStaffUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffUser | null;
  staffRoles: StaffRoleOption[];
  onSuccess: () => void;
}

export function EditStaffUserDialog({ open, onOpenChange, staff, staffRoles, onSuccess }: EditStaffUserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    fname: '',
    lname: '',
    role: '',
    password: '',
    expires_at: '',
  });
  const [empCode, setEmpCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !staff) return;
    setFormData({
      email: staff.email,
      fname: staff.fname,
      lname: staff.lname,
      role: staff.role || '',
      password: '',
      expires_at: staff.expires_at || '',
    });
    setEmpCode(staff.emp_code ?? null);
  }, [open, staff]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    try {
      const updateData: Record<string, unknown> = {
        email: formData.email,
        fname: formData.fname,
        lname: formData.lname,
      };
      if (formData.role) updateData.role_code = formData.role;
      if (formData.password && formData.password !== 'password123') updateData.password = formData.password;
      if (formData.expires_at) updateData.expires_at = formData.expires_at;
      updateData.emp_code = empCode;

      const response = (await staffUserApi.updateStaffUser(staff.id, updateData)) as { success?: boolean; message?: string };
      if (response?.success) {
        toast.success('อัปเดต Staff User เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error((response as { message?: string })?.message || 'ไม่สามารถอัปเดต Staff User ได้');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>แก้ไข Staff User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <Label htmlFor="edit-email">อีเมล *</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-fname">ชื่อจริง *</Label>
            <Input id="edit-fname" value={formData.fname} onChange={(e) => setFormData({ ...formData, fname: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="edit-lname">นามสกุล *</Label>
            <Input id="edit-lname" value={formData.lname} onChange={(e) => setFormData({ ...formData, lname: e.target.value })} required />
          </div>
          {staff ? (
            <StaffEmployeePicker
              value={empCode}
              onChange={setEmpCode}
              exceptUserId={staff.id}
              currentEmployeeLabel={staff.employee_display}
            />
          ) : null}
          <div>
            <Label>บทบาท (Role) *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกบทบาท" />
              </SelectTrigger>
              <SelectContent>
                {staffRoles.map((role) => (
                  <SelectItem key={role.id} value={role.code}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-password">รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)</Label>
            <Input
              id="edit-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="ปล่อยว่างถ้าไม่ต้องการเปลี่ยน"
            />
          </div>
          <div>
            <Label htmlFor="edit-expires_at">วันหมดอายุ Client Credentials</Label>
            <Input
              id="edit-expires_at"
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              บันทึก
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
