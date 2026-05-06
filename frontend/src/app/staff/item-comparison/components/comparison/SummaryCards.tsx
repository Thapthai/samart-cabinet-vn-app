import { Card, CardContent } from '@/components/ui/card';
import type { ComparisonItem, SummaryData } from '../../types';
import type { Item } from '@/types/item';
import QtyWithMainUnit from '@/components/QtyWithMainUnit';

interface SummaryCardsProps {
  selectedItem: ComparisonItem;
  summary: SummaryData;
}

export function SummaryCards({ selectedItem, summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">จำนวนเบิก</p>
            <div className="mt-1 flex justify-center text-blue-600">
              <QtyWithMainUnit
                className="[&>span:first-child]:text-3xl [&>span:first-child]:font-bold [&>span:last-child]:text-sm"
                qty={selectedItem.total_dispensed}
                item={selectedItem as unknown as Item}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">จำนวนใช้</p>
            <div className="mt-1 flex justify-center text-green-600">
              <QtyWithMainUnit
                className="[&>span:first-child]:text-3xl [&>span:first-child]:font-bold [&>span:last-child]:text-sm"
                qty={selectedItem.total_used}
                item={selectedItem as unknown as Item}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">ผลต่าง</p>
            <p className={`text-3xl font-bold ${
              selectedItem.difference === 0 ? 'text-green-600' :
              selectedItem.difference > 0 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {selectedItem.difference > 0 && '+'}
              {selectedItem.difference}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">รายการทั้งหมด</p>
            <p className="text-3xl font-bold text-purple-600">{summary.total}</p>
            <p className="text-xs text-gray-400 mt-1">
              ตรงกัน: {summary.matched} | ไม่ตรง: {summary.notMatched}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
