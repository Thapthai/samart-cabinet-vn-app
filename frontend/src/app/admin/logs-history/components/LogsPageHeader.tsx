import { FileText } from 'lucide-react';

export function LogsPageHeader() {
  return (
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
        <FileText className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
        <span>Log การเบิกอุปกรณ์</span>
      </h1>
      <p className="text-muted-foreground mt-1 text-sm sm:text-base">
        แสดงประวัติการดำเนินการของระบบเบิกอุปกรณ์ (Medical Supply Usage Logs)
      </p>
    </div>
  );
}
