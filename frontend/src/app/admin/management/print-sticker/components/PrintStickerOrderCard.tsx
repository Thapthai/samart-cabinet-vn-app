'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cabinetDepartmentApi, departmentApi } from '@/lib/api';
import {
  MAX_COPIES_PER_ITEM,
  MAX_COPIES_WHEN_NO_REFILL,
  MAX_PRINT,
  MAX_TOTAL_LABELS,
} from '../constants';
import type { SelectedLine } from '../types';
import { clampCopies } from '../utils';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import type { Item } from '@/types/item';

type Department = { ID: number; DepName?: string; DepName2?: string };

type Cabinet = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
  cabinetDepartments?: Array<{ id: number; department_id: number; status: string }>;
};

type CabinetDepartmentMapping = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
};

function mapCabinetFromMapping(m: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!m || typeof m.id !== 'number') return null;
  return {
    id: m.id,
    cabinet_name: m.cabinet_name,
    cabinet_code: m.cabinet_code,
    cabinet_status: m.cabinet_status,
  };
}

type PrintStickerOrderCardProps = {
  selectedLines: SelectedLine[];
  printing: boolean;
  fetchingItemcode: string | null;
  onLineDepartmentChange: (itemcode: string, departmentId: string) => void;
  onLineCabinetChange: (itemcode: string, cabinetId: string) => void;
  onSetCopies: (itemcode: string, raw: number) => void;
  onExpireDateChange: (itemcode: string, ymd: string) => void;
  onRemoveLine: (itemcode: string) => void;
  onClearAll: () => void;
  onPrint: () => void;
};

