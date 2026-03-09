import staffApi from './index';
import type { ApiResponse } from '@/types/common';

export const staffVendingReportsApi = {
  // Get data (JSON)
  getVendingMappingData: async (params?: { startDate?: string; endDate?: string; printDate?: string }): Promise<ApiResponse<unknown>> => {
    const queryParams = new URLSearchParams();
    if (params?.printDate) queryParams.append('printDate', params.printDate);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/vending-mapping/data?${queryParams.toString()}`);
    return response.data;
  },
  getUnmappedDispensedData: async (params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' }): Promise<ApiResponse<unknown>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    const response = await staffApi.get(`/reports/unmapped-dispensed/data?${queryParams.toString()}`);
    return response.data;
  },
  getUnusedDispensedData: async (params?: { date?: string }): Promise<ApiResponse<unknown>> => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    const response = await staffApi.get(`/reports/unused-dispensed/data?${queryParams.toString()}`);
    return response.data;
  },
  getCancelBillReportData: async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<unknown>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/cancel-bill/data?${queryParams.toString()}`);
    return response.data;
  },
  /** ดาวน์โหลดรายงานเบิกใช้กับคนไข้ (Excel/PDF) โดยไม่เปิดแท็บใหม่ */
  downloadDispensedItemsForPatientsExcel: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.patientHn) queryParams.append('patientHn', params.patientHn);
    if (params?.departmentCode) queryParams.append('departmentCode', params.departmentCode);
    if (params?.usageType) queryParams.append('usageType', params.usageType);
    const response = await staffApi.get(
      `/reports/dispensed-items-for-patients/export/excel?${queryParams.toString()}`,
      { responseType: 'blob' },
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dispensed_items_for_patients_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadDispensedItemsForPatientsPdf: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.patientHn) queryParams.append('patientHn', params.patientHn);
    if (params?.departmentCode) queryParams.append('departmentCode', params.departmentCode);
    if (params?.usageType) queryParams.append('usageType', params.usageType);
    const response = await staffApi.get(
      `/reports/dispensed-items-for-patients/export/pdf?${queryParams.toString()}`,
      { responseType: 'blob' },
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dispensed_items_for_patients_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  // Download reports
  downloadVendingMappingExcel: async (params: { startDate?: string; endDate?: string; printDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.printDate) queryParams.append('printDate', params.printDate);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/vending-mapping/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadVendingMappingPDF: async (params: { startDate?: string; endDate?: string; printDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.printDate) queryParams.append('printDate', params.printDate);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/vending-mapping/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadUnmappedDispensedExcel: async (params: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' }) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.groupBy) queryParams.append('groupBy', params.groupBy);
    const response = await staffApi.get(`/reports/unmapped-dispensed/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadUnusedDispensedExcel: async (params: { date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    const response = await staffApi.get(`/reports/unused-dispensed/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  /** Backend POST /reports/return/excel returns JSON { success, buffer (base64), contentType, filename } */
  downloadReturnReportExcel: async (params?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<void> => {
    const body = {
      date_from: params?.date_from,
      date_to: params?.date_to,
      return_reason: params?.return_reason,
      department_code: params?.department_code,
      patient_hn: params?.patient_hn,
    };
    const response = await staffApi.post('/reports/return/excel', body);
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string };
    if (!res?.success || !res?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.filename || `return_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  /** Backend POST /reports/return/pdf returns JSON { success, buffer (base64), contentType, filename } */
  downloadReturnReportPdf: async (params?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<void> => {
    const body = {
      date_from: params?.date_from,
      date_to: params?.date_to,
      return_reason: params?.return_reason,
      department_code: params?.department_code,
      patient_hn: params?.patient_hn,
    };
    const response = await staffApi.post('/reports/return/pdf', body);
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string };
    if (!res?.success || !res?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.filename || `return_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadCancelBillReportExcel: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/cancel-bill/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cancel_bill_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadCancelBillReportPdf: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/cancel-bill/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cancel_bill_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadReturnToCabinetReportExcel: async (params?: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params?.itemTypeId) queryParams.append('itemTypeId', params.itemTypeId.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/return-to-cabinet/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadReturnToCabinetReportPdf: async (params?: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params?.itemTypeId) queryParams.append('itemTypeId', params.itemTypeId.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await staffApi.get(`/reports/return-to-cabinet/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};