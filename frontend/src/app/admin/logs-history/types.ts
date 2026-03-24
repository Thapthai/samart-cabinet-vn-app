export type LogFilterState = {
  patient_hn: string;
  en: string;
  log_status: string;
  startDate: string;
  endDate: string;
};

export type LogGroupRow = {
  patient_hn: string;
  en: string;
  log_count: number;
  last_activity_at: string;
  logs: any[];
};

export type SelectedLog = {
  id: number;
  usage_id: number | null;
  action: any;
  created_at: string;
};
