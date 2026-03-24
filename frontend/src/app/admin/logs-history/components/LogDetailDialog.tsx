import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatActionJson, formatLogDate, getHnEnFromAction } from '../utils';
import type { SelectedLog } from '../types';
import { ActionStatusBadge, MethodTypeBadge } from './LogActionBadges';

type Props = {
  selectedLog: SelectedLog | null;
  onClose: () => void;
};

export function LogDetailDialog({ selectedLog, onClose }: Props) {
  return (
    <Dialog open={!!selectedLog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col gap-0 p-4 sm:p-6 mx-auto">
        <DialogHeader className="pb-3 sm:pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            รายละเอียด Log
          </DialogTitle>
        </DialogHeader>
        {selectedLog && (
          <div className="flex flex-col gap-4 sm:gap-5 overflow-y-auto flex-1 min-h-0 py-3 sm:py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 sm:gap-y-3 text-sm">
              <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">วันเวลา</span>
                <span className="font-medium text-right sm:text-left break-all">
                  {formatLogDate(selectedLog.created_at)}
                </span>
              </div>
              <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">Usage ID</span>
                <span className="font-mono text-right sm:text-left">{selectedLog.usage_id ?? '–'}</span>
              </div>
              <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">เลข HN / EN</span>
                <span className="font-mono text-right sm:text-left break-all">
                  {getHnEnFromAction(selectedLog.action)}
                </span>
              </div>
              <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">ประเภท</span>
                <span className="text-right sm:text-left">
                  <MethodTypeBadge action={selectedLog.action} />
                </span>
              </div>
              <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">สถานะ</span>
                <span className="text-right sm:text-left">
                  <ActionStatusBadge action={selectedLog.action} />
                </span>
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2 min-h-0 flex flex-col">
              <p className="text-sm font-medium text-foreground shrink-0">ข้อมูล action (JSON)</p>
              <pre className="p-3 sm:p-4 bg-muted/50 border rounded-lg text-[11px] sm:text-xs overflow-auto max-h-[40vh] sm:max-h-[45vh] whitespace-pre-wrap break-words font-mono leading-relaxed shrink min-h-0">
                {formatActionJson(selectedLog.action)}
              </pre>
            </div>
          </div>
        )}
        <DialogFooter className="border-t pt-3 sm:pt-4 shrink-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
