import staffApi from './index';
import type { ApiResponse } from '@/types/common';

export const staffDepartmentApi = {
  getAll: async (params?: { page?: number; limit?: number; keyword?: string; isCancel?: boolean }): Promise<ApiResponse<any[]>> => {
    const response = await staffApi.get('/departments', { params });
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
