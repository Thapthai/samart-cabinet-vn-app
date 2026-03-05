import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, CheckCircle, BarChart3, Package, ClipboardCheck, Minus, Loader2 } from 'lucide-react';
import { SkeletonStats } from '@/components/Skeleton';

interface StatsCardsProps {
  loading: boolean;
  stats: {
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
    lowStockItems: number;
  };
  /** เบิก vs ใช้ โดยรวม (แทน ต้องเติมสต็อก + อุปกรณ์ไม่ใช้งาน) */
  dispensedVsUsage?: {
    total_dispensed: number;
    total_used: number;
    difference: number;
  } | null;
  loadingDispensedVsUsage?: boolean;
}

export default function StatsCards({
  loading,
  stats,
  dispensedVsUsage,
  loadingDispensedVsUsage = false,
}: StatsCardsProps) {
  if (loading) {
    return <SkeletonStats />;
  }

  const dispensed = dispensedVsUsage?.total_dispensed ?? 0;
  const used = dispensedVsUsage?.total_used ?? 0;
  const diff = dispensedVsUsage?.difference ?? 0;
  const maxVal = Math.max(dispensed, used, Math.abs(diff), 1);
  const pctD = (dispensed / maxVal) * 100;
  const pctU = (used / maxVal) * 100;
  const pctDiff = (Math.abs(diff) / maxVal) * 100;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-6">
      {/* ชนิดอุปกรณ์ทั้งหมด (จาก Item) */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ชนิดอุปกรณ์ทั้งหมด</CardTitle>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Box className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalItems.toLocaleString()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            จากชนิดอุปกรณ์ในระบบ
          </p>
        </CardContent>
      </Card>

      {/* ชนิดอุปกรณ์ที่มีในสต็อก (จาก ItemStock) */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ชนิดอุปกรณ์ที่มีในสต็อก</CardTitle>
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.activeItems.toLocaleString()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            จากชนิดอุปกรณ์ที่มีในสต็อก
          </p>
        </CardContent>
      </Card>

      {/* เบิก vs ใช้ โดยรวม (แทน ต้องเติมสต็อก + อุปกรณ์ไม่ใช้งาน) */}
      <Card className="hover:shadow-lg transition-shadow border-indigo-100 bg-gradient-to-b from-white to-indigo-50/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            เบิก vs ใช้ โดยรวม
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDispensedVsUsage ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : dispensedVsUsage ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Package className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-xs text-slate-500">เบิก</span>
                  <span className="text-lg font-bold text-blue-600 truncate">{dispensed.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <ClipboardCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs text-slate-500">ใช้</span>
                  <span className="text-lg font-bold text-emerald-600 truncate">{used.toLocaleString()}</span>
                </div>
                <div className={`flex items-center gap-1.5 min-w-0 ${diff >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  <Minus className="h-4 w-4 shrink-0" />
                  <span className="text-xs text-slate-500">ผลต่าง</span>
                  <span className="text-lg font-bold truncate">{diff >= 0 ? '+' : ''}{diff.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-8 shrink-0">เบิก</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all" style={{ width: `${pctD}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-8 shrink-0">ใช้</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: `${pctU}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-8 shrink-0">ผลต่าง</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${diff >= 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                      style={{ width: `${pctDiff}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">ไม่พบข้อมูล</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

