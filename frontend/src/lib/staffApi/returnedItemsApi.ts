import staffApi from './index';
import type { ApiResponse } from '@/types/common';

function triggerFlatBufferDownload(
  res: { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string },
  fallbackFilename: string,
): void {
  if (!res?.success || !res?.buffer) throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ได้');
  const binary = atob(res.buffer);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: res.contentType || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', res.filename || fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const returnedItemsApi = {
  getReturnedItems: async (query?: {
    keyword?: string;
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string | number;
    cabinetId?: string | number;
    departmentCode?: string;
    cabinetCode?: string;
  }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.get('/medical-supply/returned-items', { params: query });
    return response.data;
  },

  downloadReturnToCabinetReportExcel: async (params?: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    departmentCode?: string;
    cabinetCode?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId ?? params?.departmentCode,
      cabinetId: params?.cabinetId ?? params?.cabinetCode,
    };
    const response = await staffApi.post('/reports/return-to-cabinet/excel', body);
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  downloadReturnToCabinetReportPdf: async (params?: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    departmentCode?: string;
    cabinetCode?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId ?? params?.departmentCode,
      cabinetId: params?.cabinetId ?? params?.cabinetCode,
    };
    const response = await staffApi.post('/reports/return-to-cabinet/pdf', body);
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.pdf`);
  },
};
