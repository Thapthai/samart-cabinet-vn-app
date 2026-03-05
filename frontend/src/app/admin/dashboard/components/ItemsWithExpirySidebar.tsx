'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, Package, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ItemWithExpiry {
  RowID: number;
  ItemCode: string | null;
  itemname: string | null;
  ExpireDate: string | null;
  วันหมดอายุ: string | null;
  RfidCode: string | null;
  cabinet_name?: string;
  cabinet_code?: string;
  department_name?: string;
}

const EXPIRY_ITEMS_PER_PAGE = 5;

interface ItemsWithExpirySidebarProps {
  itemsWithExpiry: ItemWithExpiry[];
  expiredCount: number;
  nearExpire7Days: number;
  loading?: boolean;
}

function getDaysLeft(expireDate: string | null): number | null {
  if (!expireDate) return null;
  const exp = new Date(expireDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatExpiryLabel(daysLeft: number | null): string {
  if (daysLeft === null) return '-';
  if (daysLeft < 0) return 'หมดอายุแล้ว';
  if (daysLeft === 0) return 'หมดอายุวันนี้';
  if (daysLeft <= 3) return `เหลือ ${daysLeft} วัน`;
  return `เหลือ ${daysLeft} วัน`;
}

export default function ItemsWithExpirySidebar({
  itemsWithExpiry,
  expiredCount,
  nearExpire7Days,
  loading = false,
}: ItemsWithExpirySidebarProps) {
  const [expiryPage, setExpiryPage] = useState(1);
  const totalExpiryPages = Math.max(1, Math.ceil(itemsWithExpiry.length / EXPIRY_ITEMS_PER_PAGE));

  useEffect(() => {
    setExpiryPage(1);
  }, [itemsWithExpiry.length]);

  // อยู่ภายในช่วงหน้าที่มีอยู่
  const safePage = Math.min(expiryPage, totalExpiryPages);
  const startIdx = (safePage - 1) * EXPIRY_ITEMS_PER_PAGE;
  const paginatedItems = itemsWithExpiry.slice(startIdx, startIdx + EXPIRY_ITEMS_PER_PAGE);
  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white overflow-hidden shrink-0">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardContent className="py-8 flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* การ์ดสรุป — หมดอายุแล้ว | ใกล้หมดอายุ 1-7 วัน (ถ้าหมดอายุไม่นับ) */}
      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white overflow-hidden shadow-lg shrink-0 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white/95">
            อุปกรณ์ใกล้หมดอายุ
          </CardTitle>
          {/* <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
            <AlertCircle className="h-4 w-4" />
            {expiredCount + nearExpire7Days} ชิ้น
          </div> */}
        </CardHeader>
        <CardContent className="relative">
          <div className="flex gap-3 flex-wrap">
            <span className="rounded-lg bg-white/25 px-4 py-2 text-sm font-semibold">
              หมดอายุแล้ว: <span className="text-lg sm:text-xl font-bold">{expiredCount}</span>
            </span>
            <span className="rounded-lg bg-white/25 px-4 py-2 text-sm font-semibold">
              ใกล้หมดอายุ 7 วัน: <span className="text-lg sm:text-xl font-bold">{nearExpire7Days}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* รายการใกล้หมดอายุ - ความสูงเท่ารายการอุปกรณ์ + paginate */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            รายการใกล้หมดอายุ
          </CardTitle>

        </CardHeader>
        <CardContent className="pt-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {itemsWithExpiry.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              ไม่มีรายการใกล้หมดอายุ
            </div>
          ) : (
            <>
              <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
                {paginatedItems.map((item) => {
                  const daysLeft = getDaysLeft(item.ExpireDate ?? item.วันหมดอายุ);
                  const isUrgent = daysLeft !== null && daysLeft <= 3;
                  return (
                    <div
                      key={`${item.RowID}-${item.ItemCode}`}
                      className={`rounded-xl border p-3 transition-shadow hover:shadow-md shrink-0 ${isUrgent
                          ? 'border-amber-200 bg-amber-50/80'
                          : 'border-slate-200 bg-slate-50/50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate" title={item.itemname ?? undefined}>
                            {item.itemname || item.ItemCode || '-'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.department_name || item.cabinet_name || item.ItemCode || '-'}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`text-xs font-medium ${isUrgent ? 'text-amber-700' : 'text-slate-600'
                                }`}
                            >
                              {formatExpiryLabel(daysLeft)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.วันหมดอายุ || (item.ExpireDate ? new Date(item.ExpireDate).toLocaleDateString('th-TH') : '-')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalExpiryPages > 1 && (
                <div className="shrink-0 flex items-center justify-between border-t pt-3 mt-3">
                  <span className="text-xs text-slate-500">
                    หน้า {safePage} จาก {totalExpiryPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiryPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiryPage((p) => Math.min(totalExpiryPages, p + 1))}
                      disabled={safePage >= totalExpiryPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
