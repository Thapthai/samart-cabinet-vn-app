import { useState, useEffect, useRef, useCallback } from 'react';
import { itemsApi, unitsApi, type UnitRow } from '@/lib/api';
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
import SearchableSelect from '@/app/admin/cabinet-departments/components/SearchableSelect';

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
  const [error, setError] = useState('');
  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
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

  useEffect(() => {
    if (!open || !item) return;

    setItemname(item.itemname || '');
    setError('');

    const uid = item.UnitID;
    if (uid != null && uid > 0) {
      setUnitIdStr(String(uid));
      let cancelled = false;
      void (async () => {
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
      })();
      return () => {
        cancelled = true;
      };
    }

    setUnitIdStr('');
    setUnitInitialDisplay(undefined);
    return undefined;
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) {
      toast.error('ไม่พบข้อมูลสินค้า');
      return;
    }

    if (!itemname || itemname.trim().length < 2) {
      setError('ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }

    if (itemname.length > 255) {
      setError('ชื่อสินค้าต้องไม่เกิน 255 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload: UpdateItemDto = {
        itemname: itemname.trim(),
      };
      if (unitIdStr.trim()) {
        const n = parseInt(unitIdStr, 10);
        if (!Number.isNaN(n) && n > 0) {
          payload.UnitID = n;
        }
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
          <DialogDescription>แก้ไขชื่อและหน่วยนับ: {item?.itemcode || ''}</DialogDescription>
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
              <Label htmlFor="edit-item-itemname">
                ชื่อสินค้า <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-item-itemname"
                type="text"
                placeholder="กรอกชื่อสินค้า..."
                value={itemname}
                onChange={(e) => {
                  setItemname(e.target.value);
                  setError('');
                }}
                maxLength={255}
                disabled={loading}
                className="mt-1"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">ความยาว: {itemname.length}/255 ตัวอักษร</p>
            </div>

            <SearchableSelect
              positionMode="floating"
              label="หน่วยนับ (Unit)"
              placeholder="เลือกหน่วย (ค้นหาได้)"
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
