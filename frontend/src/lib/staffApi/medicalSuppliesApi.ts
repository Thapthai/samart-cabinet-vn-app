import staffApi from './index';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

export const staffMedicalSuppliesApi = {
    create: async (data: Record<string, unknown>): Promise<ApiResponse<any>> => {
        const response = await staffApi.post('/medical-supplies', data);
        return response.data;
    },

    getAll: async (query?: {
        page?: number;
        limit?: number;
        keyword?: string;
        patient_hn?: string;
        hn?: string;
        an?: string;
        EN?: string;
        sort_by?: string;
        sort_order?: string;
        startDate?: string;
        endDate?: string;
        user_name?: string;
        first_name?: string;
        lastname?: string;
        assession_no?: string;
        department_code?: string;
        usage_type?: string;
        print_date?: string;
        time_print_date?: string;
    }): Promise<PaginatedResponse<any>> => {
        const response = await staffApi.get('/medical-supplies', { params: query });
        return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<any>> => {
        const response = await staffApi.get(`/medical-supplies/${id}`);
        return response.data;
    },

    update: async (id: number, data: Record<string, unknown>): Promise<ApiResponse<any>> => {
        const response = await staffApi.put(`/medical-supplies/${id}`, data);
        return response.data;
    },

    updatePrintInfo: async (id: number, data: {
        print_location?: string;
        print_date?: Date;
        time_print_date?: Date;
    }): Promise<ApiResponse<any>> => {
        const response = await staffApi.patch(`/medical-supplies/${id}/print-info`, data);
        return response.data;
    },

    delete: async (id: number): Promise<ApiResponse> => {
        const response = await staffApi.delete(`/medical-supplies/${id}`);
        return response.data;
    },

    getStatistics: async (): Promise<ApiResponse<any>> => {
        const response = await staffApi.get('/medical-supplies/statistics');
        return response.data;
    },

    /** สรุปโดยรวม: จำนวนเบิก, จำนวนใช้, ผลต่าง (สำหรับ Dashboard) — backend: medical-supply/dispensed-vs-usage-summary */
    getDispensedVsUsageSummary: async (params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<ApiResponse<{ total_dispensed: number; total_used: number; difference: number }>> => {
        const response = await staffApi.get('/medical-supply/dispensed-vs-usage-summary', { params });
        return response.data;
    },

    getUsageByItemCodeFromItemTable: async (query?: {
        itemCode?: string;
        startDate?: string;
        endDate?: string;
        first_name?: string;
        lastname?: string;
        assession_no?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<any>> => {
        const response = await staffApi.get('/medical-supplies-usage-by-item-code', { params: query });
        return response.data;
    },
    getSupplyItemsByUsageId: async (usageId: number): Promise<ApiResponse<any>> => {
        const response = await staffApi.get(`/medical-supply-items/usage/${usageId}`);
        return response.data;
    },

    getReturnHistory: async (query?: {
        department_code?: string;
        patient_hn?: string;
        return_reason?: string;
        date_from?: string;
        date_to?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<any>> => {
        const response = await staffApi.get('/medical-supply-items/return-history', { params: query });
        return response.data;
    },

    recordItemReturn: async (data: {
        item_id: number;
        qty_returned: number;
        return_reason: string;
        return_by_user_id?: string;
        return_note?: string;
    }): Promise<ApiResponse<any>> => {
        const response = await staffApi.post('/medical-supply-items/record-return', data);
        return response.data;
    },

    getItemStocksForReturnToCabinet: async (filters?: {
        itemCode?: string;
        itemTypeId?: number;
        rfidCode?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<any>> => {
        const queryParams = new URLSearchParams();
        if (filters?.itemCode) queryParams.append('itemCode', filters.itemCode);
        if (filters?.itemTypeId) queryParams.append('itemTypeId', String(filters.itemTypeId));
        if (filters?.rfidCode) queryParams.append('rfidCode', filters.rfidCode);
        if (filters?.startDate) queryParams.append('startDate', filters.startDate);
        if (filters?.endDate) queryParams.append('endDate', filters.endDate);
        if (filters?.page) queryParams.append('page', String(filters.page));
        if (filters?.limit) queryParams.append('limit', String(filters.limit));
        const response = await staffApi.get(`/medical-supply-items/return-to-cabinet?${queryParams.toString()}`);
        return response.data;
    },

    recordStockReturn: async (data: {
        items: Array<{ item_stock_id: number; return_reason: string; return_note?: string }>;
        return_by_user_id?: string;
        stock_id?: number;
    }): Promise<ApiResponse<any>> => {
        const response = await staffApi.post('/medical-supply-items/record-stock-return', data);
        return response.data;
    },


    // ------------------------------- Logs History -------------------------------
    getLogs: async (query?: {
        page?: number;
        limit?: number;
        patient_hn?: string;
        en?: string;
        log_status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        success: boolean;
        groups: Array<{
            patient_hn: string;
            en: string;
            log_count: number;
            last_activity_at: string;
            logs: any[];
        }>;
        total_groups: number;
        page: number;
        limit: number;
        totalPages: number;
    }> => {
        const response = await staffApi.get('/medical-supplies/logs', { params: query });
        return response.data;
    },

};


