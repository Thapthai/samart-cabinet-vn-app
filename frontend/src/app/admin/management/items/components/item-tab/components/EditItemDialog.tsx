import { useState, useEffect, useRef, useCallback } from 'react';
import { itemsApi, unitsApi, departmentApi, type UnitRow } from '@/lib/api';
import type { UpdateItemDto } from '@/types/item';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Item } from '@/types/item';
import { Loader2, AlertCircle } from 'lucide-react';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type DeptRow } from './itemHelpers';
import ItemDepartmentsPicker from '@/app/admin/management/items/components/item-tab/components/ItemDepartmentsPicker';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess: () => void;
}

export default function EditItemDialog({ open, onOpenChange, item, onSuccess }: EditItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itemname, setItemname] = useState('');
  const [unitIdStr, setUnitIdStr] = useState('');
  const [unitInitialDisplay, setUnitInitialDisplay] = useState<{ label: string; subLabel?: string } | undefined>(
    undefined,
  );
  const [subUnitIdStr, setSubUnitIdStr] = useState('');
  const [subUnitQtyStr, setSubUnitQtyStr] = useState('');
  const [subUnitInitialDisplay, setSubUnitInitialDisplay] = useState<{ label: string; subLabel?: string } | undefined>(
    undefined,
  );
  const [error, setError] = useState('');
  const [isCancel, setIsCancel] = useState('0');
  const [deptValues, setDeptValues] = useState<string[]>(['', '', '']);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const unitRequestSeq = useRef(0);

  const loadUnits = useCallback(async (keyword?: string) => {
    const seq = ++unitRequestSeq.current;
    setLoadingUnits(true);
    try {
      const res = await unitsApi.getAll({
        page: 1,
        limit: 50,
        keyword: keyword?.trim() || undefined,
      });
      if (unitRequestSeq.current !== seq) return;
      const list = Array.isArray(res?.data) ? res.data : [];
      setUnitRows(list);
    } catch {
      if (unitRequestSeq.current === seq) setUnitRows([]);
    } finally {
      if (unitRequestSeq.current === seq) setLoadingUnits(false);
    }
  }, []);

  const loadDepartments = useCallback(async (keyword?: string) => {
    setLoadingDepts(true);
    try {
      const res = await departmentApi.getAll({ limit: 100, keyword: keyword?.trim() || undefined });
      if (res.success && Array.isArray(res.data)) {
        setDepartments(res.data as DeptRow[]);
      }
    } catch {
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadUnits();
      void loadDepartments();
    }
  }, [open, loadUnits, loadDepartments]);

  useEffect(() => {
    if (!open || !item) return;

    setItemname(item.itemname || '');
    setError('');
    setIsCancel(item.IsCancel === 1 ? '1' : '0');
    setUnitIdStr(item.UnitID != null && item.UnitID > 0 ? String(item.UnitID) : '');
    setSubUnitIdStr(item.SubUnitID != null && item.SubUnitID > 0 ? String(item.SubUnitID) : '');
    setSubUnitQtyStr(item.SubUnitQty != null && item.SubUnitQty > 0 ? String(item.SubUnitQty) : '');
    setDeptValues(['', '', '']);

    let cancelled = false;
    void (async () => {
      try {
        const dres = await itemsApi.getDepartments(item.itemcode);
        if (!cancelled && dres.success && Array.isArray(dres.data)) {
          const ids = dres.data.filter((n) => n != null && n > 0).slice(0, 3);
          setDeptValues([0, 1, 2].map((i) => (ids[i] != null ? String(ids[i]) : '')));
        }
      } catch {
        /* keep empty */
      }

      const uid = item.UnitID;
      if (uid != null && uid > 0) {
        try {
          const r = await unitsApi.getById(uid);
          if (cancelled) return;
          if (r.success && r.data) {
            setUnitInitialDisplay({
              label: r.data.unitName || `หน่วย #${uid}`,
              subLabel: `ID ${uid}`,
            });
          } else {
            setUnitInitialDisplay({ label: `หน่วย #${uid}`, subLabel: `ID ${uid}` });
          }
        } catch {
          if (!cancelled) setUnitInitialDisplay({ label: `หน่วย #${uid}`, subLabel: `ID ${uid}` });
        }
      } else {
        setUnitInitialDisplay(undefined);
      }

      const sid = item.SubUnitID;
      if (sid != null && sid > 0) {
        try {
          const r = await unitsApi.getById(sid);
          if (cancelled) return;
          if (r.success && r.data) {
            setSubUnitInitialDisplay({
              label: r.data.unitName || `หน่วย #${sid}`,
              subLabel: `ID ${sid}`,
            });
          } else {
            setSubUnitInitialDisplay({ label: `หน่วย #${sid}`, subLabel: `ID ${sid}` });
          }
        } catch {
          if (!cancelled) setSubUnitInitialDisplay({ label: `หน่วย #${sid}`, subLabel: `ID ${sid}` });
        }
      } else {
        setSubUnitInitialDisplay(undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) {
      toast.error('ไม่พบข้อมูลสินค้า');
      return;
    }

    if (!itemname || itemname.trim().length < 2) {
      setError('ชื่ออุปกรณ์ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }

    if (itemname.length > 255) {
      setError('ชื่ออุปกรณ์ต้องไม่เกิน 255 ตัวอักษร');
      return;
    }

    if (subUnitQtyStr.trim() && !subUnitIdStr.trim()) {
      setError('เลือกหน่วยการเบิกเมื่อระบุจำนวนต่อหลัก');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const department_ids = [
        ...new Set(
          deptValues
            .map((v) => parseInt(v, 10))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      ].slice(0, 3);
      const payload: UpdateItemDto = {
        itemname: itemname.trim(),
        IsCancel: isCancel === '1' ? 1 : 0,
        DepartmentID: department_ids[0] ?? 0,
        department_ids,
      };
      if (unitIdStr.trim()) {
        const n = parseInt(unitIdStr, 10);
        if (!Number.isNaN(n) && n > 0) {
          payload.UnitID = n;
        }
      }
      if (subUnitIdStr.trim()) {
        const n = parseInt(subUnitIdStr, 10);
        if (!Number.isNaN(n) && n > 0) {
          payload.SubUnitID = n;
        }
      } else {
        payload.SubUnitID = null;
      }
      const qt = subUnitQtyStr.trim();
      if (qt) {
        const n = parseInt(qt, 10);
        if (!Number.isNaN(n) && n >= 1) {
          payload.SubUnitQty = n;
        }
      } else {
        payload.SubUnitQty = null;
      }

      const response = await itemsApi.update(item.itemcode, payload);

      if (response.success) {
        toast.success('บันทึกข้อมูลสินค้าเรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขสินค้าได้');
      }
    } catch (error: unknown) {
      console.error('Update item error:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'เกิดข้อผิดพลาดในการแก้ไขสินค้า');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-2xl min-w-0">
        <DialogHeader>
          <DialogTitle>แก้ไขสินค้า (Master)</DialogTitle>
          <DialogDescription>
            แก้ไขชื่อ สถานะ แผนก หน่วย และหน่วยการเบิก: {item?.itemcode || ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="relative grid min-w-0 gap-4 overflow-x-hidden py-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="text-sm">
                <span className="text-gray-600">รหัส: </span>
                <code className="rounded bg-white px-2 py-1 text-xs">{item?.itemcode}</code>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div>
              <Label>สถานะ</Label>
              <Select value={isCancel} onValueChange={setIsCancel} disabled={loading}>
                <SelectTrigger className={cn('mt-1 w-full', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">ใช้งาน</SelectItem>
                  <SelectItem value="1">ปิดการใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ItemDepartmentsPicker
              departments={departments}
              loading={loadingDepts}
              onSearch={loadDepartments}
              values={deptValues}
              onChange={(index, value) =>
                setDeptValues((prev) => {
                  const next = [...prev];
                  next[index] = value;
                  return next;
                })
              }
            />

            <div>
              <Label htmlFor="edit-item-itemname">
                ชื่ออุปกรณ์ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-item-itemname"
                type="text"
                placeholder="กรอกชื่ออุปกรณ์..."
                value={itemname}
                onChange={(e) => {
                  setItemname(e.target.value);
                  setError('');
                }}
                maxLength={255}
                disabled={loading}
                className={cn('mt-1', fieldInputClass)}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">ความยาว: {itemname.length}/255 ตัวอักษร</p>
            </div>

            <SearchableSelect
              positionMode="floating"
              label="หน่วย (stock / ธุรกรรม)"
              placeholder="เลือกหน่วย"
              value={unitIdStr}
              onValueChange={(value) => {
                setUnitIdStr(value);
                if (value.trim()) {
                  const id = parseInt(value, 10);
                  const row = unitRows.find((u) => u.id === id);
                  if (row) {
                    setUnitInitialDisplay({
                      label: row.unitName || `หน่วย #${id}`,
                      subLabel: `ID ${id}`,
                    });
                  }
                } else {
                  setUnitInitialDisplay(undefined);
                }
              }}
              options={unitRows.map((u) => ({
                value: String(u.id),
                label: u.unitName || `หน่วย #${u.id}`,
                subLabel: `ID ${u.id}`,
              }))}
              loading={loadingUnits}
              onSearch={loadUnits}
              searchPlaceholder="ค้นหาชื่อหน่วย..."
              initialDisplay={unitInitialDisplay}
            />

            <SearchableSelect
              positionMode="floating"
              label="หน่วยการเบิก (แสดงผลเท่านั้น)"
              placeholder="เช่น เม็ด"
              value={subUnitIdStr}
              onValueChange={(value) => {
                setSubUnitIdStr(value);
                if (value.trim()) {
                  const id = parseInt(value, 10);
                  const row = unitRows.find((u) => u.id === id);
                  if (row) {
                    setSubUnitInitialDisplay({
                      label: row.unitName || `หน่วย #${id}`,
                      subLabel: `ID ${id}`,
                    });
                  }
                } else {
                  setSubUnitInitialDisplay(undefined);
                }
              }}
              options={unitRows.map((u) => ({
                value: String(u.id),
                label: u.unitName || `หน่วย #${u.id}`,
                subLabel: `ID ${u.id}`,
              }))}
              loading={loadingUnits}
              onSearch={loadUnits}
              searchPlaceholder="ค้นหาชื่อหน่วย..."
              initialDisplay={subUnitInitialDisplay}
            />

            <div>
              <Label htmlFor="edit-item-subunit-qty">จำนวนหน่วยการเบิกต่อ 1 หน่วย</Label>
              <Input
                id="edit-item-subunit-qty"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="เช่น 18"
                value={subUnitQtyStr}
                onChange={(e) => setSubUnitQtyStr(e.target.value)}
                disabled={loading}
                className={cn('mt-1', fieldInputClass)}
              />
              <p className="mt-1 text-xs text-muted-foreground">แสดงผลเท่านั้น — ไม่แปลง stock</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || !itemname.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
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
