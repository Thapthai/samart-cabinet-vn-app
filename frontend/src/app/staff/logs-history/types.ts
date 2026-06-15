export function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export type LogFilterState = {
  patient_hn: string;
  en: string;
  log_status: string;
  startDate: string;
  endDate: string;
};
