import { FileText, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  formatLogDate,
  getLogDescription,
  getPaginationPages,
  groupRowKey,
  rowEn,
  rowHn,
} from '../utils';
import {
  formatLogCompareItemCodeCount,
  logActionHasCompareCounts,
  logCompareOrangeMobileChipClass,
  logCompareOrangeValueClass,
  logCompareRedMobileChipClass,
  logCompareRedValueClass,
} from '@/lib/medicalSupplyLogCompareCounts';
import type { LogGroupRow } from '../types';
import { ActionStatusBadge, MethodTypeBadge } from './LogActionBadges';

type Props = {
  loading: boolean;
  groups: LogGroupRow[];
  totalGroups: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  expandedKeys: Set<string>;
  onToggleGroup: (key: string) => void;
  onSelectLog: (row: any) => void;
  onPageChange: (page: number) => void;
};

export function LogsGroupsList({
  loading,
  groups,
  totalGroups,
  totalPages,
  currentPage,
  limit,
  expandedKeys,
  onToggleGroup,
  onSelectLog,
  onPageChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">รายการ Log (จัดกลุ่มตาม HN + EN)</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {totalGroups} กลุ่มผู้ป่วย · หน้า {currentPage} / {totalPages} — กดแถวเพื่อขยายดู log กลุ่ม
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {loading ? (
          <div className="py-12 sm:py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">กำลังโหลด...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 sm:py-16 text-center">
            <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">ไม่พบข้อมูล log</p>
            <p className="text-xs sm:text-sm text-muted-foreground/80 mt-1">ลองเปลี่ยนตัวกรองหรือช่วงวันที่</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {groups.map((g, gi) => {
              const gkey = groupRowKey(g, gi);
              const open = expandedKeys.has(gkey);
              return (
                <div key={gkey} className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => onToggleGroup(gkey)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {open ? (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                        <span className="font-mono text-sm font-medium">
                          HN: <span className="text-foreground">{g.patient_hn}</span>
                        </span>
                        <span className="font-mono text-sm font-medium">
                          EN: <span className="text-foreground">{g.en}</span>
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {g.log_count} รายการ
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground shrink-0 w-full sm:w-auto sm:text-right">
                      ล่าสุด {formatLogDate(g.last_activity_at)}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t bg-muted/20 px-2 py-2 sm:px-3 sm:py-3">
                      <div className="block md:hidden space-y-2">
                        {g.logs.map((row: any) => (
                          <div
                            key={row.id}
                            className="rounded-md border bg-background p-2.5 space-y-1.5 text-xs"
                          >
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">{formatLogDate(row.created_at)}</span>
                              <span className="flex gap-1 shrink-0">
                                <MethodTypeBadge action={row.action} />
                                <ActionStatusBadge action={row.action} />
                              </span>
                            </div>
                            <p className="text-muted-foreground line-clamp-3">{getLogDescription(row)}</p>
                            {logActionHasCompareCounts(row.action) && (
                              <div className="flex flex-wrap gap-2">
                                <div className={logCompareOrangeMobileChipClass}>
                                  <span className="text-[10px] font-normal text-orange-800/90 dark:text-orange-200/90">
                                    รายการที่ Compare
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    {formatLogCompareItemCodeCount(row.action, 'compare_item_code_count')}
                                  </span>
                                </div>
                                <div className={logCompareRedMobileChipClass}>
                                  <span className="text-[10px] font-normal text-red-800/90 dark:text-red-200/90">
                                    รายการที่ไม่ Compare
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    {formatLogCompareItemCodeCount(row.action, 'non_compare_item_code_count')}
                                  </span>
                                </div>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs gap-1"
                              onClick={() => onSelectLog(row)}
                            >
                              <Eye className="h-3 w-3" /> ดูรายละเอียด
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[160px]">วันเวลา</TableHead>
                              <TableHead className="w-[100px]">HN</TableHead>
                              <TableHead className="w-[100px]">EN</TableHead>
                              <TableHead className="w-[120px]">ประเภท</TableHead>
                              <TableHead className="w-[80px]">สถานะ</TableHead>
                              <TableHead>รายละเอียด</TableHead>
                              <TableHead className="w-[100px] text-center whitespace-normal leading-tight">
                                รายการที่ Compare
                              </TableHead>
                              <TableHead className="w-[100px] text-center whitespace-normal leading-tight">
                                รายการที่ไม่ Compare
                              </TableHead>
                              <TableHead className="w-[100px] text-center">ดู</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {g.logs.map((row: any) => (
                              <TableRow key={row.id}>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {formatLogDate(row.created_at)}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{rowHn(row)}</TableCell>
                                <TableCell className="font-mono text-sm">{rowEn(row)}</TableCell>
                                <TableCell>
                                  <MethodTypeBadge action={row.action} />
                                </TableCell>
                                <TableCell>
                                  <ActionStatusBadge action={row.action} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-md">
                                  <span className="line-clamp-3">{getLogDescription(row)}</span>
                                </TableCell>
                                <TableCell className="align-middle p-2 text-center">
                                  <span className={logCompareOrangeValueClass}>
                                    {formatLogCompareItemCodeCount(row.action, 'compare_item_code_count')}
                                  </span>
                                </TableCell>
                                <TableCell className="align-middle p-2 text-center">
                                  <span className={logCompareRedValueClass}>
                                    {formatLogCompareItemCodeCount(row.action, 'non_compare_item_code_count')}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1"
                                    onClick={() => onSelectLog(row)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
            <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
              กลุ่ม {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalGroups)} จาก{' '}
              {totalGroups} กลุ่ม
            </p>
            <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="h-8 w-8 p-0 shrink-0"
                aria-label="ก่อนหน้า"
              >
                ‹
              </Button>
              {getPaginationPages(currentPage, totalPages).map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 sm:px-2 text-muted-foreground text-sm">
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={currentPage === item ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 min-w-[2rem] px-1.5 sm:px-2 text-xs sm:text-sm"
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="h-8 w-8 p-0 shrink-0"
                aria-label="ถัดไป"
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
