import { RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { SupplyItem } from '../types';

interface SupplyItemSelectStepProps {
  supplyItems: SupplyItem[];
  selectedSupplyItemId: number | null;
  selectedSupplyItem: SupplyItem | null;
  loading: boolean;
  onSelect: (itemId: number) => void;
}

export default function SupplyItemSelectStep({
  supplyItems,
  selectedSupplyItemId,
  selectedSupplyItem,
  loading,
  onSelect,
}: SupplyItemSelectStepProps) {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="supply-item-select" className="text-base font-semibold">
          ขั้นตอนที่ 2: เลือก SupplyUsageItem
        </Label>
        {loading && (
          <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      <Select
        value={selectedSupplyItemId?.toString() || ''}
        onValueChange={(value) => onSelect(parseInt(value))}
        disabled={loading || supplyItems.length === 0}
      >
        <SelectTrigger id="supply-item-select" className="w-full">
          <SelectValue placeholder="เลือก SupplyUsageItem" />
        </SelectTrigger>
        <SelectContent>
          {supplyItems.length === 0 ? (
            <SelectItem value="no-items" disabled>
              ไม่พบรายการที่สามารถคืนได้
            </SelectItem>
          ) : (
            supplyItems.map((item) => {
              const qtyPending = (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0);
              return (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.order_item_code || item.supply_code} - {item.order_item_description || item.supply_name} (คืนได้: {qtyPending})
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      {selectedSupplyItem && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-semibold text-green-900">รหัส:</span> {selectedSupplyItem.order_item_code || selectedSupplyItem.supply_code || '-'}
            </div>
            <div>
              <span className="font-semibold text-green-900">ชื่อ:</span> {selectedSupplyItem.order_item_description || selectedSupplyItem.supply_name || '-'}
            </div>
            <div>
              <span className="font-semibold text-green-900">จำนวนที่เบิก:</span> {selectedSupplyItem.qty || 0}
            </div>
            <div>
              <span className="font-semibold text-green-900">ใช้แล้ว:</span> {selectedSupplyItem.qty_used_with_patient || 0}
            </div>
            <div>
              <span className="font-semibold text-green-900">คืนแล้ว:</span> {selectedSupplyItem.qty_returned_to_cabinet || 0}
            </div>
            <div>
              <span className="font-semibold text-green-900">คืนได้:</span>
              <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 border-green-300">
                {(selectedSupplyItem.qty || 0) - (selectedSupplyItem.qty_used_with_patient || 0) - (selectedSupplyItem.qty_returned_to_cabinet || 0)}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
