/** ความคาดเคลื่อนกลุ่มตามเวลาเติม (วินาที) — ตรงกับ frontend buildReturnedGroups */
export const RETURNED_GROUP_TIME_TOLERANCE_SEC = 3;
const TOLERANCE_MS = RETURNED_GROUP_TIME_TOLERANCE_SEC * 1000;

export type ReturnedGroupRow = {
  itemcode?: string;
  itemname?: string;
  modifyDate?: string;
  qty?: number;
  RowID?: number;
};

export interface ReturnedReportGroup<T extends ReturnedGroupRow = ReturnedGroupRow> {
  itemcode: string;
  itemname: string;
  returnTime: string;
  totalQty: number;
  items: T[];
}

/** จัดกลุ่มรายการเติม — เรียงเวลา DESC ให้ตรงกับ backend ORDER BY และหน้าเว็บ */
export function buildReturnedGroups<T extends ReturnedGroupRow>(
  items: T[],
): ReturnedReportGroup<T>[] {
  if (!items || items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.modifyDate ?? 0).getTime();
    const tB = new Date(b.modifyDate ?? 0).getTime();
    return tB - tA;
  });

  const groups: ReturnedReportGroup<T>[] = [];
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
            returnTime: current[0].modifyDate ?? '',
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
      returnTime: current[0].modifyDate ?? '',
      totalQty,
      items: current,
    });
  }

  return groups;
}
