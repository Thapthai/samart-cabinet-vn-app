import type { DispensedItem } from '@/app/admin/dispense-from-cabinet/types';

export const DISPENSED_GROUP_TIME_TOLERANCE_SEC = 3;
const TOLERANCE_MS = DISPENSED_GROUP_TIME_TOLERANCE_SEC * 1000;

export interface DispensedGroup {
  key: string;
  itemcode: string;
  itemname: string;
  dispenseTime: string;
  items: DispensedItem[];
  totalQty: number;
}

/** จัดกลุ่มรายการเบิก — เรียงเวลา DESC ให้ตรงกับ backend ORDER BY */
export function buildDispensedGroups(items: DispensedItem[]): DispensedGroup[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.modifyDate).getTime();
    const tB = new Date(b.modifyDate).getTime();
    return tB - tA;
  });

  const groups: DispensedGroup[] = [];
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
            dispenseTime: current[0].modifyDate,
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
      dispenseTime: current[0].modifyDate,
      items: current,
      totalQty,
    });
  }
  return groups;
}
