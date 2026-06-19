'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi, vendingReportsApi, departmentApi, medicalSupplySubDepartmentsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { History } from 'lucide-react';
import MedicalSuppliesTable from './components/MedicalSuppliesTable';
import MedicalSuppliesSearchFilters, { type SubDepartmentOption } from './components/MedicalSuppliesSearchFilters';
import MedicalSupplySelectedDetailSection from './components/MedicalSupplySelectedDetailSection';
import { todayYyyyMmDdUtc } from '@/lib/formatThaiDateTime';

export default function MedicalSuppliesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  // Departments for search dropdown (admin)
  const [departments, setDepartments] = useState<Array<{ ID: number; DepName: string | null; DepName2: string | null }>>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartmentOption[]>([]);

  /** วันนี้ YYYY-MM-DD ตาม UTC — ให้ตรงกับ filter ฝั่ง API ไม่บวก +7 */
  const getTodayDate = () => todayYyyyMmDdUtc();

  // Form filters (for display in form, doesn't trigger search)
  const [formFilters, setFormFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    patientEN: '',
    patientName: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    itemName: '',
    departmentCode: '',
    usageType: '',
    printDate: '',
    timePrintDate: '',
  });

  // Active filters (for actual search, triggers fetchSupplies)
  const [activeFilters, setActiveFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    patientEN: '',
    patientName: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    itemName: '',
    departmentCode: '',
    usageType: '',
    printDate: '',
    timePrintDate: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;


  const fetchSupplies = useCallback(async () => {
    try {
      setLoading(true);

      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.userName) params.user_name = activeFilters.userName;
      if (activeFilters.itemName?.trim()) params.item_keyword = activeFilters.itemName.trim();
      if (activeFilters.patientName?.trim()) params.patient_keyword = activeFilters.patientName.trim();
      if (activeFilters.patientHN?.trim()) params.patient_hn = activeFilters.patientHN.trim();
      if (activeFilters.patientEN?.trim()) params.EN = activeFilters.patientEN.trim();
      if (activeFilters.firstName?.trim()) params.first_name = activeFilters.firstName.trim();
      if (activeFilters.lastName?.trim()) params.lastname = activeFilters.lastName.trim();
      if (activeFilters.assessionNo?.trim()) params.assession_no = activeFilters.assessionNo.trim();
      if (activeFilters.departmentCode?.trim()) params.department_code = activeFilters.departmentCode.trim();
      if (activeFilters.usageType?.trim()) params.usage_type = activeFilters.usageType.trim();
      if (activeFilters.printDate?.trim()) params.print_date = activeFilters.printDate.trim();
      if (activeFilters.timePrintDate?.trim()) params.time_print_date = activeFilters.timePrintDate.trim();

      const response = (await medicalSuppliesApi.getAll(params)) as {
        success?: boolean;
        data?: unknown[];
        total?: number;
        lastPage?: number;
        message?: string;
      };

      if (response?.success === false) {
        toast.error(response.message || 'โหลดข้อมูลไม่สำเร็จ');
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
        return;
      }

      const dataArray = Array.isArray(response?.data) ? response.data : [];
      setSupplies(dataArray);
      setTotalItems(response?.total ?? dataArray.length);
      setTotalPages(
        response?.lastPage ??
          (Math.ceil((response?.total ?? dataArray.length) / itemsPerPage) || 1),
      );
    } catch (error) {
      console.error('Failed to fetch medical supplies:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [activeFilters, currentPage, itemsPerPage]);

  // Load departments + แผนกย่อย master สำหรับ filter
  useEffect(() => {
    const load = async () => {
      try {
        const res = await departmentApi.getAll({ limit: 500 });
        if (res?.data && Array.isArray(res.data)) setDepartments(res.data);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await medicalSupplySubDepartmentsApi.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setSubDepartments(res.data as SubDepartmentOption[]);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (user?.id) {
      void fetchSupplies();
    }
  }, [user?.id, fetchSupplies]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    // Copy formFilters to activeFilters to trigger search
    setActiveFilters(formFilters);
    setCurrentPage(1);
    // ปิดการ์ดรายละเอียด "รายการอุปกรณ์ที่เบิก" เมื่อมีการกรอง/ค้นหาใหม่ (จะโหลดใหม่เมื่อเลือกแถวอีกครั้ง)
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    // useEffect will trigger fetchSupplies when activeFilters and currentPage change
  };

  const handleReset = () => {
    const resetFilters = {
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      patientHN: '',
      patientEN: '',
      patientName: '',
      keyword: '',
      userName: '',
      firstName: '',
      lastName: '',
      assessionNo: '',
      itemName: '',
      departmentCode: '',
      usageType: '',
      printDate: '',
      timePrintDate: '',
    };
    setFormFilters(resetFilters);
    setActiveFilters(resetFilters);
    setCurrentPage(1);
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    // useEffect will trigger fetchSupplies when activeFilters and currentPage change
  };

  const handleSelectSupply = (supply: any) => {
    const supplyData = supply.data || supply;
    const id = supply.id || supplyData.id;
    setSelectedSupply(supply);
    setSelectedSupplyId(id);
    setTimeout(() => {
      const detailSection = document.getElementById('supply-details');
      if (detailSection) {
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(format);
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      const params = {
        item_keyword: activeFilters.itemName?.trim() || undefined,
        patient_keyword: activeFilters.patientName?.trim() || undefined,
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        patientHn: activeFilters.patientHN?.trim() || undefined,
        EN: activeFilters.patientEN?.trim() || undefined,
        departmentCode: activeFilters.departmentCode || undefined,
        usageType: activeFilters.usageType || undefined,
      };

      if (format === 'excel') {
        await vendingReportsApi.downloadDispensedItemsForPatientsExcel(params);
      } else {
        await vendingReportsApi.downloadDispensedItemsForPatientsPdf(params);
      }

      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    } finally {
      setExportLoading(null);
    }
  };


  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 pb-4 sm:pb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white truncate">
                  บันทึกใช้อุปกรณ์กับคนไข้
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  ประวัติการเบิกอุปกรณ์จากตู้ SmartCabinet
                </p>
              </div>
            </div>
          </div>

          <MedicalSuppliesSearchFilters
            formFilters={formFilters}
            activeFilters={activeFilters}
            onPatchFormFilters={(patch) => setFormFilters((prev) => ({ ...prev, ...patch }))}
            departments={departments}
            subDepartments={subDepartments}
            loading={loading}
            onSearch={handleSearch}
            onReset={handleReset}
            onReload={() => void fetchSupplies()}
          />

          {/* Table */}
          <MedicalSuppliesTable
            loading={loading}
            supplies={supplies}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onSelectSupply={handleSelectSupply}
            selectedSupplyId={selectedSupplyId}
            onExportExcel={() => handleExportReport('excel')}
            onExportPdf={() => handleExportReport('pdf')}
            exportLoading={exportLoading}
            filters={activeFilters}
          />

          {selectedSupply && selectedSupplyId && (
            <MedicalSupplySelectedDetailSection
              selectedSupply={selectedSupply}
              activeFilters={activeFilters}
            />
          )}
        </div>

      </AppLayout>
    </ProtectedRoute>
  );
}
