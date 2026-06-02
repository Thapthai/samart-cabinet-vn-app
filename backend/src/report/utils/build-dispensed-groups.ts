/** ความคาดเคลื่อนกลุ่มตามเวลาเบิก (วินาที) — ตรงกับ frontend buildDispensedGroups */
export const DISPENSED_GROUP_TIME_TOLERANCE_SEC = 3;
const TOLERANCE_MS = DISPENSED_GROUP_TIME_TOLERANCE_SEC * 1000;

export type DispensedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string;
  qty?: number;
};

export interface DispensedReportGroup<T extends DispensedGroupRow = DispensedGroupRow> {
  itemcode: string;
  itemname: string;
  dispenseTime: string;
  totalQty: number;
  items: T[];
}

/** จัดกลุ่มรายการเบิก — เรียงเวลา DESC ให้ตรงกับ getDispensedItems ORDER BY และหน้าเว็บ */
export function buildDispensedGroups<T extends DispensedGroupRow>(
  items: T[],
): DispensedReportGroup<T>[] {
  if (!items || items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.modifyDate ?? 0).getTime();
    const tB = new Date(b.modifyDate ?? 0).getTime();
    return tB - tA;
  });

  const groups: DispensedReportGroup<T>[] = [];
  let current: T[] = [];
  let groupStartTime = 0;

  for (const item of sorted) {
    const t = new Date(item.modifyDate ?? 0).getTime();
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
            itemcode: current[0].itemcode ?? '',
            itemname: current[0].itemname ?? current[0].itemcode ?? '',
            dispenseTime: current[0].modifyDate ?? '',
            totalQty,
            items: current,
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
      itemcode: current[0].itemcode ?? '',
      itemname: current[0].itemname ?? current[0].itemcode ?? '',
      dispenseTime: current[0].modifyDate ?? '',
      totalQty,
      items: current,
    });
  }

  return groups;
}

/** เรียงแถบรายการเดียว — ตรง ORDER BY ist.LastCabinetModify DESC, i.itemname ASC */
export function sortDispensedItemsForReport<T extends DispensedGroupRow>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tA = new Date(a.modifyDate ?? 0).getTime();
    const tB = new Date(b.modifyDate ?? 0).getTime();
    if (tB !== tA) return tB - tA;
    const nameA = (a.itemname ?? a.itemcode ?? '').toString();
    const nameB = (b.itemname ?? b.itemcode ?? '').toString();
    return nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
  });
}