export function PrintStickerOrderCard({
  selectedLines,
  printing,
  fetchingItemcode,
  onLineDepartmentChange,
  onLineCabinetChange,
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
  onClearAll,
  onPrint,
}: PrintStickerOrderCardProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [cabinetByDept, setCabinetByDept] = useState<Record<string, Cabinet[]>>({});
  const [loadingCabinetDept, setLoadingCabinetDept] = useState<string | null>(null);
  const fetchedDeptIdsRef = useRef<Set<string>>(new Set());

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDepartments(false);
    }
  };

  const resolveCabinetsForDept = useCallback(async (departmentIdStr: string, keyword?: string) => {
    if (!departmentIdStr) return [];
    try {
      setLoadingCabinetDept(departmentIdStr);
      const deptId = parseInt(departmentIdStr, 10);
      if (Number.isNaN(deptId)) return [];
      const response = await cabinetDepartmentApi.getAll({
        departmentId: deptId,
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const unique = new Map<number, Cabinet>();
        mappings
          .filter((mapping) => mapping.status === 'ACTIVE')
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !unique.has(mapped.id)) {
              unique.set(mapped.id, mapped);
            }
          });
        return Array.from(unique.values());
      }
    } catch {
      return [];
    } finally {
      setLoadingCabinetDept(null);
    }
    return [];
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, []);

  /** โหลดรายการตู้ครั้งแรกเมื่อมี Division ในแถว */
  useEffect(() => {
    const deptIds = [...new Set(selectedLines.map((l) => l.departmentId).filter(Boolean))];
    for (const deptId of deptIds) {
      if (fetchedDeptIdsRef.current.has(deptId)) continue;
      fetchedDeptIdsRef.current.add(deptId);
      void resolveCabinetsForDept(deptId).then((list) => {
        setCabinetByDept((prev) => ({ ...prev, [deptId]: list }));
      });
    }
  }, [selectedLines, resolveCabinetsForDept]);

  const totalSheets = selectedLines.reduce((s, l) => s + clampCopies(l.copies, l.refillCap), 0);
  const hasPrintableSheets = totalSheets > 0;
  const allRowsHaveLocation = selectedLines.every((l) => Boolean(l.departmentId && l.cabinetId));

  const deptOptions = [
    { value: '', label: 'เลือก Division' },
    ...departments.map((dept) => ({
      value: dept.ID.toString(),
      label: dept.DepName || '',
      subLabel: dept.DepName2 || '',
    })),
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">สั่งพิมพ์</CardTitle>
        <CardDescription>
          <p className="text-sm text-muted-foreground">
            แต่ละแถวเลือก Division / ตู้ แล้วใส่จำนวนแผ่นและวันหมดอายุ (ถ้ามี) — วันหมดอายุจะพิมพ์บนฉลากและบันทึกใน itemstock · ถ้ามีจำนวนที่ต้องเติมจากตู้ จำนวนสูงสุดจะเท่ากับค่านั้น (ไม่เกิน {MAX_COPIES_PER_ITEM}) ·
            ถ้าไม่มีข้อมูลเติม ใส่ได้สูงสุด {MAX_COPIES_WHEN_NO_REFILL} แผ่น · รวมไม่เกิน {MAX_TOTAL_LABELS} แผ่น · เลือกได้สูงสุด {MAX_PRINT} แถว
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedLines.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีรายการ — ติ๊กจากตาราง Item
          </p>
        ) : (
          <div className="max-h-[min(60vh,28rem)] overflow-auto rounded-md border">
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-[1] w-10 bg-background px-2 align-middle" />
                  <TableHead className="min-w-[100px] align-middle py-2">itemcode</TableHead>
                  <TableHead className="min-w-[120px] align-middle py-2">ชื่อ</TableHead>
                  <TableHead className="min-w-[200px] align-middle py-2">Division</TableHead>
                  <TableHead className="min-w-[200px] align-middle py-2">ตู้ Cabinet</TableHead>
                  <TableHead className="w-[132px] align-middle py-2 text-xs">หมดอายุ</TableHead>
                  <TableHead className="w-[72px] align-middle py-2 text-center text-xs">สูงสุด</TableHead>
                  <TableHead className="w-[96px] align-middle py-2 text-right">จำนวนแผ่น</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedLines.map((line) => {
                  const loadingRow = fetchingItemcode === line.itemcode;
                  const inputDisabled = loadingRow || line.refillCap <= 0;
                  const cabinets = line.departmentId ? cabinetByDept[line.departmentId] ?? [] : [];
                  const cabinetOptions = [
                    { value: '', label: line.departmentId ? 'เลือกตู้' : 'เลือก Division ก่อน' },
                    ...cabinets.map((c) => ({
                      value: c.id.toString(),
                      label: c.cabinet_name || '',
                      subLabel: c.cabinet_code || '',
                    })),
                  ];

                  return (
                    <TableRow key={line.itemcode}>
                      <TableCell className="sticky left-0 z-[1] bg-background px-2 align-middle py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`เอา ${line.itemcode} ออก`}
                          onClick={() => onRemoveLine(line.itemcode)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="align-middle py-2 font-mono text-sm">{line.itemcode}</TableCell>
                      <TableCell className="max-w-[180px] min-w-0 align-middle py-2 text-sm">
                        <ItemNameWithUnit
                          item={
                            {
                              itemcode: line.itemcode,
                              itemname: line.itemname,
                              SubUnitQty: line.SubUnitQty,
                              unit: line.unit,
                              subUnit: line.subUnit,
                            } as Item
                          }
                          qtyMain={line.copies}
                        />
                      </TableCell>
                      <TableCell className="align-middle py-2">
                        <div className="flex min-h-8 items-center [&_label]:sr-only [&_button]:h-8 [&_button]:min-h-8">
                          <SearchableSelect
                            label="Division"
                            placeholder="Division"
                            value={line.departmentId}
                            onValueChange={(v) => {
                              onLineDepartmentChange(line.itemcode, v);
                              if (v) {
                                fetchedDeptIdsRef.current.add(v);
                                void resolveCabinetsForDept(v).then((list) => {
                                  setCabinetByDept((prev) => ({ ...prev, [v]: list }));
                                });
                              }
                            }}
                            options={deptOptions}
                            loading={loadingDepartments}
                            onSearch={loadDepartments}
                            searchPlaceholder="ค้นหา Division…"
                            positionMode="floating"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-2">
                        <div className="flex min-h-8 items-center [&_label]:sr-only [&_button]:h-8 [&_button]:min-h-8">
                          <SearchableSelect
                            label="ตู้ Cabinet"
                            placeholder={line.departmentId ? 'ตู้ Cabinet' : 'Division ก่อน'}
                            value={line.cabinetId}
                            onValueChange={(v) => onLineCabinetChange(line.itemcode, v)}
                            options={cabinetOptions}
                            loading={loadingCabinetDept === line.departmentId}
                            disabled={!line.departmentId}
                            onSearch={(kw) => {
                              if (!line.departmentId) return;
                              void resolveCabinetsForDept(line.departmentId, kw).then((list) => {
                                setCabinetByDept((prev) => ({ ...prev, [line.departmentId]: list }));
                              });
                            }}
                            searchPlaceholder="ค้นหาตู้…"
                            positionMode="floating"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-2">
                        <div className="flex min-h-8 min-w-[10rem] items-center [&_input]:h-8 [&_button]:h-8 [&_button]:w-8 [&_button]:min-h-8 [&_button]:min-w-8">
                          <DatePickerBE
                            id={`expire-${line.itemcode}`}
                            className="items-center"
                            popoverPortal
                            value={line.expireDate || ''}
                            onChange={(v) => onExpireDateChange(line.itemcode, v)}
                            placeholder="วว/ดด/ปปปป (พ.ศ.)"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-2 text-center tabular-nums text-muted-foreground">
                        <div className="flex min-h-8 items-center justify-center">
                          {loadingRow ? <Loader2 className="h-4 w-4 animate-spin" /> : line.refillCap}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-2 text-right">
                        <div className="flex min-h-8 items-center justify-end">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={line.refillCap <= 0 && !loadingRow ? 0 : 1}
                          max={Math.max(line.refillCap, 1)}
                          className="ml-auto h-8 w-[4rem] text-right font-mono text-sm"
                          value={line.refillCap <= 0 && !loadingRow ? 0 : line.copies}
                          disabled={inputDisabled}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            onSetCopies(line.itemcode, Number.isFinite(n) ? n : 1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {selectedLines.length} แถว · รวม <span className="font-medium text-slate-800">{totalSheets}</span> แผ่น
            {selectedLines.length > 0 && !allRowsHaveLocation ? (
              <span className="ml-2 text-amber-700">· เลือก Division และตู้ให้ครบทุกแถว</span>
            ) : null}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onClearAll}
          disabled={selectedLines.length === 0}
        >
          ล้างการเลือกทั้งหมด
        </Button>
        <Button
          type="button"
          className="w-full gap-2"
          onClick={onPrint}
          disabled={
            printing ||
            selectedLines.length === 0 ||
            !allRowsHaveLocation ||
            !hasPrintableSheets
          }
        >
          <Send className="h-4 w-4" />
          {printing ? 'กำลังส่ง…' : 'สั่งพิมพ์ฉลาก'}
        </Button>
      </CardContent>
    </Card>
  );
}
