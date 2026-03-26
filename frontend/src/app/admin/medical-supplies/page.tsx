'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi, vendingReportsApi, departmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { History } from 'lucide-react';
import MedicalSuppliesTable from './components/MedicalSuppliesTable';
import MedicalSuppliesSearchFilters from './components/MedicalSuppliesSearchFilters';
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
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  /** วันนี้ YYYY-MM-DD ตาม UTC — ให้ตรงกับ filter ฝั่ง API ไม่บวก +7 */
  const getTodayDate = () => todayYyyyMmDdUtc();

  // Form filters (for display in form, doesn't trigger search)
  const [formFilters, setFormFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    patientEN: '',
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


  const fetchSupplies = async (customFilters?: typeof activeFilters, customPage?: number) => {
    try {
      setLoading(true);
      const filtersToUse = customFilters || activeFilters;
      const activePage = customPage !== undefined ? customPage : currentPage;

      const params: any = {
        page: activePage,
        limit: itemsPerPage,
      };

      if (filtersToUse.startDate) params.startDate = filtersToUse.startDate;
      if (filtersToUse.endDate) params.endDate = filtersToUse.endDate;
      if (filtersToUse.userName) params.user_name = filtersToUse.userName;
      if (filtersToUse.itemName) params.keyword = filtersToUse.itemName;
      if (filtersToUse.patientHN?.trim()) params.patient_hn = filtersToUse.patientHN.trim();
      if (filtersToUse.patientEN?.trim()) params.EN = filtersToUse.patientEN.trim();
      if (filtersToUse.firstName?.trim()) params.first_name = filtersToUse.firstName.trim();
      if (filtersToUse.lastName?.trim()) params.lastname = filtersToUse.lastName.trim();
      if (filtersToUse.assessionNo?.trim()) params.assession_no = filtersToUse.assessionNo.trim();
      if (filtersToUse.departmentCode?.trim()) params.department_code = filtersToUse.departmentCode.trim();
      if (filtersToUse.usageType?.trim()) params.usage_type = filtersToUse.usageType.trim();
      if (filtersToUse.printDate?.trim()) params.print_date = filtersToUse.printDate.trim();
      if (filtersToUse.timePrintDate?.trim()) params.time_print_date = filtersToUse.timePrintDate.trim();

      const response: any = await medicalSuppliesApi.getAll(params);

      if (response?.success === false) {
        toast.error(response.message || 'โหลดข้อมูลไม่สำเร็จ');
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
        return;
      }
      if (response && response.data) {
        let dataArray: any[] = [];

        if (Array.isArray(response.data)) {
          dataArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
        } else if (response.data && typeof response.data === 'object') {
          dataArray = [response.data];
        }

        setSupplies(dataArray);

        const totalItems = response.total || dataArray.length;
        const calculatedPages = Math.ceil(totalItems / itemsPerPage);

        setTotalPages(calculatedPages || 1);
        setTotalItems(totalItems);
      } else {
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Failed to fetch medical supplies:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // Load departments for admin filter dropdown
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

  // Update fetchSupplies when activeFilters or currentPage change
  useEffect(() => {
    if (user?.id) {
      fetchSupplies(activeFilters, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeFilters, currentPage]);

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
    setDepartmentSearch('');
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
        keyword: activeFilters.itemName || undefined,
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        patientHn: activeFilters.patientHN || undefined,
        EN: activeFilters.patientEN || undefined,
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
            onPatchFormFilters={(patch) => setFormFilters((prev) => ({ ...prev, ...patch }))}
            departments={departments}
            departmentSearch={departmentSearch}
            onDepartmentSearchChange={setDepartmentSearch}
            departmentDropdownOpen={departmentDropdownOpen}
            onDepartmentDropdownOpenChange={setDepartmentDropdownOpen}
            loading={loading}
            onSearch={handleSearch}
            onReset={handleReset}
            onReload={() => fetchSupplies()}
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
