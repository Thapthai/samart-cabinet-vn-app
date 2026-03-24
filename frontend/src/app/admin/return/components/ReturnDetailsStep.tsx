import { CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SupplyItem, ReturnReason } from '../types';

interface ReturnDetailsStepProps {
  selectedSupplyItem: SupplyItem | null;
  returnQty: number;
  returnReason: ReturnReason;
  returnNote: string;
  loading: boolean;
  onQtyChange: (qty: number) => void;
  onReasonChange: (reason: ReturnReason) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}

export default function ReturnDetailsStep({
  selectedSupplyItem,
  returnQty,
  returnReason,
  returnNote,
  loading,
  onQtyChange,
  onReasonChange,
  onNoteChange,
  onSubmit,
}: ReturnDetailsStepProps) {
  if (!selectedSupplyItem) return null;

  const qtyPending = (selectedSupplyItem.qty || 0) - (selectedSupplyItem.qty_used_with_patient || 0) - (selectedSupplyItem.qty_returned_to_cabinet || 0);

  return (
    <div className="space-y-4 border-t pt-4">
      <Label className="text-base font-semibold">ขั้นตอนที่ 3: ระบุรายละเอียดการคืน</Label>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="return-qty">จำนวนที่ต้องการคืน</Label>
          <Input
            id="return-qty"
            type="number"
            min="1"
            max={qtyPending}
            value={returnQty}
            onChange={(e) => onQtyChange(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-gray-500">
            จำนวนที่สามารถคืนได้: {qtyPending}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-reason">สาเหตุ</Label>
          <Select
            value={returnReason}
            onValueChange={(value) => {
              onReasonChange(value as ReturnReason);
              if (value !== 'OTHER') onNoteChange('');
            }}
          >
            <SelectTrigger className="h-auto min-h-9 w-full min-w-[220px] !w-full max-w-none whitespace-normal [&_[data-slot=select-value]]:line-clamp-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
              <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
              <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
              <SelectItem value="OTHER">อื่นๆ (ระบุหมายเหตุ เช่น หาย)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="return-note"
            className={returnReason !== 'OTHER' ? 'text-muted-foreground' : undefined}
          >
            หมายเหตุ
          </Label>
          <Textarea
            id="return-note"
            value={returnReason === 'OTHER' ? returnNote : ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder={
              returnReason === 'OTHER' ? 'เช่น หาย' : 'เลือก "อื่นๆ" ด้านบนเพื่อกรอกหมายเหตุ'
            }
            rows={3}
            disabled={returnReason !== 'OTHER'}
            className="min-h-[4.5rem] resize-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <Button
          onClick={onSubmit}
          disabled={loading || !returnQty || returnQty < 1}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              บันทึกการคืน
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
