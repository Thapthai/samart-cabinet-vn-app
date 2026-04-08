'use client';

import { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { WillReturnItem } from '../types';

export interface StaffReturnFormSubmitParams {
  itemCode: string;
  stockId: number | null;
  qty: number;
  reason: string;
  note: string;
}

interface StaffReturnFormTabProps {
  willReturnItems: WillReturnItem[];
  loadingWillReturn: boolean;
  onSubmit: (params: StaffReturnFormSubmitParams) => Promise<void>;
  isSubmitting: boolean;
}

function getRowKey(item: WillReturnItem): string {
  return `${item.ItemCode}-${item.StockID ?? 0}`;
}

const DEFAULT_FORM = { qty: 1, reason: 'EXPIRED', note: '' };

export default function StaffReturnFormTab({
  willReturnItems,
  loadingWillReturn,
  onSubmit,
  isSubmitting,
}: StaffReturnFormTabProps) {
  const [formByKey, setFormByKey] = useState<Record<string, { qty: number; reason: string; note: string }>>({});
  const [submittingRowKey, setSubmittingRowKey] = useState<string | null>(null);

  const filteredItems = useMemo(() => willReturnItems, [willReturnItems]);

  const getForm = (item: WillReturnItem) => formByKey[getRowKey(item)] ?? DEFAULT_FORM;

  const setRowForm = (item: WillReturnItem, updates: Partial<{ qty: number; reason: string; note: string }>) => {
    const key = getRowKey(item);
    setFormByKey((prev) => ({
      ...prev,
      [key]: { ...DEFAULT_FORM, ...prev[key], ...updates },
    }));
  };

  const handleSubmitRow = async (item: WillReturnItem) => {
    const key = getRowKey(item);
    const form = getForm(item);
    const maxQty = item.max_available_qty ?? 0;
    const qtyToSubmit = Math.min(Math.max(1, form.qty), maxQty);
    if (maxQty < 1 || qtyToSubmit < 1) return;

    try {
      setSubmittingRowKey(key);
      await onSubmit({
        itemCode: item.ItemCode,
        stockId: item.StockID ?? null,
        qty: qtyToSubmit,
        reason: form.reason,
        note: form.reason === 'OTHER' ? form.note : '',
      });
      setFormByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      // error handled by parent (toast)
    } finally {
      setSubmittingRowKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                แจ้งคืนอุปกรณ์ (แบบตาราง)
              </CardTitle>

            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4">
          {loadingWillReturn ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <span className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
              กำลังโหลดรายการ...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              ไม่มีรายการที่ต้องแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-12 text-center">ลำดับ</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead>ตู้ แผนก</TableHead>
                    <TableHead className="text-center min-w-[140px]">เบิก | ใช้แล้ว | สูงสุดแจ้งได้</TableHead>
                    <TableHead className="w-24 text-center">จำนวน</TableHead>
                    <TableHead className="w-48">สาเหตุ</TableHead>
                    <TableHead className="min-w-[160px]">หมายเหตุ (ถ้าเลือกอื่นๆ)</TableHead>
                    <TableHead className="w-28 text-center">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => {
                    const key = getRowKey(item);
                    const form = getForm(item);
                    const maxQty = item.max_available_qty ?? 0;
                    const isSubmittingRow = submittingRowKey === key;
                    const disabled = isSubmitting || isSubmittingRow || maxQty < 1;

                    return (
                      <TableRow key={key} className="align-middle">
                        <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{item.ItemCode}</code>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {item.itemname ?? item.ItemCode}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm whitespace-pre-line">
                          แผนก {item.department_name ?? '-'}
                          {'\n'}
                          ตู้ {item.cabinet_code || item.cabinet_name || '-'}
                        </TableCell>
                        <TableCell className="p-2 align-middle text-center">
                          <div className="inline-flex items-center justify-center gap-0 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 shadow-sm">
                            <span className="min-w-[2rem] text-center text-sm font-medium text-slate-700">{item.withdraw_qty ?? 0}</span>
                            <span className="h-4 w-px bg-slate-300" />
                            <span className="min-w-[2rem] text-center text-sm font-medium text-slate-700">{item.used_qty ?? 0}</span>
                            <span className="h-4 w-px bg-slate-300" />
                            <span className="min-w-[2rem] text-center text-sm font-semibold text-emerald-700">{maxQty}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={form.qty}
                            onChange={(e) =>
                              setRowForm(item, {
                                qty: Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)),
                              })
                            }
                            className="h-9 w-full text-center"
                          />
                        </TableCell>
                        <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={form.reason}
                            onValueChange={(v) =>
                              setRowForm(item, {
                                reason: v,
                                ...(v !== 'OTHER' ? { note: '' } : {}),
                              })
                            }
                          >
                            <SelectTrigger className="h-auto min-h-9 w-full min-w-[220px] !w-full max-w-none whitespace-normal border-slate-200 py-2 text-sm [&_[data-slot=select-value]]:line-clamp-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                              <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
                              <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
                              <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
                              <SelectItem value="OTHER">อื่นๆ (ระบุหมายเหตุ เช่น หาย)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={form.reason === 'OTHER' ? form.note : ''}
                            onChange={(e) => setRowForm(item, { note: e.target.value })}
                            placeholder={
                              form.reason === 'OTHER' ? 'เช่น หาย' : 'เลือก "อื่นๆ" เพื่อกรอก'
                            }
                            disabled={form.reason !== 'OTHER'}
                            className="h-9 w-full min-w-[160px] text-sm disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </TableCell>
                        <TableCell className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={disabled}
                            onClick={() => handleSubmitRow(item)}
                          >
                            {isSubmittingRow ? (
                              <>
                                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                กำลังบันทึก...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" />
                                แจ้งคืน
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
