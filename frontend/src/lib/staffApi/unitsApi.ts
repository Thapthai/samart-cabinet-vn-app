import staffApi from './index';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { UnitRow } from '@/lib/api';

/** หน่วยนับ — เรียก `/units` ด้วย Staff token + client credentials (แยกจาก `unitsApi` ของ admin) */
export const staffUnitsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    include_cancelled?: boolean;
    only_cancelled?: boolean;
  }): Promise<PaginatedResponse<UnitRow>> => {
    const apiParams: Record<string, string | number> = {};
    if (params?.page !== undefined) apiParams.page = params.page;
    if (params?.limit !== undefined) apiParams.limit = params.limit;
    if (params?.keyword) apiParams.keyword = params.keyword;
    if (params?.include_cancelled) apiParams.include_cancelled = '1';
    if (params?.only_cancelled) apiParams.only_cancelled = '1';
    const response = await staffApi.get('/units', { params: apiParams });
    return response.data;
  },

  getActive: async (): Promise<ApiResponse<Array<{ id: number; unitName: string }>>> => {
    const response = await staffApi.get('/units/active');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<UnitRow>> => {
    const response = await staffApi.get(`/units/${id}`);
    return response.data;
  },

  create: async (data: { UnitName: string; B_ID?: number }): Promise<ApiResponse<UnitRow>> => {
    const response = await staffApi.post('/units', data);
    return response.data;
  },

  update: async (
    id: number,
    data: { UnitName?: string; B_ID?: number; IsCancel?: boolean },
  ): Promise<ApiResponse<UnitRow>> => {
    const response = await staffApi.put(`/units/${id}`, data);
    return response.data;
  },

  softDelete: async (id: number): Promise<ApiResponse<UnitRow>> => {
    const response = await staffApi.delete(`/units/${id}`);
    return response.data;
  },
};
