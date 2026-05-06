import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '../common/StatusBadge';
import type { ComparisonItem } from '../../types';
import type { Item } from '@/types/item';
import QtyWithMainUnit from '@/components/QtyWithMainUnit';

interface ComparisonDetailsCardProps {
  item: ComparisonItem;
}

export function ComparisonDetailsCard({ item }: ComparisonDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>รายละเอียดการเปรียบเทียบ</CardTitle>
        <CardDescription>ข้อมูลเปรียบเทียบระหว่างการเบิกและการใช้งานจริง</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">จำนวนเบิกทั้งหมด</p>
              <div className="mt-1 flex text-blue-600">
                <QtyWithMainUnit
                  className="[&>span:first-child]:text-2xl [&>span:first-child]:font-bold [&>span:last-child]:text-sm"
                  qty={item.total_dispensed}
                  item={item as unknown as Item}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">จำนวนที่เบิกจากคลัง</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">จำนวนใช้งานจริง</p>
              <div className="mt-1 flex text-green-600">
                <QtyWithMainUnit
                  className="[&>span:first-child]:text-2xl [&>span:first-child]:font-bold [&>span:last-child]:text-sm"
                  qty={item.total_used}
                  item={item as unknown as Item}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">จำนวนที่บันทึกใช้กับผู้ป่วย</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">ผลต่าง</p>
              <p className={`text-2xl font-bold ${
                item.difference === 0 ? 'text-green-600' :
                item.difference > 0 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {item.difference > 0 && '+'}
                {item.difference}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {item.difference === 0 && 'ตรงกัน'}
                {item.difference > 0 && 'เบิกมากกว่าที่ใช้'}
                {item.difference < 0 && 'ใช้มากกว่าที่เบิก'}
              </p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">สถานะการเปรียบเทียบ</h3>
            <div className="flex items-center gap-2">
              <StatusBadge status={item.status} />
              <span className="text-sm text-gray-600">
                {item.status === 'MATCHED' && 'จำนวนเบิกและใช้ตรงกัน'}
                {item.status === 'DISPENSED_NOT_USED' && 'มีการเบิกแต่ยังไม่มีการบันทึกการใช้'}
                {item.status === 'USED_WITHOUT_DISPENSE' && 'มีการใช้แต่ไม่มีการเบิก'}
                {item.status === 'DISPENSE_EXCEEDS_USAGE' && 'จำนวนเบิกมากกว่าจำนวนใช้'}
                {item.status === 'USAGE_EXCEEDS_DISPENSE' && 'จำนวนใช้มากกว่าจำนวนเบิก'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
