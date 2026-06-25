import type { AxiosInstance } from 'axios';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

/**
 * Client สำหรับโมดูลตู้ — นิยามเส้นทางที่เดียว (คู่กับ admin `lib/api.ts`)
 * Staff portal ใช้ factory กับ `staffApi` เท่านั้น ไม่มี logic แยกที่ staffApi/cabinetApi
 */
export function createCabinetUsersApi(http: AxiosInstance) {
  return {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      keyword?: string;
      /** Division = department.ID */
      department_id?: number;
      /** ตู้ = app_cabinets.id (backend แปลงไป stock_id ให้) */
      cabinet_id?: number;
    }): Promise<PaginatedResponse<any>> => {
      const response = await http.get('/cabinet/users', { params });
      return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<any>> => {
      const response = await http.get(`/cabinet/users/${id}`);
      return response.data;
    },

    create: async (body: {
      user_name: string;
      emp_code?: string | null;
      password?: string;
      cabinet_ids?: number[];
    }): Promise<ApiResponse<any>> => {
      const response = await http.post('/cabinet/users', body);
      return response.data;
    },

    update: async (
      id: number,
      body: {
        cabinet_ids?: number[];
      },
    ): Promise<ApiResponse<any>> => {
      const response = await http.put(`/cabinet/users/${id}`, body);
      return response.data;
    },
  };
}

/** รายการตู้ GET /cabinets — ใช้กับ Workspace ที่ต้องการแค่โหลดรายการตู้ */
export function createCabinetListGetAll(http: AxiosInstance) {
  return {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      keyword?: string;
      sort_by?: string;
      sort_order?: string;
      department_id?: number;
    }): Promise<PaginatedResponse<any>> => {
      const response = await http.get('/cabinets', { params });
      return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<any>> => {
      const response = await http.get(`/cabinets/${id}`);
      return response.data;
    },
  };
}
