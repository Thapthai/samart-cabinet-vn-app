'use client';

import { CheckCircle, RefreshCw, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupplyItem, ReturnReason } from '../types';

export const RETURN_REASON_OPTIONS: { value: ReturnReason; label: string }[] = [
  { value: 'UNWRAPPED_UNUSED', label: 'ยังไม่ได้แกะซอง / อยู่ในสภาพเดิม' },
  { value: 'EXPIRED', label: 'อุปกรณ์หมดอายุ' },
  { value: 'CONTAMINATED', label: 'อุปกรณ์มีการปนเปื้อน' },
  { value: 'DAMAGED', label: 'อุปกรณ์ชำรุด' },
];

export interface ReturnRow {
  item: SupplyItem;
  returnQty: number;
  returnReason: ReturnReason;
  returnNote: string;
}

interface ReturnEditableTableProps {
  rows: ReturnRow[];
  loading: boolean;
  onQtyChange: (itemId: number, qty: number) => void;
  onReasonChange: (itemId: number, reason: ReturnReason) => void;
  onNoteChange: (itemId: number, note: string) => void;
  onSubmit: () => void;
}

function qtyPending(item: SupplyItem): number {
  return (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0);
}

export default function ReturnEditableTable({
  rows,
  loading,
  onQtyChange,
  onReasonChange,
  onNoteChange,
  onSubmit,
}: ReturnEditableTableProps) {
  const hasAnyReturn = rows.some((r) => r.returnQty > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-emerald-100">
          <Edit3 className="h-4 w-4 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          ขั้นที่ 2: ปรับจำนวนและรายละเอียดการคืน แล้วกดบันทึก
        </h3>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
              <TableHead className="text-slate-600 font-medium">รหัส</TableHead>
              <TableHead className="text-slate-600 font-medium">ชื่อรายการ</TableHead>
              <TableHead className="text-right text-slate-600 font-medium w-16">เบิก</TableHead>
              <TableHead className="text-right text-slate-600 font-medium w-16">ใช้แล้ว</TableHead>
              <TableHead className="text-right text-slate-600 font-medium w-16">คืนแล้ว</TableHead>
              <TableHead className="text-right text-slate-600 font-medium w-20">คืนได้</TableHead>
              <TableHead className="text-slate-600 font-medium w-28">จำนวนที่คืน</TableHead>
              <TableHead className="text-slate-600 font-medium min-w-[180px]">สาเหตุ</TableHead>
              <TableHead className="text-slate-600 font-medium min-w-[140px]">หมายเหตุ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                  ไม่มีรายการที่สามารถคืนได้ใน Usage นี้
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const maxQty = qtyPending(row.item);
                return (
                  <TableRow key={row.item.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                    <TableCell className="font-mono text-sm">
                      {row.item.order_item_code || row.item.supply_code || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px]">
                      {row.item.order_item_description || row.item.supply_name || '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.item.qty ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{row.item.qty_used_with_patient ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{row.item.qty_returned_to_cabinet ?? 0}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-700">{maxQty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={maxQty}
                        value={row.returnQty}
                        onChange={(e) => onQtyChange(row.item.id, parseInt(e.target.value, 10) || 0)}
                        className="w-20 rounded-lg border-slate-200 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.returnReason}
                        onValueChange={(v) => onReasonChange(row.item.id, v as ReturnReason)}
                      >
                        <SelectTrigger className="w-full min-w-[180px] rounded-lg border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RETURN_REASON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.returnNote}
                        onChange={(e) => onNoteChange(row.item.id, e.target.value)}
                        placeholder="หมายเหตุ (ถ้ามี)"
                        className="min-w-[120px] rounded-lg border-slate-200"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && (
        <Button
          onClick={onSubmit}
          disabled={loading || !hasAnyReturn}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-6"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              บันทึกการคืน
            </>
          )}
        </Button>
      )}
    </div>
  );
}
