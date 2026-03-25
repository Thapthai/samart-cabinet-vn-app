import staffApi from './index';
import type { ApiResponse } from '@/types/common';

type NestedFileResponse = {
  success?: boolean;
  data?: { buffer?: string; filename?: string; contentType?: string };
  error?: string;
};

function nestedDataToBlob(res: NestedFileResponse): Blob {
  if (!res?.success || !res?.data?.buffer) throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ได้');
  const binary = atob(res.data.buffer);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: res.data.contentType || 'application/octet-stream' });
}

function triggerNestedDownload(res: NestedFileResponse, fallbackFilename: string): void {
  const blob = nestedDataToBlob(res);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', res.data?.filename || fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

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

export const staffVendingReportsApi = {
  getVendingMappingData: async (params?: { startDate?: string; endDate?: string; printDate?: string }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.post('/reports/vending-mapping/data', {
      startDate: params?.startDate,
      endDate: params?.endDate,
      printDate: params?.printDate,
    });
    return response.data;
  },

  getUnmappedDispensedData: async (params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.post('/reports/unmapped-dispensed/data', {
      startDate: params?.startDate,
      endDate: params?.endDate,
      groupBy: params?.groupBy,
    });
    return response.data;
  },

  getUnusedDispensedData: async (params?: { date?: string }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.post('/reports/unused-dispensed/data', { date: params?.date });
    return response.data;
  },

  getCancelBillReportData: async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<unknown>> => {
    const response = await staffApi.post('/reports/cancel-bill/data', {
      startDate: params?.startDate,
      endDate: params?.endDate,
    });
    return response.data;
  },

  downloadDispensedItemsForPatientsExcel: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/dispensed-items-for-patients/excel', {
      keyword: params?.keyword,
      startDate: params?.startDate,
      endDate: params?.endDate,
      patientHn: params?.patientHn,
      departmentCode: params?.departmentCode,
      usageType: params?.usageType,
    });
    triggerNestedDownload(
      response.data,
      `dispensed_items_for_patients_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  },

  downloadDispensedItemsForPatientsPdf: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/dispensed-items-for-patients/pdf', {
      keyword: params?.keyword,
      startDate: params?.startDate,
      endDate: params?.endDate,
      patientHn: params?.patientHn,
      departmentCode: params?.departmentCode,
      usageType: params?.usageType,
    });
    triggerNestedDownload(
      response.data,
      `dispensed_items_for_patients_${new Date().toISOString().split('T')[0]}.pdf`,
    );
  },

  downloadVendingMappingExcel: async (params: { startDate?: string; endDate?: string; printDate?: string }) => {
    const response = await staffApi.post('/reports/vending-mapping/excel', {
      startDate: params.startDate,
      endDate: params.endDate,
      printDate: params.printDate,
    });
    return nestedDataToBlob(response.data);
  },

  downloadVendingMappingPDF: async (params: { startDate?: string; endDate?: string; printDate?: string }) => {
    const response = await staffApi.post('/reports/vending-mapping/pdf', {
      startDate: params.startDate,
      endDate: params.endDate,
      printDate: params.printDate,
    });
    return nestedDataToBlob(response.data);
  },

  downloadUnmappedDispensedExcel: async (params: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' }) => {
    const response = await staffApi.post('/reports/unmapped-dispensed/excel', {
      startDate: params.startDate,
      endDate: params.endDate,
      groupBy: params.groupBy,
    });
    return nestedDataToBlob(response.data);
  },

  downloadUnusedDispensedExcel: async (params: { date?: string }) => {
    const response = await staffApi.post('/reports/unused-dispensed/excel', { date: params.date });
    return nestedDataToBlob(response.data);
  },

  downloadReturnReportExcel: async (params?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/return/excel', {
      date_from: params?.date_from,
      date_to: params?.date_to,
      return_reason: params?.return_reason,
      department_code: params?.department_code,
      patient_hn: params?.patient_hn,
    });
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `return_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  downloadReturnReportPdf: async (params?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/return/pdf', {
      date_from: params?.date_from,
      date_to: params?.date_to,
      return_reason: params?.return_reason,
      department_code: params?.department_code,
      patient_hn: params?.patient_hn,
    });
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `return_report_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  downloadCancelBillReportExcel: async (params?: { startDate?: string; endDate?: string }): Promise<void> => {
    const response = await staffApi.post('/reports/cancel-bill/excel', {
      startDate: params?.startDate,
      endDate: params?.endDate,
    });
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `cancel_bill_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  downloadCancelBillReportPdf: async (params?: { startDate?: string; endDate?: string }): Promise<void> => {
    const response = await staffApi.post('/reports/cancel-bill/pdf', {
      startDate: params?.startDate,
      endDate: params?.endDate,
    });
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `cancel_bill_report_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  downloadReturnToCabinetReportExcel: async (params?: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/return-to-cabinet/excel', {
      keyword: params?.keyword,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
    });
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
  }): Promise<void> => {
    const response = await staffApi.post('/reports/return-to-cabinet/pdf', {
      keyword: params?.keyword,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
    });
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string; error?: string };
    triggerFlatBufferDownload(res, `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.pdf`);
  },
};
