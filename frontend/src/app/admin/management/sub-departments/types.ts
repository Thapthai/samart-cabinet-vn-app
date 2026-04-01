export type SubDepartmentRow = {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  description?: string | null;
  status: boolean;
  department?: { ID: number; DepName?: string; DepName2?: string };
  _count?: { medicalSupplyUsages: number };
};

export type DeptRow = { ID: number; DepName?: string; DepName2?: string };

export type StatusFilter = 'all' | 'active' | 'inactive';
