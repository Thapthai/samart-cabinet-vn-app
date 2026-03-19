/**
 * Parse ค่าวันเวลาจาก API (รองรับ `...+07:00` ที่มีช่องว่างคั่นวัน–เวลา)
 */
export function parseApiDateTime(value: string): Date {
    let s = value.trim();
    if (/^\d{4}-\d{2}-\d{2} \d/.test(s) && /[+-]\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T');
    }
    return new Date(s);
}

/** วันนี้ใน Asia/Bangkok เป็น YYYY-MM-DD */
export function todayYyyyMmDdBangkok(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/** แปลงค่า API → วันที่ปฏิทิน Bangkok เป็น YYYY-MM-DD */
export function toBangkokYyyyMmDd(value: string): string | null {
    const d = parseApiDateTime(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/**
 * แสดงวันเวลาตาม UTC ของ instant (เช่น `2026-03-19T15:49:18.168Z` → วันที่/เวลา 15:49 ใน UTC)
 * ไม่แปลงเป็น Asia/Bangkok
 */
export function formatUtcDateTime(
    value?: string | null,
    options?: Intl.DateTimeFormatOptions,
): string {
    if (value == null || value === '') return '-';
    const d = parseApiDateTime(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('th-TH', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
}

/**
 * แสดงวันเวลาใน Asia/Bangkok เสมอ (กันเวลา +7 ผิดเมื่อเครื่องไม่ได้ตั้ง TZ ไทย / ค่า API มี offset)
 */
export function formatBangkokDateTime(
    value?: string | null,
    options?: Intl.DateTimeFormatOptions,
): string {
    if (value == null || value === '') return '-';
    const d = parseApiDateTime(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
}

export function formatThaiDateTime(value?: string) {
    return formatBangkokDateTime(value, undefined);
}

/**
 * วันที่/เวลาที่พิมพ์บิล — `print_date` (YYYY-MM-DD) + `time_print_date` (HH:mm:ss)
 * ไม่บังคับ Asia/Bangkok / +07:00 แยกจากฟิลด์ API อื่น
 */
export function formatPrintDateTime(
    printDate: string | null | undefined,
    timePrintDate: string | null | undefined,
): string {
    const datePart = printDate?.trim();
    const timePart = timePrintDate?.trim();
    if (!datePart && !timePart) return '-';
    const parts: string[] = [];
    if (datePart) {
        if (/^\d{4}-\d{2}-\d{2}/.test(datePart)) {
            try {
                const d = new Date(datePart.includes('T') ? datePart : `${datePart}T00:00:00`);
                parts.push(
                    d.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    }),
                );
            } catch {
                parts.push(datePart);
            }
        } else {
            parts.push(datePart);
        }
    }
    if (timePart) {
        parts.push(timePart.length > 8 ? timePart.slice(0, 8) : timePart);
    }
    return parts.join(' ') || '-';
}
