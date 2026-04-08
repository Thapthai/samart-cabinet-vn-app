export interface DispensedItem {
  RowID: number;
  itemcode: string;
  itemname: string;
  modifyDate: string;
  qty: number;
  itemType: string;
  itemCategory: string;
  itemtypeID: number;
  RfidCode: string;
  StockID: number;
  Istatus_rfid?: number;
  CabinetUserID?: number;
  cabinetUserName?: string;
  cabinetName?: string;
  departmentName?: string;
}

export interface FilterState {
  searchItemCode: string;
  startDate: string;
  endDate: string;
  itemTypeFilter: string;
  departmentId: string;
  subDepartmentId: string;
  cabinetId: string;
}

export interface SummaryData {
  total: number;
  totalQty: number;
}
