"use client";

import { useState, Fragment, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronDown, ChevronRight, Loader2, Package, Download } from "lucide-react";
import { cabinetDepartmentApi } from "@/lib/api";
import { toast } from "sonner";
import CabinetDetailsCard from "./CabinetDetailsCard";

interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  itemstock_count?: number;
  itemstock_dispensed_count?: number;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
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

interface MappingTableProps {
  mappings: CabinetDepartment[];
  onEdit: (mapping: CabinetDepartment) => void;
  onDelete: (mapping: CabinetDepartment) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

export default function MappingTable({ mappings, onEdit, onDelete, onExportExcel, onExportPdf }: MappingTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<number | null>(null);
  const [itemStocks, setItemStocks] = useState<{ [key: number]: ItemStock[] }>({});
  const [loadingItemStock, setLoadingItemStock] = useState<number | null>(null);
  const [dropdownPage, setDropdownPage] = useState<{ [key: number]: number }>({});
  const itemsPerPage = 5;
  const itemsPerDropdown = 10;

  // Calculate pagination
  const totalPages = Math.ceil(mappings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMappings = mappings.slice(startIndex, endIndex);

  const handleDropdownToggle = async (e: React.MouseEvent, mapping: CabinetDepartment) => {
    e.stopPropagation();
    const cabinetId = mapping.cabinet_id;

    // Toggle dropdown
    if (expandedDropdown === mapping.id) {
      setExpandedDropdown(null);
      return;
    }

    setExpandedDropdown(mapping.id);

    // If already loaded, don't fetch again
    if (itemStocks[cabinetId]) {
      return;
    }

    // Fetch item stocks
    try {
      setLoadingItemStock(cabinetId);
      const response = await cabinetDepartmentApi.getItemStocksByCabinet(cabinetId, {
        page: 1,
        limit: 1000, // Load all
      });

      if (response.success && response.data) {
        setItemStocks(prev => ({ ...prev, [cabinetId]: response.data }));
        setDropdownPage(prev => ({ ...prev, [cabinetId]: 1 }));
      } else {
        toast.error("ไม่สามารถโหลดข้อมูล ItemStock ได้");
      }
    } catch (error: any) {
      console.error("Error loading item stocks:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoadingItemStock(null);
    }
  };

  const handleRowClick = (mapping: CabinetDepartment) => {
    setSelectedRow(mapping);
  };

  const handleLoadMore = (cabinetId: number) => {
    setDropdownPage(prev => ({
      ...prev,
      [cabinetId]: (prev[cabinetId] || 1) + 1
    }));
  };

  // Helper function to group item stocks by item code
  const groupItemStocksByCode = (stocks: ItemStock[]) => {
    const grouped = stocks.reduce((acc: any, stock: ItemStock) => {
      const itemCode = stock.item?.itemcode || stock.ItemCode || '-';
      if (!acc[itemCode]) {
        acc[itemCode] = {
          itemcode: itemCode,
          itemname: stock.item?.itemname || '-',
          stocks: [],
          totalQty: 0,
          inStockCount: 0,
          dispensedCount: 0,
        };
      }
      acc[itemCode].stocks.push(stock);
      acc[itemCode].totalQty += stock.Qty || 0;
      const isStock = stock.IsStock === true || (stock as { IsStock?: boolean | number }).IsStock === 1;
      if (isStock) {
        acc[itemCode].inStockCount += 1;
      } else {
        acc[itemCode].dispensedCount += 1;
      }
      return acc;
    }, {});
    return Object.values(grouped);
  };

  // Render grouped item stocks
  const renderGroupedItemStocks = (cabinetId: number, mappingId: number) => {
    const stocks = itemStocks[cabinetId];
    if (!stocks || stocks.length === 0) return null;

    const groupedArray = groupItemStocksByCode(stocks);
    const displayedItems = groupedArray.slice(
      0,
      (dropdownPage[cabinetId] || 1) * itemsPerDropdown
    );

    return (
      <div>
        <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4" />
          รายการอุปกรณ์ในตู้ ({groupedArray.length} รายการ, รวม {stocks.length} ชิ้น)
        </h4>
        <div className="space-y-2">
          {displayedItems.map((group: any, groupIndex: number) => (
            <div
              key={`mapping-${mappingId}-group-${group.itemcode}-${groupIndex}`}
              className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="grid grid-cols-2 md:grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-2 md:gap-4 text-sm">
                <div className="w-fit md:min-w-[60px]">
                  <span className="text-gray-500">ลำดับ:</span>
                  <span className="ml-1 font-medium">{groupIndex + 1}</span>
                </div>
                <div className="w-fit md:min-w-[200px]">
                  <span className="text-gray-500">รหัสอุปกรณ์:</span>
                  <span className="ml-2 font-medium font-mono">{group.itemcode}</span>
                </div>
                <div className="w-fit md:min-w-[500px]">
                  <span className="text-gray-500">ชื่ออุปกรณ์:</span>
                  <span className="ml-2 font-medium">{group.itemname}</span>
                </div>
                <div>
                  <span className="text-gray-500">อยู่ในตู้:</span>
                  <span className="ml-2 font-medium text-green-600">{group.inStockCount} ชิ้น</span>
                </div>
                <div >
                  <span className="text-gray-500">ถูกเบิก:</span>
                  <span className="ml-2 font-medium text-amber-600">{group.dispensedCount} ชิ้น</span>
                </div>
                <div >
                  <span className="text-gray-500">จำนวนรวม:</span>
                  <span className="ml-2 font-medium text-amber-600">{group.totalQty} ชิ้น</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {groupedArray.length >
          (dropdownPage[cabinetId] || 1) * itemsPerDropdown && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLoadMore(cabinetId)}
              >
                ดูเพิ่มเติม ({groupedArray.length -
                  (dropdownPage[cabinetId] || 1) * itemsPerDropdown}{" "}
                รายการ)
              </Button>
            </div>
          )}
      </div>
    );
  };

  return (
    <>
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 border-b border-slate-100 bg-slate-50/50 pb-2">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยง ({mappings.length})
          </CardTitle>
          <div className="flex shrink-0 gap-2">
            {onExportExcel && (
              <Button onClick={onExportExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            )}
            {onExportPdf && (
              <Button onClick={onExportPdf} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b border-slate-200">
                  <TableHead className="w-12 text-slate-600 font-semibold"></TableHead>
                  <TableHead className="text-slate-600 font-semibold">ลำดับ</TableHead>
                  {/* <TableHead className="text-slate-600 font-semibold">รหัสตู้</TableHead> */}
                  <TableHead className="text-slate-600 font-semibold">ชื่อตู้</TableHead>
                  <TableHead className="text-slate-600 font-semibold">แผนก</TableHead>
                  <TableHead className="text-center text-slate-600 font-semibold">จำนวนอุปกรณ์</TableHead>
                  <TableHead className="text-slate-600 font-semibold">สถานะ</TableHead>
                  <TableHead className="text-slate-600 font-semibold">หมายเหตุ</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMappings.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  currentMappings.map((mapping, index) => (
                    <Fragment key={mapping.id}>
                      <TableRow
                        className={`cursor-pointer transition-colors ${selectedRow?.id === mapping.id ? "bg-blue-50/80" : "hover:bg-slate-50/80"
                          }`}
                        onClick={() => handleRowClick(mapping)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDropdownToggle(e, mapping)}
                            className="hover:bg-gray-200 p-1 rounded"
                          >
                            {expandedDropdown === mapping.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>{startIndex + index + 1}</TableCell>
                        {/* <TableCell>{mapping.cabinet?.cabinet_code || "-"}</TableCell> */}
                        <TableCell>{mapping.cabinet?.cabinet_name || "-"}</TableCell>
                        <TableCell>{mapping.department?.DepName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-slate-700">
                            {mapping.itemstock_dispensed_count ?? 0} / {mapping.itemstock_count ?? 0}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">(ถูกเบิก / ในตู้)</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={mapping.status === "ACTIVE" ? "default" : "secondary"}
                            className={mapping.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100" : ""}
                          >
                            {mapping.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {mapping.description || "-"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(mapping)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(mapping)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Dropdown - Item Stocks */}
                      {expandedDropdown === mapping.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-gray-50 p-4">
                            {loadingItemStock === mapping.cabinet_id ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
                              </div>
                            ) : itemStocks[mapping.cabinet_id]?.length > 0 ? (
                              renderGroupedItemStocks(mapping.cabinet_id, mapping.id)
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                ไม่พบอุปกรณ์ในตู้นี้
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                แสดง {startIndex + 1}-{Math.min(endIndex, mappings.length)} จาก {mappings.length} รายการ
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Row Details Card */}
      {selectedRow && (
        <CabinetDetailsCard
          selectedRow={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </>
  );
}
