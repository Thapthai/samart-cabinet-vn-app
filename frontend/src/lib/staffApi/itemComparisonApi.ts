import staffApi from './index';
import type { ApiResponse } from '@/types/common';

export const itemComparisonApi = {
  compareDispensedVsUsage: async (query?: {
    itemCode?: string;
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    cabinetId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.get('/medical-supply/compare-dispensed-vs-usage', { params: query });
    return response.data;
  },

  getUsageByItemCodeFromItemTable: async (query?: {
    itemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.get('/medical-supply/usage-by-item-code-from-item-table', { params: query });
    return response.data;
  },

  /** ดาวน์โหลดรายงานเปรียบเทียบการเบิกและใช้ (Excel) — Backend POST /reports/item-comparison/excel */
  downloadComparisonExcel: async (params?: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    cabinetId?: string;
    includeUsageDetails?: boolean | string;
  }): Promise<void> => {
    const body = {
      itemCode: params?.itemCode,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentCode: params?.departmentCode,
      subDepartmentId: params?.subDepartmentId,
      cabinetId: params?.cabinetId,
      includeUsageDetails: params?.includeUsageDetails,
    };
    const response = await staffApi.post('/reports/item-comparison/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `medical_supplies_comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** ดาวน์โหลดรายงานเปรียบเทียบการเบิกและใช้ (PDF) — Backend POST /reports/item-comparison/pdf */
  downloadComparisonPdf: async (params?: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    cabinetId?: string;
    includeUsageDetails?: boolean | string;
  }): Promise<void> => {
    const body = {
      itemCode: params?.itemCode,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentCode: params?.departmentCode,
      subDepartmentId: params?.subDepartmentId,
      cabinetId: params?.cabinetId,
      includeUsageDetails: params?.includeUsageDetails,
    };
    const response = await staffApi.post('/reports/item-comparison/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `medical_supplies_comparison_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

