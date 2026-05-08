/** ตรงกับ admin/management/items */
export const PAGE_SIZE = 10;

/** Auto: ดึง slot ครั้งละพอควร เพื่อเติมรายการต้องเติมทั้งหมดในตู้เดียว */
export const AUTO_FETCH_LIMIT = 500;

export const MAX_PRINT = 80;
/** เพดานเมื่อมี refill_qty จากตู้ */
export const MAX_COPIES_PER_ITEM = 50;
/** เมื่อไม่มีจำนวนที่ต้องเติม (ไม่พบรายการหรือ refill = 0) — แผ่นสูงสุดต่อรายการ */
export const MAX_COPIES_WHEN_NO_REFILL = 10;
export const MAX_TOTAL_LABELS = 2000;
