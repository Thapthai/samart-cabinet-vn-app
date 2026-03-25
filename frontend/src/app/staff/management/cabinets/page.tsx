'use client';

import { useEffect, useState } from 'react';
import { staffCabinetApi } from '@/lib/staffApi/cabinetApi';
import { toast } from 'sonner';
import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import CreateCabinetDialog from './components/CreateCabinetDialog';
import EditCabinetDialog from './components/EditCabinetDialog';
import CabinetsTable from './components/CabinetsTable';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
  created_at?: string;
  updated_at?: string;
}

export default function CabinetsPage() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCabinets();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    filterCabinets();
  }, [cabinets, searchTerm]);

  const fetchCabinets = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchTerm) {
        params.keyword = searchTerm;
      }

      const response = await staffCabinetApi.getAll(params);
      if (response.data) {
        setCabinets(response.data as Cabinet[]);
        setTotalItems(response.total || 0);
        setTotalPages(response.lastPage || 1);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch cabinets:', error);
      toast.error('ไม่สามารถโหลดข้อมูลตู้ Cabinet ได้');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const filterCabinets = () => {
    let filtered = cabinets;

    // Filter by search term (client-side for instant feedback)
    if (searchTerm) {
      filtered = filtered.filter(cabinet =>
        cabinet.cabinet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cabinet.cabinet_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCabinets(filtered);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (cabinet: Cabinet) => {
    setSelectedCabinet(cabinet);
    setShowEditDialog(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการตู้ Cabinet</h1>
              <p className="text-sm text-gray-500">จัดการและดูรายการตู้ทั้งหมด</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มตู้ใหม่
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาตู้ (ชื่อตู้, รหัสตู้)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table Section */}
        <CabinetsTable
          cabinets={filteredCabinets}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onEdit={handleEdit}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Dialogs */}
      <CreateCabinetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchCabinets}
      />

      <EditCabinetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        cabinet={selectedCabinet}
        onSuccess={fetchCabinets}
      />

    </>
  );
}
