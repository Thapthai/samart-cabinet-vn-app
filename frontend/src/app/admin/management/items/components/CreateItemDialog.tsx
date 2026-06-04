import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemsApi, unitsApi, departmentApi, type UnitRow } from '@/lib/api';
import { itemSchema, type ItemFormData } from '@/lib/validations';
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
import { Textarea } from '@/components/ui/textarea';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import SearchableSelect from '@/app/admin/cabinet-departments/components/SearchableSelect';
import {
  buildDepartmentSelectOptions,
  departmentInitialDisplay,
  selectValueToDepartmentId,
  type DeptRow,
} from './itemHelpers';

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  onSuccess: () => void;
}

export default function CreateItemDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: CreateItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitInitialDisplay, setUnitInitialDisplay] = useState<
    { label: string; subLabel?: string } | undefined
  >(undefined);
  const [subUnitInitialDisplay, setSubUnitInitialDisplay] = useState<
    { label: string; subLabel?: string } | undefined
  >(undefined);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptInitialDisplay, setDeptInitialDisplay] = useState<
    { label: string; subLabel?: string } | undefined
  >({ label: 'ทุกแผนก', subLabel: 'DepartmentID = 0' });
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

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      itemcode: '',
      itemname: '',
      Barcode: '',
      Description: '',
      CostPrice: 0,
      stock_balance: 0,
      item_status: 0,
      IsCancel: 0,
      DepartmentID: 0,
      UnitID: undefined,
      SubUnitID: undefined,
      SubUnitQty: undefined,
    },
  });

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

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      form.reset();
      setUnitInitialDisplay(undefined);
      setSubUnitInitialDisplay(undefined);
      setDeptInitialDisplay({ label: 'ทุกแผนก', subLabel: 'DepartmentID = 0' });
    }
  }, [open, form]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      setLoading(true);
      const { UnitID, SubUnitID, SubUnitQty, IsCancel, DepartmentID, ...rest } = data;
      const response = await itemsApi.create({
        ...rest,
        ...(UnitID != null && UnitID > 0 ? { UnitID } : {}),
        ...(SubUnitID != null && SubUnitID > 0 ? { SubUnitID } : {}),
        ...(SubUnitQty != null && SubUnitQty >= 1 ? { SubUnitQty } : {}),
        IsNormal: '1',
        IsStock: true,
        IsCancel: IsCancel ?? 0,
        DepartmentID: DepartmentID ?? 0,
        item_status: (IsCancel ?? 0) === 1 ? 1 : 0,
      });

      if (response.success) {
        toast.success('เพิ่มอุปกรณ์เรียบร้อยแล้ว');
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถเพิ่มอุปกรณ์ได้');
      }
    } catch (error: any) {
      console.error('Create item error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-2xl min-w-0">
        <DialogHeader>
          <DialogTitle>เพิ่มอุปกรณ์ใหม่</DialogTitle>
          <DialogDescription>
            เพิ่มเวชภัณฑ์หรืออุปกรณ์ใหม่เข้าสู่ระบบ
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="relative grid min-w-0 gap-4 overflow-x-hidden py-4">
            {/* รหัสสินค้า */}
            <FormField
              control={form.control}
              name="itemcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสสินค้า *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น MED2024001"
                      maxLength={25}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ชื่ออุปกรณ์ */}
            <FormField
              control={form.control}
              name="itemname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่ออุปกรณ์ *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น ชุดเครื่องมือผ่าตัดใหญ่"
                      maxLength={255}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="IsCancel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>สถานะ</FormLabel>
                  <Select
                    value={String(field.value ?? 0)}
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">ใช้งาน (IsCancel = 0)</SelectItem>
                      <SelectItem value="1">ปิดการใช้งาน (IsCancel = 1)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="DepartmentID"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SearchableSelect
                      positionMode="floating"
                      label="แผนกที่ใช้ Item นี้"
                      placeholder="เลือกแผนก"
                      value={field.value != null && field.value > 0 ? String(field.value) : '0'}
                      onValueChange={(value) => {
                        const id = selectValueToDepartmentId(value);
                        field.onChange(id);
                        setDeptInitialDisplay(departmentInitialDisplay(id, departments));
                      }}
                      options={buildDepartmentSelectOptions(departments)}
                      loading={loadingDepts}
                      onSearch={loadDepartments}
                      searchPlaceholder="ค้นหาชื่อแผนก..."
                      initialDisplay={deptInitialDisplay}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    &quot;ทุกแผนก&quot; (DepartmentID = 0) = ใช้ได้ทุกแผนก
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Barcode */}
            <FormField
              control={form.control}
              name="Barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>บาร์โค้ด</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น 8859876543210"
                      maxLength={50}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="UnitID"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SearchableSelect
                      positionMode="floating"
                      label="หน่วย (stock / ธุรกรรม)"
                      placeholder="เช่น กล่อง — เลือกจากตาราง unit"
                      value={field.value != null && field.value > 0 ? String(field.value) : ''}
                      onValueChange={(value) => {
                        field.onChange(value === '' ? undefined : parseInt(value, 10));
                        if (!value.trim()) {
                          setUnitInitialDisplay(undefined);
                          return;
                        }
                        const id = parseInt(value, 10);
                        const row = unitRows.find((u) => u.id === id);
                        if (row) {
                          setUnitInitialDisplay({
                            label: row.unitName || `หน่วย #${id}`,
                            subLabel: `ID ${id}`,
                          });
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="SubUnitID"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SearchableSelect
                      positionMode="floating"
                      label="หน่วยการเบิก (แสดงผลเท่านั้น)"
                      placeholder="เช่น เม็ด — ไม่ใช้คำนวณ stock"
                      value={field.value != null && field.value > 0 ? String(field.value) : ''}
                      onValueChange={(value) => {
                        field.onChange(value === '' ? undefined : parseInt(value, 10));
                        if (!value.trim()) {
                          setSubUnitInitialDisplay(undefined);
                          return;
                        }
                        const id = parseInt(value, 10);
                        const row = unitRows.find((u) => u.id === id);
                        if (row) {
                          setSubUnitInitialDisplay({
                            label: row.unitName || `หน่วย #${id}`,
                            subLabel: `ID ${id}`,
                          });
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="SubUnitQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>จำนวนหน่วยการเบิกต่อ 1 หน่วย</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="เช่น 18 (เม็ดต่อกล่อง)"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          field.onChange(undefined);
                          return;
                        }
                        const n = parseInt(v, 10);
                        field.onChange(Number.isFinite(n) ? n : undefined);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    ใช้แสดงเท่านั้น (เช่น ฉลาก) — ไม่แปลง stock
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* คำอธิบาย */}
            <FormField
              control={form.control}
              name="Description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คำอธิบาย</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="รายละเอียดของอุปกรณ์..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึกอุปกรณ์'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

