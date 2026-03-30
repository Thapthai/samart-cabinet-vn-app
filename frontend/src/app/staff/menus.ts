// Type definitions for menu and submenu
export interface StaffMenuSubItem {
    name: string;
    href: string;
    description?: string;
    icon?: any;
    /** ถ้ากำหนด: แสดงเมนูนี้เฉพาะ role ที่ระบุ (คู่กับสิทธิ์จาก API ที่ไม่ถูกปิด) */
    roles?: string[];
}

export interface StaffMenuItem {
    name: string;
    href: string;
    icon?: any;
    description?: string;
    submenu?: StaffMenuSubItem[];
    roles?: string[];
    /** เมื่อเป็น true กดแล้วไม่นำทาง แค่เปิด/ปิด submenu */
    noHref?: boolean;
}
// Utility to filter menu and submenu by permissions (+ optional role gate บนเมนูย่อย)
export function filterMenuByPermissions(
    menuItems: StaffMenuItem[],
    permissions: Record<string, boolean>,
    roleCode?: string | null,
    options?: { skipSubRoleGate?: boolean },
): StaffMenuItem[] {
    const r = (roleCode ?? '').toString().trim().toLowerCase();
    const skipGate = options?.skipSubRoleGate === true;

    const subVisible = (sub: StaffMenuSubItem): boolean => {
        if (permissions[sub.href] === false) return false;
        if (sub.roles?.length) {
            if (skipGate) return true;
            return !!r && sub.roles.map((x) => x.toLowerCase()).includes(r);
        }
        return permissions[sub.href] !== false;
    };

    return menuItems
        .map((item) => {
            if (!item.submenu) return item;
            const filteredSubmenu = item.submenu.filter(subVisible);
            return { ...item, submenu: filteredSubmenu };
        })
        .filter((item) => {
            if (item.submenu && item.submenu.length > 0) {
                if (item.noHref) return true;
                return true;
            }
            if (item.submenu) return false;
            if (item.noHref) return false;
            return permissions[item.href] !== false;
        });
}
import {
    LayoutDashboard,
    Box,
    Package,
    History,
    FileBarChart,
    Settings,
    Users,
    Shield,
    Network,
    RotateCcw,
    ClipboardList,
} from 'lucide-react';

export const staffMenuItems = [
    {
        name: 'Dashboard',
        href: '/staff/dashboard',
        icon: LayoutDashboard,
        description: 'ภาพรวมระบบ',
    },
    {
        name: 'อุปกรณ์',
        href: '/staff/items',
        icon: Box,
        description: 'จัดการอุปกรณ์และสต๊อก',
        noHref: true,
        submenu: [

            {
                name: 'จัดการตู้ Cabinet - แผนก',
                href: '/staff/cabinet-departments',
                icon: Network,
                description: 'จัดการตู้ Cabinet และเชื่อมโยงกับแผนก',
            },
            {
                name: 'สต๊อกอุปกรณ์ในตู้',
                href: '/staff/items',
                description: 'เมนูสต๊อกอุปกรณ์ที่มีในตู้ SmartCabinet',
                icon: Package,
            },
            {
                name: 'เบิกอุปกรณ์จากตู้',
                href: '/staff/dispense-from-cabinet',
                description: 'การเบิกอุปกรณ์จากตู้ SmartCabinet',
                icon: FileBarChart,
            },
            {
                name: 'เติมอุปกรณ์เข้าตู้',
                href: '/staff/return-to-cabinet-report',
                description: 'การเติมอุปกรณ์เข้าตู้ SmartCabinet',
                icon: FileBarChart,
            },
            {
                name: 'บันทึกใช้อุปกรณ์กับคนไข้',
                href: '/staff/medical-supplies',
                description: 'ประวัติการเบิกจากตู้ SmartCabinet — ค้นหา ดูรายละเอียด และส่งออกรายงาน',
                icon: History,
            },
            {
                name: 'แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน',
                href: '/staff/return',
                description: 'แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน',
                icon: RotateCcw,
            },

            {
                name: 'เปรียบเทียบตามเวชภัณฑ์',
                href: '/staff/item-comparison',
                description: 'เปรียบเทียบการเบิกกับการใช้งานตามเวชภัณฑ์',
                icon: FileBarChart,
            },
        ],
    },

    {
        name: 'ตั้งค่า',
        href: '/staff/management',
        icon: Settings,
        description: 'ตั้งค่าระบบ',
        noHref: true,
        submenu: [
            {
                name: 'จัดการตู้ Cabinet',
                href: '/staff/management/cabinets',
                icon: Package,
                description: 'จัดการตู้ Cabinet',
            },
            {
                name: 'จัดการ ผู้ใช้งาน Staff',
                href: '/staff/management/permission-users',
                icon: Users,
                description: 'จัดการ User',
            },
            {
                name: 'กำหนดสิทธิ์ ผู้ใช้งาน Staff',
                href: '/staff/management/permission-roles',
                icon: Shield,
                description: 'กำหนดสิทธิ์การเข้าถึงเมนู ผู้ใช้งาน Staff',
            },
        ],
    },
    {
        name: 'ประวัติการใช้งาน',
        href: '/staff/logs-history',
        icon: ClipboardList,
        description: 'ประวัติการใช้งานระบบ',
    },


];
