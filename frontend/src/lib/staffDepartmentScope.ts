import { fetchStaffMeDepartments } from '@/lib/staffApi/staffMeApi';
import { staffDepartmentApi } from '@/lib/staffApi/departmentApi';

export type StaffMeDepartmentRow = {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
};

type MeScopeCache = {
  staffUserId: number;
  unrestricted: boolean;
  allowedIds: number[] | null;
  departments: StaffMeDepartmentRow[];
};

let meScopeCache: MeScopeCache | null = null;

export function clearStaffDepartmentScopeCache(): void {
  meScopeCache = null;
}

function staffUserIdFromStorage(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { id?: number };
    if (u?.id != null && Number.isFinite(Number(u.id))) return Number(u.id);
  } catch {
    return null;
  }
  return null;
}

async function ensureMeScopeLoaded(): Promise<MeScopeCache | null> {
  const staffUserId = staffUserIdFromStorage();
  if (staffUserId == null) return null;

  if (meScopeCache?.staffUserId === staffUserId) return meScopeCache;

  try {
    const res = await fetchStaffMeDepartments();
    if (!res?.success || !res.data) return null;

    const unrestricted = res.data.unrestricted === true;
    const departments = res.data.departments ?? [];
    const allowedIds = unrestricted
      ? null
      : [...new Set(departments.map((d) => d.ID).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);

    meScopeCache = {
      staffUserId,
      unrestricted,
      allowedIds,
      departments,
    };
    return meScopeCache;
  } catch {
    return null;
  }
}

/**
 * null = ไม่จำกัดแผนก
 * number[] = เฉพาะ ID เหล่านี้
 * undefined = ยังไม่รู้ / ไม่มี session / เรียก API ไม่สำเร็จ
 */
export async function getStaffAllowedDepartmentIds(): Promise<number[] | null | undefined> {
  const c = await ensureMeScopeLoaded();
  if (c == null) return undefined;
  if (c.unrestricted) return null;
  return c.allowedIds != null && c.allowedIds.length > 0 ? c.allowedIds : [];
}

/**
 * เมื่อ role จำกัดแผนก — คืนรายการแผนกจาก GET /staff/me/departments (ไม่ต้องดึง /departments แล้วกรอง)
 * คืน null เมื่อไม่จำกัดหรือไม่มี cache
 */
export async function getStaffRestrictedDepartmentsFromMe(): Promise<StaffMeDepartmentRow[] | null> {
  const c = await ensureMeScopeLoaded();
  if (c == null || c.unrestricted) return null;
  return c.departments;
}

/**
 * รายการแผนกสำหรับ dropdown/filter ทุกหน้า Staff (ให้ตรงกับ cabinet-departments):
 * - จำกัดแผนก: รายการจาก GET /staff/me/departments แล้วกรอง keyword ฝั่ง client
 * - ไม่จำกัด: GET /departments แล้ว applyDepartmentScopeToList (กันช่องว่างก่อนรู้ scope + สำรองฝั่ง client)
 */
export async function fetchStaffDepartmentsForFilter(opts?: {
  keyword?: string;
  page?: number;
  limit?: number;
  /** ส่งจาก ref หลัง getStaffAllowedDepartmentIds() เพื่อไม่ต้อง await ซ้ำ; ถ้าไม่ส่งจะเรียก getStaffAllowedDepartmentIds เอง */
  allowedDepartmentIds?: number[] | null | undefined;
}): Promise<StaffMeDepartmentRow[]> {
  const allowed =
    opts !== undefined && opts.allowedDepartmentIds !== undefined
      ? opts.allowedDepartmentIds
      : await getStaffAllowedDepartmentIds();

  const rawKw = opts?.keyword?.trim() ?? '';
  const kwLower = rawKw.toLowerCase();
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 50));
  const page = opts?.page ?? 1;
  const skip = (page - 1) * limit;

  const fromMe = await getStaffRestrictedDepartmentsFromMe();
  if (fromMe != null) {
    let list = fromMe;
    if (rawKw) {
      list = list.filter(
        (d) =>
          (d.DepName ?? '').toLowerCase().includes(kwLower) ||
          (d.DepName2 ?? '').toLowerCase().includes(kwLower) ||
          String(d.ID).includes(rawKw),
      );
    }
    return list.slice(skip, skip + limit);
  }

  const response = await staffDepartmentApi.getAll({
    page,
    limit,
    ...(rawKw ? { keyword: rawKw } : {}),
  });
  if (response.success && response.data) {
    const raw = response.data as StaffMeDepartmentRow[];
    return applyDepartmentScopeToList(raw, allowed).slice(skip, skip + limit);
  }
  return [];
}

/** undefined = ยังไม่รู้ขอบเขต (ห้ามถือว่าไม่จำกัด — ไม่แสดงรายการจนกว่าจะโหลดเสร็จ) */
export function applyDepartmentScopeToList<T extends { ID: number }>(
  list: T[],
  allowed: number[] | null | undefined,
): T[] {
  if (allowed === undefined) return [];
  if (allowed === null) return list;
  if (allowed.length === 0) return [];
  const set = new Set(allowed);
  return list.filter((d) => set.has(d.ID));
}

export function clampDepartmentIdString(
  selected: string | undefined | null,
  allowed: number[] | null | undefined,
  fallbackWhenUnrestricted: string,
): string {
  if (allowed === undefined) {
    return selected != null && selected !== '' ? String(selected) : '';
  }
  if (allowed === null) {
    return selected != null && selected !== '' ? String(selected) : fallbackWhenUnrestricted;
  }
  if (allowed.length === 0) return '';
  const s = selected != null && String(selected).trim() !== '' ? String(selected).trim() : '';
  if (s === '') return '';
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && allowed.includes(n)) return String(n);
  return '';
}
