import staffApi from './index';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

// =========================== Cabinet API ===========================
export const staffCabinetApi = {
  getAll: async (params?: { page?: number; limit?: number; keyword?: string; sort_by?: string; sort_order?: string }): Promise<PaginatedResponse<any>> => {
    const response = await staffApi.get('/cabinets', { params });
    return response.data;
  },
};

// =========================== Cabinet Department Mapping API ===========================
export const staffCabinetDepartmentApi = {
  getAll: async (params?: { cabinetId?: number; departmentId?: number; status?: string; keyword?: string }): Promise<ApiResponse<any[]>> => {
    // แปลง camelCase -> snake_case ให้ตรงกับ backend
    const apiParams: Record<string, unknown> = {};
    if (params?.cabinetId !== undefined) apiParams.cabinet_id = params.cabinetId;
    if (params?.departmentId !== undefined) apiParams.department_id = params.departmentId;
    if (params?.status !== undefined) apiParams.status = params.status;
    if (params?.keyword !== undefined && params.keyword !== "") apiParams.keyword = params.keyword;

    const response = await staffApi.get('/cabinet-departments', { params: apiParams });
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await staffApi.post('/cabinet-departments', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await staffApi.put(`/cabinet-departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await staffApi.delete(`/cabinet-departments/${id}`);
    return response.data;
  },

  getItemStocksByCabinet: async (cabinetId: number, params?: { page?: number; limit?: number; keyword?: string }): Promise<ApiResponse<any>> => {
    const response = await staffApi.get('/item-stocks/in-cabinet', {
      params: { ...params, cabinet_id: cabinetId }
    });
    return response.data;
  },

  /** รายงานจัดการตู้ Cabinet - แผนก (Excel) — POST /reports/cabinet-departments/excel */
  downloadCabinetDepartmentsExcel: async (params?: { cabinetId?: number; departmentId?: number; status?: string }): Promise<void> => {
    const body = { cabinetId: params?.cabinetId, departmentId: params?.departmentId, status: params?.status };
    const response = await staffApi.post('/reports/cabinet-departments/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `cabinet_departments_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานจัดการตู้ Cabinet - แผนก (PDF) — POST /reports/cabinet-departments/pdf */
  downloadCabinetDepartmentsPdf: async (params?: { cabinetId?: number; departmentId?: number; status?: string }): Promise<void> => {
    const body = { cabinetId: params?.cabinetId, departmentId: params?.departmentId, status: params?.status };
    const response = await staffApi.post('/reports/cabinet-departments/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `cabinet_departments_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const staffCabinetSubDepartmentApi = {
  getAll: async (params?: {
    cabinetId?: number;
    subDepartmentId?: number;
    departmentId?: number;
    status?: string;
    keyword?: string;
  }): Promise<ApiResponse<any[]>> => {
    const apiParams: Record<string, unknown> = {};
    if (params?.cabinetId !== undefined) apiParams.cabinet_id = params.cabinetId;
    if (params?.subDepartmentId !== undefined) apiParams.sub_department_id = params.subDepartmentId;
    if (params?.departmentId !== undefined) apiParams.department_id = params.departmentId;
    if (params?.status !== undefined) apiParams.status = params.status;
    if (params?.keyword !== undefined && params.keyword !== '') apiParams.keyword = params.keyword;
    const response = await staffApi.get('/cabinet-sub-departments', { params: apiParams });
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await staffApi.post('/cabinet-sub-departments', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await staffApi.put(`/cabinet-sub-departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await staffApi.delete(`/cabinet-sub-departments/${id}`);
    return response.data;
  },
};