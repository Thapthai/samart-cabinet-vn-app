'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { reportsApi } from '@/lib/api';
import { toast } from 'sonner';
import { FileBarChart, Search, Download, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ComparisonTable from '../components/ComparisonTable';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';

export default function ComparisonReportPage() {
  const { user } = useAuth();
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedUsageId, setSelectedUsageId] = useState<number | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [searchPatientHN, setSearchPatientHN] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchAssessionNo, setSearchAssessionNo] = useState('');
  const [directUsageId, setDirectUsageId] = useState('');
  const [usageList, setUsageList] = useState<any[]>([]);
  const [filteredUsageList, setFilteredUsageList] = useState<any[]>([]);


  useEffect(() => {
    fetchUsageList();
  }, []);


  const fetchUsageList = async () => {
    try {
      setLoadingList(true);
      const response = await staffMedicalSuppliesApi.getAll({
        page: 1,
        limit: 100,
      });


      if (response.data) {
        // Handle both single object and array response
        const dataArray = Array.isArray(response.data) ? response.data : [response];
        setUsageList(dataArray);
        setFilteredUsageList(dataArray);
      }
    } catch (error: any) {
      console.error('❌ Error fetching usage list:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลรายการเบิก');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchComparisonData = async (usageId: number) => {
    try {
      setLoadingDetail(true);

      // ดึงข้อมูล usage และ supply items
      const [usageResponse, itemsResponse] = await Promise.all([
        staffMedicalSuppliesApi.getById(usageId),
        staffMedicalSuppliesApi.getSupplyItemsByUsageId(usageId)
      ]);

      if (usageResponse.success && itemsResponse.success) {
        setComparisonData({
          usage: usageResponse.data,
          items: itemsResponse.data || []
        });
      } else {
        toast.error('ไม่พบข้อมูล');
        setComparisonData(null);
      }
    } catch (error: any) {
      console.error('Error fetching comparison data:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      setComparisonData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectUsage = (usageId: number) => {
    setSelectedUsageId(usageId);
    fetchComparisonData(usageId);
  };

  const handleSearch = async () => {
    // ถ้าไม่มีค่าค้นหาใดๆ ให้แสดงทั้งหมด
    if (!searchPatientHN.trim() && !searchFirstName.trim() && !searchLastName.trim() && !searchAssessionNo.trim()) {
      setFilteredUsageList(usageList);
      toast.info('แสดงรายการทั้งหมด');
      return;
    }

    try {
      setLoadingList(true);

      const params: any = {
        page: 1,
        limit: 10000, // Large limit to get all matching records
      };

      if (searchPatientHN.trim()) params.patient_hn = searchPatientHN.trim();
      if (searchFirstName.trim()) params.first_name = searchFirstName.trim();
      if (searchLastName.trim()) params.lastname = searchLastName.trim();
      if (searchAssessionNo.trim()) params.assession_no = searchAssessionNo.trim();

      const response = await staffMedicalSuppliesApi.getAll(params);


      if (response.data || response.success) {
        // Handle both single object and array response
        let dataArray: any[] = [];

        if (Array.isArray(response.data)) {
          // Already an array
          dataArray = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Single object wrapped in data
          dataArray = [response];
        } else if (response.success && !response.data) {
          // Single object format (old format)
          dataArray = [response];
        }


        if (dataArray.length > 0) {
          setFilteredUsageList(dataArray);
          toast.success(`พบ ${dataArray.length} รายการเบิก`);
        } else {
          setFilteredUsageList([]);
          toast.error('ไม่พบข้อมูลการเบิกของผู้ป่วยนี้');
        }
      } else {
        setFilteredUsageList([]);
        toast.error('ไม่พบข้อมูลการเบิกของผู้ป่วยนี้');
      }
    } catch (error: any) {
      console.error('❌ Error searching patient:', error);
      toast.error('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoadingList(false);
    }
  };

  const handleClearSearch = () => {
    setSearchPatientHN('');
    setSearchFirstName('');
    setSearchLastName('');
    setSearchAssessionNo('');
    setFilteredUsageList(usageList);
  };

  const handleExportCSV = () => {
    if (!comparisonData?.items || comparisonData.items.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับ export');
      return;
    }

    try {
      // สร้าง CSV content
      const headers = ['ลำดับ', 'รหัสอุปกรณ์', 'อุปกรณ์', 'จำนวนเบิก', 'บันทึกใช้กับคนไข้', 'ต้องนำกลับเข้าตู้', 'สถานะ'];
      const rows: (string | number)[][] = comparisonData.items.map((item: any, index: number) => {
        const qtyPending = item.qty_pending || (item.qty - item.qty_used_with_patient - item.qty_returned_to_cabinet);
        const status = qtyPending === 0 && item.qty_returned_to_cabinet === 0 ? 'Match' : 'Not Match';

        return [
          index + 1,
          item.order_item_code || item.supply_code || '',
          item.order_item_description || item.supply_name || '',
          item.qty || 0,
          item.qty_used_with_patient || 0,
          qtyPending,
          status
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(','))
      ].join('\n');

      // สร้าง Blob และ download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `comparison_report_${selectedUsageId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export สำเร็จ');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('เกิดข้อผิดพลาดในการ export');
    }
  };

  const handleExportExcel = async () => {
    if (!selectedUsageId) {
      toast.error('กรุณาเลือกรายการเบิกก่อน');
      return;
    }

    try {
      const blob = await reportsApi.exportComparisonExcel(selectedUsageId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comparison_report_${selectedUsageId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export Excel สำเร็จ');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการ export');
    }
  };

  const handleExportPDF = async () => {
    if (!selectedUsageId) {
      toast.error('กรุณาเลือกรายการเบิกก่อน');
      return;
    }

    try {
      const blob = await reportsApi.exportComparisonPDF(selectedUsageId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comparison_report_${selectedUsageId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export PDF สำเร็จ');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการ export');
    }
  };

  const calculateSummary = () => {
    if (!comparisonData?.items) return { total: 0, match: 0, notMatch: 0 };

    const summary = comparisonData.items.reduce((acc: any, item: any) => {
      const qtyPending = item.qty_pending || (item.qty - item.qty_used_with_patient - item.qty_returned_to_cabinet);
      const isMatch = qtyPending === 0 && item.qty_returned_to_cabinet === 0;

      return {
        total: acc.total + 1,
        match: acc.match + (isMatch ? 1 : 0),
        notMatch: acc.notMatch + (isMatch ? 0 : 1)
      };
    }, { total: 0, match: 0, notMatch: 0 });

    return summary;
  };

  const summary = calculateSummary();

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileBarChart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายงานเปรียบเทียบการเบิกอุปกรณ์
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                เปรียบเทียบจำนวนเบิกกับการบันทึกใช้กับคนไข้
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>ค้นหาและเลือกรายการเบิก</CardTitle>
            <CardDescription>ค้นหาด้วย HN เพื่อกรองตาราง หรือเลือก Usage ID โดยตรง</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Filters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">ค้นหาด้วย HN ผู้ป่วย</label>
                  <Input
                    placeholder="กรอก HN..."
                    value={searchPatientHN}
                    onChange={(e) => setSearchPatientHN(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">ชื่อ (Firstname)</label>
                  <Input
                    placeholder="กรอกชื่อ..."
                    value={searchFirstName}
                    onChange={(e) => setSearchFirstName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">นามสกุล (Lastname)</label>
                  <Input
                    placeholder="กรอกนามสกุล..."
                    value={searchLastName}
                    onChange={(e) => setSearchLastName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Assession No</label>
                  <Input
                    placeholder="กรอก Assession No..."
                    value={searchAssessionNo}
                    onChange={(e) => setSearchAssessionNo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={loadingList}>
                    <Search className="h-4 w-4 mr-2" />
                    ค้นหา
                  </Button>
                  {(searchPatientHN || searchFirstName || searchLastName || searchAssessionNo) && (
                    <Button onClick={handleClearSearch} variant="outline">
                      ล้าง
                    </Button>
                  )}
                </div>
              </div>

              {/* Direct Usage ID Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">เลือก Usage ID โดยตรง</label>
                <div className="flex gap-2">
                  <Select
                    value={directUsageId}
                    onValueChange={(value) => {
                      setDirectUsageId(value);
                      if (value) {
                        handleSelectUsage(parseInt(value));
                      }
                    }}
                    disabled={loadingList}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Usage ID..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {filteredUsageList.map((usage: any) => {
                        const usageData = usage.data || usage;
                        const id = usageData.id || usage.id;
                        const hn = usageData.patient_hn || '';
                        const name = `${usageData.first_name || ''} ${usageData.lastname || ''}`.trim();
                        const en = usageData.en || '';

                        return (
                          <SelectItem key={id} value={id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-semibold">ID: {id} - HN: {hn}</span>
                              {name && <span className="text-xs text-gray-500">{name} {en && `(EN: ${en})`}</span>}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <Button onClick={fetchUsageList} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    รีเฟรช
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage List Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการเบิกทั้งหมด</CardTitle>
            <CardDescription>
              คลิกที่รายการเพื่อดูรายละเอียดการเปรียบเทียบ
              {(searchPatientHN || searchFirstName || searchLastName || searchAssessionNo) && (
                <span className="ml-2">
                  (กรองด้วย: {[
                    searchPatientHN && `HN: ${searchPatientHN}`,
                    searchFirstName && `ชื่อ: ${searchFirstName}`,
                    searchLastName && `นามสกุล: ${searchLastName}`,
                    searchAssessionNo && `Assession No: ${searchAssessionNo}`
                  ].filter(Boolean).join(', ')})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500">กำลังโหลดรายการเบิก...</span>
              </div>
            ) : filteredUsageList.length === 0 ? (
              <div className="text-center py-12">
                <FileBarChart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">ไม่พบรายการเบิก</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Usage ID</TableHead>
                      <TableHead>HN</TableHead>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>EN</TableHead>
                      <TableHead>แผนก</TableHead>
                      <TableHead>วันที่เบิก</TableHead>
                      <TableHead className="w-[100px]">จำนวนรายการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsageList.map((usage: any, index: number) => {
                      const usageData = usage.data || usage;

                      // Try to find ID from various possible locations
                      const id = usage.id || usage.usage_id || usageData.id;
                      const isSelected = selectedUsageId === id;

                      // If no ID, skip this row
                      if (!id) {
                        console.warn('⚠️ No ID found for usage at index', index, usage);
                        return null;
                      }

                      return (
                        <TableRow
                          key={id}
                          className={`cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''
                            }`}
                          onClick={() => handleSelectUsage(id)}
                        >
                          <TableCell className="font-medium">
                            {isSelected && <Badge variant="default" className="mr-2">เลือก</Badge>}
                            {id}
                          </TableCell>
                          <TableCell>{usageData.patient_hn || '-'}</TableCell>
                          <TableCell>
                            {`${usageData.first_name || ''} ${usageData.lastname || ''}`.trim() || '-'}
                          </TableCell>
                          <TableCell>{usageData.en || '-'}</TableCell>
                          <TableCell>{usageData.department_code || '-'}</TableCell>
                          <TableCell>
                            {usageData.usage_datetime || usage.created_at
                              ? formatUtcDateTime(String(usageData.usage_datetime || usage.created_at))
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {usage.supplies_count || usageData.items?.length || 0}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Section - Only show when item is selected */}
        {selectedUsageId && (
          <>
            {/* Patient Info */}
            {comparisonData?.usage && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ข้อมูลผู้ป่วย (Usage ID: {selectedUsageId})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleExportCSV}
                        disabled={!comparisonData?.items || comparisonData.items.length === 0}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button
                        onClick={handleExportExcel}
                        disabled={!selectedUsageId}
                        variant="outline"
                        size="sm"
                      >
                        <FileBarChart className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        onClick={handleExportPDF}
                        disabled={!selectedUsageId}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">HN</p>
                      <p className="font-semibold">{comparisonData.usage.patient_hn}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
                      <p className="font-semibold">
                        {comparisonData.usage.first_name} {comparisonData.usage.lastname}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">EN</p>
                      <p className="font-semibold">{comparisonData.usage.en || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">แผนก</p>
                      <p className="font-semibold">{comparisonData.usage.department_code || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            {comparisonData?.items && comparisonData.items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">รายการทั้งหมด</p>
                      <p className="text-3xl font-bold text-blue-600">{summary.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">ตรงกัน (Match)</p>
                      <p className="text-3xl font-bold text-green-600">{summary.match}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">ไม่ตรงกัน (Not Match)</p>
                      <p className="text-3xl font-bold text-red-600">{summary.notMatch}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Comparison Table */}
            {loadingDetail ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                    <span className="ml-3 text-gray-500">กำลังโหลดรายละเอียด...</span>
                  </div>
                </CardContent>
              </Card>
            ) : comparisonData?.items && comparisonData.items.length > 0 ? (
              <ComparisonTable items={comparisonData.items} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <FileBarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      ไม่พบข้อมูลสำหรับรายการเบิกนี้
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
