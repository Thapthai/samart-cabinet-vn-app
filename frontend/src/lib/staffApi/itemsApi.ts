import staffApi from './index';
import type { Item, CreateItemDto, UpdateItemDto, GetItemsQuery } from '@/types/item';
import type { ApiResponse, PaginatedResponse, ItemsStats } from '@/types/common';

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
        const response = await staffApi.get('/items', { params: query });
        return response.data;
    },

    getById: async (itemcode: string): Promise<ApiResponse<Item>> => {
        const response = await staffApi.get(`/items/${itemcode}`);
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
        item_code?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<{ success: boolean; data: any[] }> => {
        const response = await staffApi.get('/item-stocks/will-return', {
            params: params && Object.keys(params).length > 0 ? params : undefined,
        });
        return response.data as { success: boolean; data: any[] };
    },
};
