import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemsApi, unitsApi, type UnitRow } from '@/lib/api';
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
import { toast } from 'sonner';
import SearchableSelect from '@/app/admin/cabinet-departments/components/SearchableSelect';

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
      UnitID: undefined,
    },
  });

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      form.reset();
      setUnitInitialDisplay(undefined);
    }
  }, [open, form]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      setLoading(true);
      const { UnitID, ...rest } = data;
      const response = await itemsApi.create({
        ...rest,
        ...(UnitID != null && UnitID > 0 ? { UnitID } : {}),
        IsNormal: '1',
        IsStock: true,
        item_status: data.item_status || 0,
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

            {/* ชื่อสินค้า */}
            <FormField
              control={form.control}
              name="itemname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อสินค้า *</FormLabel>
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
                      label="หน่วยนับ (Unit)"
                      placeholder="เลือกหน่วย (ค้นหาได้)"
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

            <div className="grid grid-cols-2 gap-4">
              {/* ราคาทุน */}
              <FormField
                control={form.control}
                name="CostPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาทุน</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* จำนวนในสต็อก */}
              <FormField
                control={form.control}
                name="stock_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนในสต็อก</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* คำอธิบาย */}
            <FormField
              control={form.control}
              name="Description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คำอธิบาย</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="รายละเอียดของสินค้า..."
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
                {loading ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

