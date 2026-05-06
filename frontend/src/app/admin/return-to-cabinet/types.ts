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
  UnitID?: number;
  SubUnitID?: number;
  SubUnitQty?: number;
  unit?: { ID?: number; UnitName?: string | null };
  subUnit?: { ID?: number; UnitName?: string | null };
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
