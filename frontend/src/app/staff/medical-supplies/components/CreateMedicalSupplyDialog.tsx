'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Plus, Trash2, Package } from 'lucide-react';

interface CreateMedicalSupplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  hn: string;
  an?: string;
  patient_name: string;
  ward?: string;
  doctor_name?: string;
  twu?: string;
  update?: string;
  print_location?: string;
  items: {
    item_name: string;
    quantity: number;
    unit?: string;
    price?: number;
  }[];
}

export default function CreateMedicalSupplyDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateMedicalSupplyDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      hn: '',
      an: '',
      patient_name: '',
      ward: '',
      doctor_name: '',
      twu: '',
      update: '',
      print_location: '',
      items: [{ item_name: '', quantity: 1, unit: 'Each', price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      toast.success('บันทึกการใช้เวชภัณฑ์เรียบร้อยแล้ว');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>บันทึกการใช้เวชภัณฑ์</DialogTitle>
          <DialogDescription>
            บันทึกข้อมูลการใช้เวชภัณฑ์ของผู้ป่วย
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                ข้อมูลผู้ป่วย
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hn"
                  rules={{ required: 'กรุณากรอก HN' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HN *</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น 20-010334" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="an"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AN</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น EZ5-000584" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patient_name"
                  rules={{ required: 'กรุณากรอกชื่อคนไข้' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อคนไข้ *</FormLabel>
                      <FormControl>
                        <Input placeholder="ชื่อ-นามสกุล" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น Emergency" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>แพทย์ผู้สั่ง</FormLabel>
                      <FormControl>
                        <Input placeholder="ชื่อแพทย์" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TWU</FormLabel>
                      <FormControl>
                        <Input placeholder="แผนก/จุดที่ Print" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  รายการเวชภัณฑ์
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ item_name: '', quantity: 1, unit: 'Each', price: 0 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มรายการ
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.item_name`}
                        rules={{ required: 'กรุณากรอกชื่อเวชภัณฑ์' }}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>ชื่อเวชภัณฑ์ *</FormLabel>
                            <FormControl>
                              <Input placeholder="เช่น JELCO IV NO,18" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        rules={{ required: 'กรุณากรอกจำนวน', min: { value: 1, message: 'จำนวนต้องมากกว่า 0' } }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>จำนวน *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>หน่วย</FormLabel>
                            <FormControl>
                              <Input placeholder="Each" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

