import { staffMenuItems } from '@/app/staff/menus';

/** href ทั้งหมดที่ใช้เป็นคีย์สิทธิ์ (ไม่รวมแถวหัวข้อกลุ่ม เช่น อุปกรณ์/ตั้งค่า) */
export function getAllStaffPermissionHrefs(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  staffMenuItems.forEach((menu) => {
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
export function getStaffPermissionTableRows(): StaffPermissionTableRow[] {
  const rows: StaffPermissionTableRow[] = [];
  staffMenuItems.forEach((menu) => {
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
