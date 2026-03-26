'use client';

import { useState, useEffect } from 'react';
import { staffUserApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StaffRoleOption } from './types';
import { ClientCredentialsPanel } from './ClientCredentialsPanel';

const emptyForm = {
  email: '',
  fname: '',
  lname: '',
  role: '',
  password: 'password123',
  expires_at: '',
};

interface CreateStaffUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffRoles: StaffRoleOption[];
  onSuccess: () => void;
  showSecret: boolean;
  onShowSecretChange: (v: boolean) => void;
  onCopy: (text: string, label: string) => void;
}

export function CreateStaffUserDialog({
  open,
  onOpenChange,
  staffRoles,
  onSuccess,
  showSecret,
  onShowSecretChange,
  onCopy,
}: CreateStaffUserDialogProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [issued, setIssued] = useState<{ client_id: string; client_secret: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setIssued(null);
      return;
    }
    setFormData(emptyForm);
    setIssued(null);
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role?.trim()) {
      toast.error('กรุณาเลือกบทบาท (Role)');
      return;
    }
    if (formData.fname.trim().length < 2) {
      toast.error('ชื่อ (Fname) ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (formData.lname.trim().length < 2) {
      toast.error('นามสกุล (Lname) ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    try {
      const payload = {
        email: formData.email,
        fname: formData.fname,
        lname: formData.lname,
        role_code: formData.role.trim(),
        password: formData.password,
        expires_at: formData.expires_at || undefined,
      };
      const response = await staffUserApi.createStaffUser(payload);
      if (response?.success && response?.data) {
        toast.success('สร้าง Staff User เรียบร้อยแล้ว');
        const creds = {
          client_id: response.data.client_id ?? '',
          client_secret: response.data.client_secret ?? '',
        };
        setIssued(creds);
        onSuccess();
      } else {
        toast.error(response?.message || 'ไม่สามารถสร้าง Staff User ได้');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = err?.response?.data?.message ?? err?.message ?? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onShowSecretChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่ม Staff User ใหม่</DialogTitle>
        </DialogHeader>
        {!issued ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="email">อีเมล *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="fname">ชื่อจริง *</Label>
              <Input id="fname" value={formData.fname} onChange={(e) => setFormData({ ...formData, fname: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="lname">นามสกุล *</Label>
              <Input id="lname" value={formData.lname} onChange={(e) => setFormData({ ...formData, lname: e.target.value })} required />
            </div>
            <div>
              <Label>บทบาท (Role) *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} required disabled={staffRoles.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={staffRoles.length === 0 ? 'กำลังโหลด...' : 'เลือกบทบาท'} />
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
              <Label htmlFor="password">รหัสผ่าน (ค่าเริ่มต้น: password123)</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="expires_at">วันหมดอายุ Client Credentials (ถ้ามี)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              สร้าง
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <ClientCredentialsPanel
              clientId={issued.client_id}
              clientSecret={issued.client_secret}
              showSecret={showSecret}
              onToggleShowSecret={() => onShowSecretChange(!showSecret)}
              onCopy={onCopy}
            />
            <Button type="button" className="w-full" onClick={handleClose}>
              ปิด
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
