import type { DispensedItem } from '@/app/admin/return-to-cabinet-report/types';

/** ความคาดเคลื่อนกลุ่มตามเวลาคืน (วินาที) — ต้องตรงกับ ReturnedTable */
export const RETURNED_GROUP_TIME_TOLERANCE_SEC = 3;
const TOLERANCE_MS = RETURNED_GROUP_TIME_TOLERANCE_SEC * 1000;

export interface ReturnedGroup {
  key: string;
  itemcode: string;
  itemname: string;
  returnTime: string;
  items: DispensedItem[];
  totalQty: number;
}

/**
 * จัดกลุ่มรายการดิบ — เรียงตามเวลา DESC ให้ตรงกับ backend ORDER BY LastCabinetModify DESC
 */
export function buildReturnedGroups(items: DispensedItem[]): ReturnedGroup[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.modifyDate).getTime();
    const tB = new Date(b.modifyDate).getTime();
    return tB - tA;
  });

  const groups: ReturnedGroup[] = [];
  let current: DispensedItem[] = [];
  let groupStartTime = 0;

  for (const item of sorted) {
    const t = new Date(item.modifyDate).getTime();
    if (current.length === 0) {
      current = [item];
      groupStartTime = t;
    } else {
      const sameItem = (item.itemcode ?? '') === (current[0].itemcode ?? '');
      const withinWindow = groupStartTime - t <= TOLERANCE_MS;
      if (sameItem && withinWindow) {
        current.push(item);
      } else {
        if (current.length > 0) {
          const totalQty = current.reduce((sum, i) => sum + (i.qty ?? 1), 0);
          groups.push({
            key: `${current[0].itemcode}_${current[0].RowID}_${groupStartTime}`,
            itemcode: current[0].itemcode ?? '',
            itemname: current[0].itemname ?? current[0].itemcode ?? '',
            returnTime: current[0].modifyDate,
            items: current,
            totalQty,
          });
        }
        current = [item];
        groupStartTime = t;
      }
    }
  }
  if (current.length > 0) {
    const totalQty = current.reduce((sum, i) => sum + (i.qty ?? 1), 0);
    groups.push({
      key: `${current[0].itemcode}_${current[0].RowID}_${groupStartTime}`,
      itemcode: current[0].itemcode ?? '',
      itemname: current[0].itemname ?? current[0].itemcode ?? '',
      returnTime: current[0].modifyDate,
      items: current,
      totalQty,
    });
  }
  return groups;
}
