import staffApi from './index';
import type { ApiResponse } from '@/types/common';

export const staffDepartmentApi = {
  getAll: async (params?: { page?: number; limit?: number; keyword?: string; isCancel?: boolean; withCabinet?: boolean }): Promise<ApiResponse<any[]>> => {
    const safeParams: Record<string, string | number | boolean> = { ...params };
    if (params?.withCabinet === true) {
      safeParams.with_cabinet = true;
    }
    delete safeParams.withCabinet;
    const response = await staffApi.get('/departments', { params: safeParams });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<any>> => {
    const response = await staffApi.get(`/departments/${id}`);
    return response.data;
  },

  create: async (data: {
    DepName?: string;
    DepName2?: string;
    RefDepID?: string;
    IsCancel?: number;
    DivID?: number;
    sort?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await staffApi.post('/departments', data);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      DepName?: string;
      DepName2?: string;
      RefDepID?: string;
      IsCancel?: number;
      DivID?: number;
      sort?: number;
    },
  ): Promise<ApiResponse<any>> => {
    const response = await staffApi.put(`/departments/${id}`, data);
    return response.data;
  },
};
