import staffApi from './index';

export const staffItemStockApi = {
  createForPrintByStock: async (body: {
    department_id?: number;
    lines: Array<{
      itemcode: string;
      stock_id: number;
      copies: number;
      expire_date?: string;
      lot_no?: string;
    }>;
  }): Promise<{
    success?: boolean;
    message?: string;
    data?: { count: number; rows: Array<{ RowID: number; ItemCode?: string | null; RfidCode?: string | null }> };
    error?: string;
  }> => {
    const response = await staffApi.post('/item-stocks/for-print-by-stock', body);
    return response.data;
  },

  deleteForPrintRows: async (rowIds: number[]): Promise<{
    success?: boolean;
    message?: string;
    data?: { count: number };
    error?: string;
  }> => {
    const response = await staffApi.post('/item-stocks/for-print/delete', { rowIds });
    return response.data;
  },
};
