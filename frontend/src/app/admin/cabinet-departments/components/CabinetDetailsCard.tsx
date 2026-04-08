"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package } from "lucide-react";
import { cabinetDepartmentApi } from "@/lib/api";
import { toast } from "sonner";
import { formatUtcDateTime } from "@/lib/formatThaiDateTime";

interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
  itemstock_count?: number;
  itemstock_dispensed_count?: number;
}

interface ItemStock {
  StockID: number;
  RfidCode?: string;
  ItemCode?: string;
  Qty?: number;
  IsStock?: boolean;
  LastCabinetModify?: string;
  item?: {
    itemcode?: string;
    itemname?: string;
  };
}

interface CabinetDetailsCardProps {
  selectedRow: CabinetDepartment;
  onClose: () => void;
}

export default function CabinetDetailsCard({ selectedRow, onClose }: CabinetDetailsCardProps) {
  const [itemStocks, setItemStocks] = useState<ItemStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadItemStocks(1);
  }, [selectedRow.cabinet_id]);

  const loadItemStocks = async (page: number) => {
    try {
      setLoading(true);
      const response = await cabinetDepartmentApi.getItemStocksByCabinet(selectedRow.cabinet_id, {
        page,
        limit: itemsPerPage,
      });

      if (response.success && response.data) {
        const stocks = Array.isArray(response.data) ? response.data : [];
        setItemStocks(stocks);
        // Get total from response or estimate from data
        const total = (response as any).total || stocks.length;
        setTotalItems(total);
        setCurrentPage(page);
      } else {
        toast.error("ไม่สามารถโหลดข้อมูล ItemStock ได้");
      }
    } catch (error: any) {
      console.error("Error loading item stocks:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <span>รายละเอียดตู้ {selectedRow.cabinet?.cabinet_name || "-"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">รหัสตู้</label>
              <p className="text-lg">{selectedRow.cabinet?.cabinet_code || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ชื่อตู้</label>
              <p className="text-lg">{selectedRow.cabinet?.cabinet_name || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">แผนก</label>
              <p className="text-lg">{selectedRow.department?.DepName || "-"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">สถานะ</label>
              <div className="mt-1">
                <Badge variant={selectedRow.status === "ACTIVE" ? "default" : "secondary"}>
                  {selectedRow.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">หมายเหตุ</label>
              <p className="text-base break-words whitespace-pre-wrap">{selectedRow.description || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">จำนวนอุปกรณ์</label>
              <div className="inline-flex items-center gap-1">
                <Package className="text-blue-600 h-4 w-4" />
                <span className="text-lg font-bold text-slate-700">
                  {selectedRow.itemstock_dispensed_count ?? 0} / {selectedRow.itemstock_count ?? 0}
                </span>
                <span className="text-sm text-slate-500">(ถูกเบิก / ในตู้)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Item Stocks List */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" />
            รายการอุปกรณ์ในตู้ ({totalItems} รายการ)
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
          ) : itemStocks.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ลำดับ</TableHead>
                      <TableHead>รหัสอุปกรณ์</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>สถานะสต็อก</TableHead>
                      <TableHead>วันที่แก้ไข</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemStocks.map((stock, index) => (
                      <TableRow key={`detail-stock-${index}-${stock.StockID ?? ""}`}>
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{stock.item?.itemcode || stock.ItemCode || "-"}</TableCell>
                        <TableCell>{stock.item?.itemname || "-"}</TableCell>
                        <TableCell>{stock.Qty || 0}</TableCell>
                        <TableCell>
                          {stock.IsStock === true || (stock as { IsStock?: boolean | number }).IsStock === 1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                              อยู่ในตู้
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              ถูกเบิก
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {stock.LastCabinetModify
                            ? formatUtcDateTime(String(stock.LastCabinetModify))
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    แสดง {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadItemStocks(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ก่อนหน้า
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={`cabinet-detail-page-${i}-${page}`}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => loadItemStocks(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadItemStocks(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">ไม่พบอุปกรณ์ในตู้นี้</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
