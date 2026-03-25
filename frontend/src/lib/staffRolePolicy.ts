/**
 * นโยบาย Role ฝั่ง Staff (frontend)
 * หัวหน้าสาย: รหัสหลัก IT-001 / WH-001 (เทียบแบบ normalize ตัวพิมพ์เล็ก)
 * รองรับ it1 / warehouse1 เดิมชั่วคราวระหว่างย้ายข้อมูล
 */

/** รหัสใน DB (canonical) */
export const STAFF_HEAD_IT_ROLE_CODE = 'IT-001';
export const STAFF_HEAD_WH_ROLE_CODE = 'WH-001';

/** ค่าหลัง normalizeStaffRoleCode — ใช้เทียบใน logic */
export const STAFF_HEAD_IT_ROLE_NORM = 'it-001';
export const STAFF_HEAD_WH_ROLE_NORM = 'wh-001';

const LEGACY_HEAD_IT = 'it1';
const LEGACY_HEAD_WH = 'warehouse1';

export function normalizeStaffRoleCode(role: unknown): string {
  return (role ?? '').toString().trim().toLowerCase();
}

function isHeadItNorm(r: string): boolean {
  return r === STAFF_HEAD_IT_ROLE_NORM || r === LEGACY_HEAD_IT;
}

function isHeadWhNorm(r: string): boolean {
  return r === STAFF_HEAD_WH_ROLE_NORM || r === LEGACY_HEAD_WH;
}

/** ผู้ใช้เป็นหัวหน้าสาย IT (IT-001 / it1) */
export function staffRoleIsHeadIt(viewerRoleCode: string): boolean {
  return isHeadItNorm(normalizeStaffRoleCode(viewerRoleCode));
}

/** ผู้ใช้เป็นหัวหน้าสาย Warehouse (WH-001 / warehouse1) */
export function staffRoleIsHeadWh(viewerRoleCode: string): boolean {
  return isHeadWhNorm(normalizeStaffRoleCode(viewerRoleCode));
}

