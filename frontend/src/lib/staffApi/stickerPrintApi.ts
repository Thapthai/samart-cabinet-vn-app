import staffApi from './index';

export const staffStickerPrintApi = {
  printLabelItems: async (body: {
    items: Array<{ itemcode: string; copies: number }>;
  }): Promise<{
    success?: boolean;
    message: string;
    lineCount: number;
    count: number;
    totalBytesSent: number;
    host: string;
    port: number;
    template: string;
    printedAt: string;
  }> => {
    const response = await staffApi.post('/sticker-print/printLabel-items', body);
    return response.data;
  },
};
