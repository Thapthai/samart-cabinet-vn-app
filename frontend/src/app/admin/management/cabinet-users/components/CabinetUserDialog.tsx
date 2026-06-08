'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export interface CabinetOption {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
}

const fieldInputClass = 'bg-white';

export type CreateCabinetUserFormPayload = {
  user_name: string;
  emp_code: string | null;
  password?: string;
  cabinet_ids: number[];
};

export type EditCabinetUserFormPayload = {
  cabinet_ids: number[];
};

interface CabinetUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  cabinetOptions: CabinetOption[];
  initial?: {
    id: number;
    userName?: string | null;
    empCode?: string | null;
    cabinet_ids: number[];
  } | null;
  onSubmit: (payload: CreateCabinetUserFormPayload | EditCabinetUserFormPayload) => Promise<void>;
}

export default function CabinetUserDialog({
  open,
  onOpenChange,
  mode,
  cabinetOptions,
  initial,
  onSubmit,
}: CabinetUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCabinetIds, setSelectedCabinetIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit') {
      if (!initial) return;
      setUserName(initial.userName ?? '');
      setEmpCode(initial.empCode ?? '');
      setPassword('');
      setSelectedCabinetIds(new Set(initial.cabinet_ids));
      return;
    }
    setUserName('');
    setEmpCode('');
    setPassword('');
    setSelectedCabinetIds(new Set());
  }, [open, mode, initial]);

  const toggleCabinet = (id: number, checked: boolean) => {
    setSelectedCabinetIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'edit') {
      try {
        setLoading(true);
        await onSubmit({ cabinet_ids: [...selectedCabinetIds] });
      } finally {
        setLoading(false);
      }
      return;
    }
    const name = userName.trim();
    if (!name) return;
    try {
      setLoading(true);
      const payload: CreateCabinetUserFormPayload = {
        user_name: name,
        emp_code: empCode.trim() || null,
        cabinet_ids: [...selectedCabinetIds],
      };
      const pw = password.trim();
      if (pw) payload.password = pw;
      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  const isCreate = mode === 'create';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'เพิ่ม User ในตู้' : 'จัดการตู้ของผู้ใช้'}</DialogTitle>
          <DialogDescription asChild>
            {isCreate ? (
              <p className="text-sm text-muted-foreground">
                ชื่อใช้กับตารางผู้ใช้ตู้เดิม (UserName) เลือกตู้ที่ผู้ใช้สามารถขึ้นระบบได้
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                เลือกหรือถอนตู้ที่ผู้ใช้ขึ้นได้
                {initial?.userName ? (
                  <>
                    {' '}
                    — <span className="font-medium text-foreground">{initial.userName}</span>
                    {initial.empCode ? (
                      <span className="text-muted-foreground"> · EmpCode {initial.empCode}</span>
                    ) : null}
                  </>
                ) : null}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-4">
          <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
          {isCreate ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="admin-cu-userName">ชื่อ (UserName) *</Label>
                <Input
                  id="admin-cu-userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  maxLength={20}
                  required
                  autoComplete="off"
                  className={fieldInputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-cu-emp">รหัสพนักงาน (EmpCode)</Label>
                <Input
                  id="admin-cu-emp"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  maxLength={20}
                  placeholder="ถ้ามี — ต้องมีใน employee"
                  autoComplete="off"
                  className={fieldInputClass}
                />
              </div>

            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="admin-cu-userName-ro">ชื่อ (UserName)</Label>
                <Input
                  id="admin-cu-userName-ro"
                  readOnly
                  tabIndex={-1}
                  value={userName}
                  className="bg-muted cursor-default"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-cu-emp-ro">รหัสพนักงาน (EmpCode)</Label>
                <Input
                  id="admin-cu-emp-ro"
                  readOnly
                  tabIndex={-1}
                  value={empCode}
                  placeholder="—"
                  className="bg-muted cursor-default"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>ตู้ที่ใช้งานได้</Label>
            <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 max-h-52 overflow-y-auto space-y-2">
              {cabinetOptions.length === 0 ? (
                <p className="text-sm text-slate-500">ไม่พบรายการตู้ — โหลดจากเมนูจัดการตู้ก่อน</p>
              ) : (
                cabinetOptions.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-start gap-3 cursor-pointer rounded-md p-1.5 hover:bg-white"
                  >
                    <Checkbox
                      checked={selectedCabinetIds.has(c.id)}
                      onCheckedChange={(v) => toggleCabinet(c.id, v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug">
                      <span className="font-medium text-slate-800">
                        {c.cabinet_name || c.cabinet_code || `ตู้ #${c.id}`}
                      </span>
                      {c.cabinet_code ? (
                        <span className="text-slate-500"> · {c.cabinet_code}</span>
                      ) : null}
                      {c.stock_id != null ? (
                        <span className="block text-xs text-slate-500">stock_id: {c.stock_id}</span>
                      ) : (
                        <span className="block text-xs text-amber-700">ยังไม่มี stock_id — ตั้งในจัดการตู้ก่อน</span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || (isCreate && !userName.trim())}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  บันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
