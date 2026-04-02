import staffApi from './index';

/** Master แผนกย่อย — ใช้ Bearer staff + client headers (เส้นทางเดียวกับ admin) */
export const staffMedicalSupplySubDepartmentsApi = {
  getAll: async (): Promise<{
    success: boolean;
    data?: Array<{
      id: number;
      department_id: number;
      code: string;
      name: string | null;
      description?: string | null;
      status: boolean;
      department?: { ID: number; DepName?: string; DepName2?: string };
      _count?: { medicalSupplyUsages: number };
    }>;
    message?: string;
  }> => {
    const response = await staffApi.get('/medical-supply-sub-departments');
    return response.data;
  },

  getById: async (
    id: number,
  ): Promise<{
    success: boolean;
    data?: {
      id: number;
      department_id: number;
      code: string;
      name: string | null;
      description?: string | null;
      status: boolean;
      department?: { ID: number; DepName?: string; DepName2?: string };
    };
  }> => {
    const response = await staffApi.get(`/medical-supply-sub-departments/${id}`);
    return response.data;
  },

  create: async (data: {
    department_id: number;
    code: string;
    name?: string;
    description?: string | null;
    status?: boolean;
  }): Promise<{ success: boolean; data?: unknown; message?: string }> => {
    const response = await staffApi.post('/medical-supply-sub-departments', data);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      department_id?: number;
      code?: string;
      name?: string;
      description?: string | null;
      status?: boolean;
    },
  ): Promise<{ success: boolean; data?: unknown; message?: string }> => {
    const response = await staffApi.put(`/medical-supply-sub-departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await staffApi.delete(`/medical-supply-sub-departments/${id}`);
    return response.data;
  },
};
