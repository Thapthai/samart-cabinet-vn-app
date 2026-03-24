import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Dispatch, SetStateAction } from 'react';
import type { LogFilterState } from '../types';

type Props = {
  formFilters: LogFilterState;
  setFormFilters: Dispatch<SetStateAction<LogFilterState>>;
  onSearch: () => void;
  onReset: () => void;
};

export function LogsFiltersCard({ formFilters, setFormFilters, onSearch, onReset }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">ตัวกรอง</CardTitle>
        <CardDescription>กรองตามเลข HN, EN สถานะ หรือช่วงวันที่</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">HN</Label>
            <Input
              placeholder="เลข HN"
              value={formFilters.patient_hn}
              onChange={(e) => setFormFilters((p) => ({ ...p, patient_hn: e.target.value }))}
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">EN</Label>
            <Input
              placeholder="เลข EN"
              value={formFilters.en}
              onChange={(e) => setFormFilters((p) => ({ ...p, en: e.target.value }))}
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">สถานะ</Label>
            <Select
              value={formFilters.log_status || 'all'}
              onValueChange={(v) =>
                setFormFilters((p) => ({ ...p, log_status: v === 'all' ? '' : v }))
              }
            >
              <SelectTrigger className="h-9 sm:h-10 w-full">
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">วันที่เริ่ม</Label>
            <DatePickerBE
              value={formFilters.startDate}
              onChange={(v) => setFormFilters((p) => ({ ...p, startDate: v }))}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">วันที่สิ้นสุด</Label>
            <DatePickerBE
              value={formFilters.endDate}
              onChange={(v) => setFormFilters((p) => ({ ...p, endDate: v }))}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
              className="h-9 sm:h-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end lg:flex-col lg:flex-row lg:col-span-1">
            <Button onClick={onSearch} className="gap-2 h-9 sm:h-10 order-1" size="sm">
              <Search className="h-4 w-4 shrink-0" />
              ค้นหา
            </Button>
            <Button variant="outline" onClick={onReset} className="gap-2 h-9 sm:h-10 order-2" size="sm">
              <RefreshCw className="h-4 w-4 shrink-0" />
              ล้าง
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
