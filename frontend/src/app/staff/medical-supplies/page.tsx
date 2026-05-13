'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { History } from 'lucide-react';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { staffVendingReportsApi } from '@/lib/staffApi/vendingReportsApi';
import MedicalSuppliesTable from './components/MedicalSuppliesTable';
import MedicalSuppliesSearchFilters from './components/MedicalSuppliesSearchFilters';
import MedicalSupplySelectedDetailSection from './components/MedicalSupplySelectedDetailSection';
import { todayYyyyMmDdUtc } from '@/lib/formatThaiDateTime';

export default function MedicalSuppliesPage() {
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

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


  const fetchSupplies = async (
    customFilters?: typeof activeFilters,
    customPage?: number,
    opts?: { silent?: boolean },
  ) => {
    try {
      setLoading(true);
      const filtersToUse = customFilters ?? activeFilters;
      const activePage = customPage !== undefined ? customPage : currentPage;

      const params: Record<string, string | number> = {
        page: activePage,
        limit: itemsPerPage,
      };

      if (filtersToUse.startDate) params.startDate = filtersToUse.startDate;
      if (filtersToUse.endDate) params.endDate = filtersToUse.endDate;
      if (filtersToUse.userName) params.user_name = filtersToUse.userName;
      if (filtersToUse.itemName?.trim()) params.item_keyword = filtersToUse.itemName.trim();
      if (filtersToUse.patientName?.trim()) params.patient_keyword = filtersToUse.patientName.trim();
      if (filtersToUse.patientHN?.trim()) params.patient_hn = filtersToUse.patientHN.trim();
      if (filtersToUse.patientEN?.trim()) params.EN = filtersToUse.patientEN.trim();
      if (filtersToUse.firstName?.trim()) params.first_name = filtersToUse.firstName.trim();
      if (filtersToUse.lastName?.trim()) params.lastname = filtersToUse.lastName.trim();
      if (filtersToUse.assessionNo?.trim()) params.assession_no = filtersToUse.assessionNo.trim();
      if (filtersToUse.departmentCode?.trim()) params.department_code = filtersToUse.departmentCode.trim();
      if (filtersToUse.usageType?.trim()) params.usage_type = filtersToUse.usageType.trim();
      if (filtersToUse.printDate?.trim()) params.print_date = filtersToUse.printDate.trim();
      if (filtersToUse.timePrintDate?.trim()) params.time_print_date = filtersToUse.timePrintDate.trim();

      const response = (await staffMedicalSuppliesApi.getAll(params)) as {
        success?: boolean;
        message?: string;
        data?: unknown;
        total?: number;
        limit?: number;
        totalPages?: number;
      };

      const raw = response?.data;
      const dataArray: unknown[] = Array.isArray(raw)
        ? raw
        : raw != null && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
          ? ((raw as { data: unknown[] }).data ?? [])
          : raw != null && typeof raw === 'object'
            ? [raw]
            : [];

      if (response?.success === false) {
        toast.error(response?.message || 'ไม่สามารถโหลดข้อมูลได้');
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
        return;
      }

      setSupplies(dataArray as any[]);

      const total =
        typeof response.total === 'number' && Number.isFinite(response.total)
          ? response.total
          : dataArray.length;
      const limit =
        typeof response.limit === 'number' && response.limit > 0 ? response.limit : itemsPerPage;
      const pagesFromApi =
        typeof response.totalPages === 'number' && response.totalPages > 0
          ? response.totalPages
          : Math.ceil(total / limit) || 1;

      setTotalPages(pagesFromApi);
      setTotalItems(total);

      if (!opts?.silent) {
        if (dataArray.length === 0) {
          toast.info('ไม่พบข้อมูลการใช้อุปกรณ์กับคนไข้ กรุณาตรวจสอบช่วงวันที่หรือเงื่อนไขค้นหา');
        } else {
          toast.success(`พบ ${total} รายการ`);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to fetch medical supplies:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || (error instanceof Error ? error.message : null) || 'ไม่สามารถโหลดข้อมูลได้');
      setSupplies([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchSupplies(undefined, 1, { silent: true });
    // โหลดครั้งแรกด้วยตัวกรองเริ่มต้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void fetchSupplies(activeFilters, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    const next = { ...formFilters };
    setActiveFilters(next);
    setCurrentPage(1);
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    void fetchSupplies(next, 1);
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
    void fetchSupplies(resetFilters, 1, { silent: true });
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
        patientHn: activeFilters.patientHN?.trim() || undefined,
        departmentCode: activeFilters.departmentCode?.trim() || undefined,
        usageType: activeFilters.usageType?.trim() || undefined,
      };

      if (format === 'excel') {
        await staffVendingReportsApi.downloadDispensedItemsForPatientsExcel(params);
      } else {
        await staffVendingReportsApi.downloadDispensedItemsForPatientsPdf(params);
      }

      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    } finally {
      setExportLoading(null);
    }
  };


  return (
    <>
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
                ประวัติการเบิกจากตู้ SmartCabinet — ค้นหา ดูรายละเอียด และส่งออกรายงาน
              </p>
            </div>
          </div>
        </div>

        <MedicalSuppliesSearchFilters
          formFilters={formFilters}
          onPatchFormFilters={(patch) => setFormFilters((prev) => ({ ...prev, ...patch }))}
          loading={loading}
          onSearch={handleSearch}
          onReset={handleReset}
          onReload={() => void fetchSupplies(activeFilters, currentPage)}
          departmentDisabled={false}
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

    </>
  );
}
