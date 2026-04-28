import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Edit, Trash2, Plus, FolderOpen, Tag } from 'lucide-react';
import type { Item } from '@/types/item';
import { ItemsGridSkeleton } from './ItemsSkeleton';
import Pagination from '@/components/Pagination';

interface ItemsGridProps {
  loading: boolean;
  items: Item[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export default function ItemsGrid({
  loading,
  items,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onEdit,
  onDelete,
}: ItemsGridProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">รายการเวชภัณฑ์</h2>
            {!loading && totalItems > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                ทั้งหมด {totalItems} รายการ
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <ItemsGridSkeleton />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ItemsList items={items} onEdit={onEdit} onDelete={onDelete} />
        )}
      </CardContent>
      
      {/* Pagination */}
      {!loading && items.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          loading={loading}
        />
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 px-6">
      <Package className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบเวชภัณฑ์</h3>
      <p className="mt-1 text-sm text-gray-500">
        ลองเปลี่ยนคำค้นหาหรือตัวกรอง
      </p>
    </div>
  );
}

function ItemsList({ 
  items, 
  onEdit, 
  onDelete 
}: { 
  items: Item[]; 
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {items.map((item) => (
        <Card key={item.itemcode} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.itemname || 'ไม่มีชื่อ'}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  {item.itemcode}
                </p>
              </div>
              <Badge 
                variant={item.item_status === 0 ? "default" : "destructive"} 
                className={`ml-2 ${item.item_status === 0
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-sm' 
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-sm'}`}
              >
                {item.item_status === 0 ? 'ใช้งาน' : 'ไม่ใช้งาน'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {item.Description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {item.Description}
              </p>
            )}
            {item.Barcode && (
              <div className="mb-4 p-2 bg-gray-50 rounded border">
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3 text-gray-500" />
                  <span className="text-xs font-mono text-gray-700">{item.Barcode}</span>
                </div>
              </div>
            )}
            <div className="space-y-2 mb-4">
              {item.CostPrice !== undefined && item.CostPrice !== null && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">ราคาทุน:</span>
                  <span className="font-semibold">฿{Number(item.CostPrice).toLocaleString()}</span>
                </div>
              )}
              {item.SalePrice !== undefined && item.SalePrice !== null && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">ราคาขาย:</span>
                  <span className="font-semibold">฿{Number(item.SalePrice).toLocaleString()}</span>
                </div>
              )}
              {item.stock_balance !== undefined && item.stock_balance !== null && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">จำนวนในสต็อก:</span>
                  <span className="font-semibold">{item.stock_balance.toLocaleString()}</span>
                </div>
              )}
              {item.CostPrice !== undefined && item.stock_balance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">มูลค่ารวม:</span>
                  <span className="font-semibold">
                    ฿{(Number(item.CostPrice) * Number(item.stock_balance)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500 transition-all duration-200"
                onClick={() => onEdit(item)}
              >
                <Edit className="mr-2 h-4 w-4" />
                แก้ไข
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

