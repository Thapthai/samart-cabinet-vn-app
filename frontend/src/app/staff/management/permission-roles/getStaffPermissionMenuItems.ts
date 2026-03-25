import { staffMenuItems, type StaffMenuSubItem } from '@/app/staff/menus';

/** แบนเมนู staff สำหรับตารางสิทธิ์ — dedupe ตาม href */
export function getStaffPermissionMenuItems(): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const menuItems: Array<{ value: string; label: string }> = [];
  staffMenuItems.forEach((menu) => {
    if (!seen.has(menu.href)) {
      seen.add(menu.href);
      menuItems.push({ value: menu.href, label: menu.name });
    }
    if (menu.submenu) {
      menu.submenu.forEach((submenu: StaffMenuSubItem) => {
        if (seen.has(submenu.href)) return;
        seen.add(submenu.href);
        menuItems.push({ value: submenu.href, label: submenu.name });
      });
    }
  });
  return menuItems;
}
