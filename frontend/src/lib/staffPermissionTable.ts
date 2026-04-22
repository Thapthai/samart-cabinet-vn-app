import { staffMenuItems, type StaffMenuItem } from '@/app/staff/menus';

/**
 * ตารางสิทธิ์ Staff / รายการ href สำหรับบันทึกใน DB — อ้างอิงเมนูจาก `staffMenuItems`
 * ใน `frontend/src/app/staff/menus.ts` เท่านั้น (ส่งอาร์กิวเมนต์ `items` ถ้าต้องการ override ในเทส)
 */

/** แมป href เมนูเก่า → ปัจจุบัน (สิทธิ์ใน DB อาจยังเก็บ URL เดิม) */
export function normalizeStaffPermissionMenuHref(href: string | null | undefined): string | undefined {
  if (href == null || href === '') return undefined;
  if (href === '/staff/management/sub-departments') return '/staff/management/departments';
  return href;
}

/** href ทั้งหมดที่ใช้เป็นคีย์สิทธิ์ (ไม่รวมแถวหัวข้อกลุ่ม เช่น อุปกรณ์/ตั้งค่า) */
export function getAllStaffPermissionHrefs(items: readonly StaffMenuItem[] = staffMenuItems): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  items.forEach((menu) => {
    if (menu.submenu?.length) {
      menu.submenu.forEach((sub) => {
        if (!seen.has(sub.href)) {
          seen.add(sub.href);
          out.push(sub.href);
        }
      });
    } else {
      if (!seen.has(menu.href)) {
        seen.add(menu.href);
        out.push(menu.href);
      }
    }
  });
  return out;
}

export type StaffPermissionTableRow =
  | { type: 'section'; label: string }
  | { type: 'menu'; href: string; label: string; indent: boolean };

/** แถวตาราง: หัวข้อกลุ่มไม่มี checkbox — เมนูจริงอยู่ใต้กลุ่ม */
export function getStaffPermissionTableRows(items: readonly StaffMenuItem[] = staffMenuItems): StaffPermissionTableRow[] {
  const rows: StaffPermissionTableRow[] = [];
  items.forEach((menu) => {
    if (menu.submenu?.length) {
      rows.push({ type: 'section', label: menu.name });
      menu.submenu.forEach((sub) => {
        rows.push({
          type: 'menu',
          href: sub.href,
          label: sub.name,
          indent: true,
        });
      });
    } else {
      rows.push({
        type: 'menu',
        href: menu.href,
        label: menu.name,
        indent: false,
      });
    }
  });
  return rows;
}