function maxRoleNumericSuffix(existingRoleCodes: readonly string[], pattern: RegExp): number {
  let max = 0;
  for (const raw of existingRoleCodes) {
    const m = normalizeStaffRoleCode(raw).match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

/**
 * รหัส IT-00N ถัดไป จากรายการ code ทั้งหมด (รวม inactive)
 * role ย่อยไม่ใช้เลข 001 (สงวนหัวหน้า) — ถ้ามีแค่ IT-001 จะได้ IT-002
 */
export function suggestNextItRoleCode(existingRoleCodes: readonly string[]): string {
  const max = maxRoleNumericSuffix(existingRoleCodes, /^it-(\d+)$/);
  const next = Math.max(max + 1, 2);
  return `IT-${String(next).padStart(3, '0')}`;
}

/** รหัส WH-00N ถัดไป — เช่น มี WH-002 จะได้ WH-003 */
export function suggestNextWhRoleCode(existingRoleCodes: readonly string[]): string {
  const max = maxRoleNumericSuffix(existingRoleCodes, /^wh-(\d+)$/);
  const next = Math.max(max + 1, 2);
  return `WH-${String(next).padStart(3, '0')}`;
}

/** หัวหน้าสาย IT หรือ Warehouse */
export function staffRoleIsStaffPermissionHead(roleCode: string): boolean {
  const r = normalizeStaffRoleCode(roleCode);
  return isHeadItNorm(r) || isHeadWhNorm(r);
}

/**
 * เฉพาะรหัสหัวหน้าแบบ IT-001 / WH-001 (หลัง normalize เป็น it-001 / wh-001)
 * ไม่รวม legacy it1 / warehouse1 — ใช้เป็นประตูสิทธิ์จัดการ Staff User แบบเข้ม
 */
export function staffRoleIsStrictDash001Head(viewerRoleCode: string): boolean {
  const r = normalizeStaffRoleCode(viewerRoleCode);
  return r === STAFF_HEAD_IT_ROLE_NORM || r === STAFF_HEAD_WH_ROLE_NORM;
}

/** IT-001 / WH-001 (และ legacy) — ไม่ผูกแผนกจากโปรไฟล์ */
export function staffRoleBypassesDepartmentLock(roleCode: string): boolean {
  return staffRoleIsStaffPermissionHead(roleCode);
}

export function staffRoleIsItFamily(roleCode: string): boolean {
  return normalizeStaffRoleCode(roleCode).startsWith('it');
}

/** สาย warehouse: warehouse*, WH-* */
export function staffRoleIsWarehouseFamily(roleCode: string): boolean {
  const r = normalizeStaffRoleCode(roleCode);
  return r.startsWith('warehouse') || r.startsWith('wh-');
}

/** เลือกแผนกได้: หัวหน้าสาย + ทุก role สาย warehouse */
export function staffRoleCanSelectAnyDepartment(roleCode: string): boolean {
  const r = normalizeStaffRoleCode(roleCode);
  return staffRoleIsStaffPermissionHead(r) || staffRoleIsWarehouseFamily(r);
}

/** ล็อก dropdown ตามโปรไฟล์ — ไม่ใช่หัวหน้าสาย และไม่ใช่สาย warehouse */
export function staffRoleLocksDepartmentToProfile(roleCode: string): boolean {
  const r = normalizeStaffRoleCode(roleCode);
  if (staffRoleIsStaffPermissionHead(r)) return false;
  if (staffRoleIsWarehouseFamily(r)) return false;
  return true;
}

/**
 * แสดงคอลัมน์ role ในหน้ากำหนดสิทธิ์ (permission-roles) หรือไม่
 * หัวหน้า IT เห็นเฉพาะสาย IT; หัวหน้า WH เห็นเฉพาะสาย warehouse — ไม่เห็นอีกสาย
 * ไม่มี role ผู้ดู (เช่น admin) → แสดงทุกคอลัมน์
 */
export function staffRoleVisibleInPermissionRolesTable(viewerRoleCode: string, targetRoleCode: string): boolean {
  const v = normalizeStaffRoleCode(viewerRoleCode);
  if (!v) return true;
  if (staffRoleIsHeadIt(viewerRoleCode)) return staffRoleIsItFamily(targetRoleCode);
  if (staffRoleIsHeadWh(viewerRoleCode)) return staffRoleIsWarehouseFamily(targetRoleCode);
  return true;
}

/**
 * ผู้ดู (หัวหน้าสาย) แก้คอลัมน์สิทธิ์ของ role เป้าหมายได้หรือไม่
 */
export function staffRoleCanManageRoleColumn(viewerRoleCode: string, targetRoleCode: string): boolean {
  const v = normalizeStaffRoleCode(viewerRoleCode);
  const t = normalizeStaffRoleCode(targetRoleCode);
  if (!staffRoleIsStaffPermissionHead(v)) return false;
  if (isHeadItNorm(v)) {
    return staffRoleIsItFamily(t) && !isHeadItNorm(t);
  }
  if (isHeadWhNorm(v)) {
    return staffRoleIsWarehouseFamily(t) && !isHeadWhNorm(t);
  }
  return false;
}

/**
 * มอบหมาย role ให้ user ใหม่/แก้ไข — หัวหน้าสายมอบได้เฉพาะลูกสาย (ไม่รวมตัวเองระดับหัวหน้า)
 */
export function staffRoleCanAssignStaffRole(viewerRoleCode: string, targetRoleCode: string): boolean {
  return staffRoleCanManageRoleColumn(viewerRoleCode, targetRoleCode);
}

/** จัดการ user แถวนี้ (แก้ role / ลบ) */
export function staffRoleCanManageStaffUserRow(viewerRoleCode: string, rowUserRole: string): boolean {
  return staffRoleCanManageRoleColumn(viewerRoleCode, rowUserRole);
}

/** สร้าง role ใหม่ (code) */
export function staffRoleCanCreateRoleCode(viewerRoleCode: string, newRoleCode: string): boolean {
  return staffRoleCanManageRoleColumn(viewerRoleCode, newRoleCode);
}

export function readStaffRoleCodeFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw?.trim()) return '';
    return normalizeStaffRoleCode(JSON.parse(raw.trim())?.role);
  } catch {
    return '';
  }
}

const DISPLAY_LABELS: Record<string, string> = {
  [STAFF_HEAD_IT_ROLE_NORM]: 'IT 1',
  [STAFF_HEAD_WH_ROLE_NORM]: 'Warehouse 1',
  [LEGACY_HEAD_IT]: 'IT 1',
  [LEGACY_HEAD_WH]: 'Warehouse 1',
  it2: 'IT 2',
  it3: 'IT 3',
  warehouse2: 'Warehouse 2',
  warehouse3: 'Warehouse 3',
};

/** ชื่อแสดงสำหรับ role code (ไม่พบใน map คืน code เดิม) */
export function staffRoleDisplayLabel(roleCode: string): string {
  const r = normalizeStaffRoleCode(roleCode);
  return DISPLAY_LABELS[r] || roleCode;
}
