'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { itemsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import { Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportsApi } from '@/lib/api';
 
import EditItemDialog from './components/EditItemDialog';
import DeleteItemDialog from './components/DeleteItemDialog';
import UpdateMinMaxDialog from './components/UpdateMinMaxDialog';
import FilterSection from './components/FilterSection';
import ItemsTable from './components/ItemsTable';

export default function ItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  /** true = โหลดจาก API ได้ — เปิดหน้ามาโหลดรายการค่าเริ่มต้นก่อน; กดรีเซ็ตแล้วเป็น false จนกดค้นหาใหม่ */
  const [hasSearched, setHasSearched] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMinMaxDialog, setShowMinMaxDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportLoading, setReportLoading] = useState<'excel' | 'pdf' | null>(null);

  // Active filters (after search button clicked)
  const [activeFilters, setActiveFilters] = useState({
    searchTerm: '',
    departmentId: '',
    cabinetId: '',
    statusFilter: 'all',
    keyword: '',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Table layout

  const fetchItems = useCallback(async () => {
    if (!user?.id || !hasSearched) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        keyword: activeFilters.keyword || activeFilters.searchTerm || undefined,
        status: 'ACTIVE',
      };

      if (activeFilters.departmentId && activeFilters.departmentId !== '') {
        const deptId = parseInt(activeFilters.departmentId, 10);
        if (!Number.isNaN(deptId)) {
          params.department_id = deptId;
        }
      }

      if (activeFilters.cabinetId && activeFilters.cabinetId !== '') {
        const cabId = parseInt(activeFilters.cabinetId, 10);
        if (!Number.isNaN(cabId)) {
          params.cabinet_id = cabId;
        }
      }

      const response = (await itemsApi.getAll(params)) as {
        success?: boolean;
        data?: any[];
        total?: number;
        lastPage?: number;
        message?: string;
      };
      if (response?.success === false) {
        toast.error((response as any)?.message || 'โหลดข้อมูลไม่สำเร็จ');
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }
      const list = Array.isArray(response?.data)
        ? response.data
        : (response as any)?.data?.data ?? [];
      setItems(list);
      setTotalItems(response?.total ?? list.length);
      setTotalPages(
        response?.lastPage ?? Math.ceil((response?.total ?? list.length) / itemsPerPage),
      );
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('ไม่สามารถโหลดข้อมูลสินค้าได้');
    } finally {
      setLoading(false);
    }
  }, [user?.id, hasSearched, currentPage, activeFilters, itemsPerPage]);

  const filterItems = useCallback(() => {
    let filtered = items;
    if (activeFilters.statusFilter !== 'all') {
      filtered = filtered.filter((item) =>
        activeFilters.statusFilter === 'active' ? item.item_status === 0 : item.item_status !== 0,
      );
    }
    setFilteredItems(filtered);
  }, [items, activeFilters.statusFilter]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (filters: {
    searchTerm: string;
    departmentId: string;
    cabinetId: string;
    statusFilter: string;
    keyword: string;
  }) => {
    setActiveFilters(filters);
    setCurrentPage(1);
    setHasSearched(true);
  };

  const handleResetFilters = () => {
    setHasSearched(false);
    setCurrentPage(1);
    setActiveFilters({
      searchTerm: '',
      departmentId: '',
      cabinetId: '',
      statusFilter: 'all',
      keyword: '',
    });
    setItems([]);
    setFilteredItems([]);
    setTotalItems(0);
    setTotalPages(1);
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleDelete = (item: Item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleUpdateMinMax = (item: Item) => {
    setSelectedItem(item);
    setShowMinMaxDialog(true);
  };

  const handleDownloadCabinetStockExcel = async () => {
    try {
      setReportLoading('excel');
      const cabinetId = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined;
      const departmentId = activeFilters.departmentId ? parseInt(activeFilters.departmentId, 10) : undefined;
      await reportsApi.downloadCabinetStockExcel({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  const handleDownloadCabinetStockPdf = async () => {
    try {
      setReportLoading('pdf');
      const cabinetId = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined;
      const departmentId = activeFilters.departmentId ? parseInt(activeFilters.departmentId, 10) : undefined;
      await reportsApi.downloadCabinetStockPdf({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">จัดการสต๊อกอุปกรณ์ในตู้</h1>
                <p className="text-sm text-gray-500">รายการอุปกรณ์ทั้งหมดในระบบ</p>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <FilterSection
            onSearch={handleSearch}
            onBeforeSearch={() => setCurrentPage(1)}
            onReset={handleResetFilters}
          />

          {/* Table Section */}
          <ItemsTable
            items={filteredItems}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            hasSearched={hasSearched}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateMinMax={handleUpdateMinMax}
            onPageChange={handlePageChange}
            headerActions={
              <div className="flex flex-wrap items-center gap-2">
                {/* <span className="text-sm text-gray-600">รายงานสต๊อกอุปกรณ์ในตู้:</span> */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCabinetStockExcel}
                  disabled={reportLoading !== null}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {reportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCabinetStockPdf}
                  disabled={reportLoading !== null}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {reportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
                </Button>
              </div>
            }
          />
        </div>

 

        <EditItemDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          item={selectedItem}
          onSuccess={fetchItems}
        />

        <DeleteItemDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          item={selectedItem}
          onSuccess={fetchItems}
        />

        <UpdateMinMaxDialog
          open={showMinMaxDialog}
          onOpenChange={setShowMinMaxDialog}
          item={selectedItem}
          cabinetId={activeFilters.cabinetId ? (() => {
            const n = parseInt(activeFilters.cabinetId, 10);
            return Number.isNaN(n) ? undefined : n;
          })() : undefined}
          onSuccess={fetchItems}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
