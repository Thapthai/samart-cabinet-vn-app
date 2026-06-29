import staffApi from './index';
import type {
  Item,
  CreateItemDto,
  UpdateItemDto,
  GetItemsQuery,
  ItemMasterUploadResult,
} from '@/types/item';
import type { ApiResponse, PaginatedResponse, ItemsStats } from '@/types/common';

type NestedFileResponse = {
  success?: boolean;
  data?: { buffer?: string; filename?: string; contentType?: string };
  error?: string;
};

function triggerNestedDownload(res: NestedFileResponse, fallbackFilename: string): void {
  if (!res?.success || !res?.data?.buffer) throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ได้');
  const binary = atob(res.data.buffer);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: res.data.contentType || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', res.data.filename || fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const staffItemsApi = {
    create: async (data: CreateItemDto): Promise<ApiResponse<Item>> => {
        const { picture, ...restData } = data;
        if (picture && picture instanceof File) {
            const formData = new FormData();
            Object.keys(restData).forEach((key) => {
                const value = restData[key as keyof typeof restData];
                if (value !== undefined && value !== null && value !== '') {
                    formData.append(key, String(value));
                }
            });
            formData.append('picture', picture);
            const response = await staffApi.post('/items/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        }
        const response = await staffApi.post('/items', restData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    },

    getAll: async (query?: GetItemsQuery): Promise<PaginatedResponse<Item>> => {
        const response = await staffApi.get('/staff/items', { params: query });
        return response.data;
    },

    /** รายการ master จากตาราง Item (ทุกรายการ รวมที่ยังไม่มีในตู้) */
    getMasterList: async (query?: {
        page?: number;
        limit?: number;
        keyword?: string;
        sort_by?: string;
        sort_order?: string;
        item_status_filter?: 'all' | 'active' | 'inactive' | string;
    }): Promise<PaginatedResponse<Item>> => {
        const response = await staffApi.get('/items/master', { params: query });
        return response.data;
    },

    getById: async (itemcode: string): Promise<ApiResponse<Item>> => {
        const response = await staffApi.get(`/items/${itemcode}`);
        return response.data;
    },

    /** รายการ DepartmentID ที่ใช้ Item นี้ (จาก ItemDepartments) */
    getDepartments: async (itemcode: string): Promise<ApiResponse<number[]>> => {
        const response = await staffApi.get(`/items/${encodeURIComponent(itemcode)}/departments`);
        return response.data;
    },

    update: async (itemcode: string, data: UpdateItemDto): Promise<ApiResponse<Item>> => {
        const { picture, ...restData } = data;
        if (picture && picture instanceof File) {
            const formData = new FormData();
            Object.keys(restData).forEach((key) => {
                const value = restData[key as keyof typeof restData];
                if (value !== undefined && value !== null && value !== '') {
                    formData.append(key, String(value));
                }
            });
            formData.append('picture', picture);
            const response = await staffApi.put(`/items/upload/${itemcode}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        }
        const response = await staffApi.put(`/items/${itemcode}`, restData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    },

    delete: async (itemcode: string): Promise<ApiResponse<Item>> => {
        const response = await staffApi.delete(`/items/${itemcode}`);
        return response.data;
    },

    updateMinMax: async (itemcode: string, data: { stock_min?: number; stock_max?: number }, cabinetId?: number): Promise<ApiResponse<Item>> => {
        const body = cabinetId != null
            ? { ...data, cabinet_id: cabinetId }
            : data;
        const response = await staffApi.patch(`/items/${itemcode}/minmax`, body);
        return response.data;
    },

    getStats: async (query?: { cabinet_id?: number; department_id?: number }): Promise<ApiResponse<ItemsStats>> => {
        const response = await staffApi.get('/items/stats', { params: query });
        return response.data;
    },

    getItemStocksWillReturn: async (params?: {
        department_id?: number;
        cabinet_id?: number;
        sub_department_id?: number;
        item_code?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<{ success: boolean; data: unknown[] }> => {
        const response = await staffApi.get('/staff/item-stocks/will-return', {
            params: params && Object.keys(params).length > 0 ? params : undefined,
        });
        return response.data as { success: boolean; data: unknown[] };
    },

    getCabinetSlotItems: async (query: {
        page?: number;
        limit?: number;
        cabinet_id: number;
        department_id?: number;
        keyword?: string;
    }): Promise<PaginatedResponse<Item>> => {
        const response = await staffApi.get('/items/cabinet-slot-items', { params: query });
        return response.data;
    },

    /**
     * ดาวน์โหลดไฟล์ template Excel สำหรับเพิ่ม/อัปเดต Item Master
     * @param departmentIds scope แผนกที่ผู้ใช้สังกัด — ให้ข้อมูลใน template ตรงกับที่หน้าเว็บแสดง
     */
    downloadUploadTemplate: async (departmentIds?: number[]): Promise<void> => {
        const body = Array.isArray(departmentIds) ? { department_ids: departmentIds } : undefined;
        const response = await staffApi.post('/reports/item-master/template', body);
        triggerNestedDownload(
            response.data,
            `item_master_${new Date().toISOString().split('T')[0]}.xlsx`,
        );
    },

    /** อัปโหลดไฟล์ Excel เพื่อเพิ่ม/อัปเดต Item Master หลายรายการ */
    bulkUpload: async (file: File): Promise<ApiResponse<ItemMasterUploadResult>> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await staffApi.post('/items/items-master-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};
