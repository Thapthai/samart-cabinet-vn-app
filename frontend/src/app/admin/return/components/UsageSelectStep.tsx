import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Usage } from '../types';

interface UsageSelectStepProps {
  usages: Usage[];
  selectedUsageId: number | null;
  loading: boolean;
  onSelect: (usageId: number) => void;
  onRefresh: () => void;
  formatDate: (dateString: string) => string;
}

export default function UsageSelectStep({
  usages,
  selectedUsageId,
  loading,
  onSelect,
  onRefresh,
  formatDate,
}: UsageSelectStepProps) {
  const selectedUsage = usages.find((u) => (u.data || u).id === selectedUsageId);
  const usageData = selectedUsage?.data || selectedUsage;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="usage-select" className="text-base font-semibold">
          ขั้นตอนที่ 1: เลือก MedicalSupplyUsage
        </Label>
        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              รีเฟรช
            </>
          )}
        </Button>
      </div>
      <Select
        value={selectedUsageId?.toString() || ''}
        onValueChange={(value) => onSelect(parseInt(value))}
        disabled={loading}
      >
        <SelectTrigger id="usage-select" className="w-full">
          <SelectValue placeholder="เลือก MedicalSupplyUsage" />
        </SelectTrigger>
        <SelectContent>
          {usages.length === 0 ? (
            <SelectItem value="no-data" disabled>
              ไม่พบข้อมูล
            </SelectItem>
          ) : (
            usages.map((usage: Usage) => {
              const u = usage.data || usage;
              return (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.en || u.id} - {u.patient_hn} - {u.first_name} {u.lastname}
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      {selectedUsageId && usageData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-semibold text-blue-900">EN:</span> {usageData.en || '-'}
            </div>
            <div>
              <span className="font-semibold text-blue-900">HN:</span> {usageData.patient_hn || '-'}
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-blue-900">ชื่อคนไข้:</span> {usageData.first_name || ''} {usageData.lastname || ''}
            </div>
            <div>
              <span className="font-semibold text-blue-900">แผนก:</span> {usageData.department_code || '-'}
            </div>
            <div>
              <span className="font-semibold text-blue-900">วันที่:</span> {usageData.created_at ? formatDate(usageData.created_at) : '-'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
