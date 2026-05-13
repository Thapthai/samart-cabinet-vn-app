import staffApi from './index';
import type { ApiResponse } from '@/types/common';

export const itemStockDepartmentApi = {
    getAll: async (params?: { itemStockId?: number; departmentId?: number; status?: string }): Promise<ApiResponse<unknown[]>> => {
        const response = await staffApi.get('/item-stock-departments', { params });
        return response.data;
    }
}
