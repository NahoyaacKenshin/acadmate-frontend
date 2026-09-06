/**
 * Philippine Timezone Utilities (Asia/Manila / UTC+08:00)
 *
 * Philippine Standard Time (PST / PHT) is fixed at UTC+8 year-round with no DST.
 * These utilities ensure datepicker selections, all-day calendar events, and recurring
 * classes consistently preserve the intended local date and time without accidental
 * UTC date shifts (such as the early morning shift between 12:00 AM and 7:59 AM).
 */

export const PHT_OFFSET = '+08:00';
export const PHT_TIMEZONE = 'Asia/Manila';

/**
 * Formats a 2-digit number with leading zero.
 */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Returns today's calendar date in Philippine Time as 'YYYY-MM-DD'.
 * Replaces new Date().toISOString().split('T')[0] which erroneously returns
 * yesterday's date between 12:00 AM and 7:59 AM in the Philippines.
 */
export function getPhilippineToday(): string {
  const now = new Date();
  // Format using Intl in Asia/Manila timezone
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: PHT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now); // en-CA produces YYYY-MM-DD
  } catch {
    // Fallback: local date
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
}

/**
 * Extracts pure 'YYYY-MM-DD' from a Date or string in local/Philippine time.
 */
export function toPhilippineDateOnly(date: Date | string | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      return `${match[1]}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`;
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return '';
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Converts a Date object (as selected by a DatePicker) into a strict ISO-8601 string
 * with explicit Philippine offset (+08:00): 'YYYY-MM-DDTHH:mm:ss.000+08:00'.
 *
 * This guarantees that both PostgreSQL (timestamptz) and SQLite store the exact intended
 * local date and time without shifting across midnight boundaries.
 */
export function toPhilippineISO(
  date: Date | string | null | undefined,
  timeHHMM?: string | null
): string {
  if (!date) {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:00.000${PHT_OFFSET}`;
  }

  // Case 1: Date object from DateTimePicker
  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());

    let hh = pad2(date.getHours());
    let mm = pad2(date.getMinutes());
    let ss = pad2(date.getSeconds());

    if (timeHHMM && timeHHMM.includes(':')) {
      const [th, tm] = timeHHMM.split(':').map(Number);
      if (!isNaN(th)) hh = pad2(th);
      if (!isNaN(tm)) mm = pad2(tm);
      ss = '00';
    }

    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000${PHT_OFFSET}`;
  }

  // Case 2: String input
  const trimmed = date.trim();

  // Match YYYY-MM-DD or YYYY-MM-DDTHH:mm
  const match = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );

  if (match) {
    const [, y, mo, da, rawH, rawM, rawS] = match;
    const yStr = y;
    const mStr = pad2(Number(mo));
    const dStr = pad2(Number(da));

    let hh = rawH ? pad2(Number(rawH)) : '08';
    let mm = rawM ? pad2(Number(rawM)) : '00';
    let ss = rawS ? pad2(Number(rawS)) : '00';

    if (timeHHMM && timeHHMM.includes(':')) {
      const [th, tm] = timeHHMM.split(':').map(Number);
      if (!isNaN(th)) hh = pad2(th);
      if (!isNaN(tm)) mm = pad2(tm);
      ss = '00';
    }

    return `${yStr}-${mStr}-${dStr}T${hh}:${mm}:${ss}.000${PHT_OFFSET}`;
  }

  // Fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:${pad2(parsed.getSeconds())}.000${PHT_OFFSET}`;
  }

  return toPhilippineISO(new Date());
}

/**
 * Formats any datetime or time string into 12-hour AM/PM format (e.g. '8:00 AM' or '1:30 PM').
 */
export function formatTime12PHT(val: string | Date | null | undefined): string {
  if (!val) return '';
  if (val instanceof Date) {
    const h = val.getHours();
    const m = val.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${pad2(m)} ${ampm}`;
  }

  const str = val.trim();
  // If ISO string
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    const [h, m] = timePart.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${pad2(m)} ${ampm}`;
    }
  }

  // If pure HH:MM
  if (str.includes(':')) {
    const [h, m] = str.split(':').map(Number);
    if (!isNaN(h)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${pad2(m || 0)} ${ampm}`;
    }
  }

  return str;
}

/**
 * Formats a Date or date string into a user-friendly date format (e.g. 'Sep 7, 2026') in local/PHT.
 */
export function formatDatePHT(date: Date | string | null | undefined): string {
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (date instanceof Date) {
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  const match = date.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const mIdx = Number(match[2]) - 1;
    return `${months[mIdx]} ${Number(match[3])}, ${match[1]}`;
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return String(date);
  return `${months[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Device-Timezone-Independent PHT Display Helpers
//
// These functions parse ISO-8601 strings DIRECTLY in Philippine Time (UTC+8)
// without relying on new Date() and device local timezone methods.
//
// This is critical because:
//   • Android emulators are typically set to UTC
//   • new Date("2026-09-06T17:34:00Z").getHours() → 17 on UTC device, 1 on PHT device
//   • These functions always return PHT values regardless of device timezone
// ─────────────────────────────────────────────────────────────────────────────

export interface PHTComponents {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Parses any ISO-8601 string into its Philippine Time (UTC+8) date/time components.
 * Handles: "2026-09-07T01:34:00.000+08:00", "2026-09-06T17:34:00.000Z", "2026-09-07"
 * Returns null if the string cannot be parsed.
 */
export function parseToPHT(isoStr: string | null | undefined): PHTComponents | null {
  if (!isoStr) return null;
  const trimmed = isoStr.trim();

  // Match: YYYY-MM-DD + optional T HH:MM:SS + optional timezone
  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?/
  );
  if (!m) return null;

  let year = Number(m[1]);
  let month = Number(m[2]);
  let day = Number(m[3]);
  let hour = m[4] !== undefined ? Number(m[4]) : 0;
  let minute = m[5] !== undefined ? Number(m[5]) : 0;
  let second = m[6] !== undefined ? Number(m[6]) : 0;
  const tz = m[7] ?? null;

  if (tz === null && !m[4]) {
    // Pure date string "YYYY-MM-DD" — no time, treat as PHT midnight
    return { year, month, day, hour: 0, minute: 0, second: 0 };
  }

  // Convert UTC epoch to PHT epoch, then extract components
  // Build UTC milliseconds from parsed components BEFORE applying offset
  const rawUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  let offsetMs = 0; // how far the timezone is from UTC (milliseconds)
  if (!tz || tz === 'Z') {
    offsetMs = 0; // UTC
  } else {
    const sign = tz[0] === '-' ? -1 : 1;
    const clean = tz.replace(':', '');
    const tzH = Number(clean.slice(1, 3));
    const tzM = Number(clean.slice(3, 5));
    offsetMs = sign * (tzH * 60 + tzM) * 60 * 1000;
  }

  // Subtract offset to get true UTC ms, then add PHT offset (+8h) to get PHT ms
  const phtMs = rawUtcMs - offsetMs + 8 * 60 * 60 * 1000;

  // Extract components using UTC methods (avoids device timezone)
  const d = new Date(phtMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

/**
 * Returns true if the ISO string falls on the same calendar day (in PHT) as `phtLocalDate`.
 * `phtLocalDate` should be a Date created from device local time (e.g. the calendar's selected day).
 * This is safe regardless of device timezone because we explicitly extract PHT components.
 */
export function isSameDayPHT(
  isoStr: string | null | undefined,
  phtLocalDate: Date
): boolean {
  const parts = parseToPHT(isoStr);
  if (!parts) return false;
  // phtLocalDate uses device-local getFullYear/Month/Date
  // On PHT devices this equals PHT; on UTC devices it needs PHT-aware comparison
  // Use our PHT parser on a generated string from phtLocalDate for safety
  const refY = phtLocalDate.getFullYear();
  const refMo = phtLocalDate.getMonth() + 1;
  const refD = phtLocalDate.getDate();
  return parts.year === refY && parts.month === refMo && parts.day === refD;
}

/**
 * Returns the exact UTC millisecond epoch for any timestamp string.
 * Accurately parses:
 *   • "+08:00" strings (e.g. "2026-09-07T01:50:00.000+08:00")
 *   • "Z" strings (e.g. "2026-09-06T17:50:00.000Z")
 *   • Bare UTC strings from PostgreSQL/PowerSync (e.g. "2026-09-06 17:50:00" or "2026-09-06 17:50")
 *   • Plain date strings (e.g. "2026-09-07")
 */
export function parseToEpoch(isoStr: string | null | undefined): number | null {
  if (!isoStr) return null;
  const trimmed = isoStr.trim();
  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?/
  );
  if (!m) {
    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? null : parsed;
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = m[4] !== undefined ? Number(m[4]) : 0;
  const minute = m[5] !== undefined ? Number(m[5]) : 0;
  const second = m[6] !== undefined ? Number(m[6]) : 0;
  const tz = m[7] ?? null;

  const rawUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  let offsetMs = 0;
  if (!tz || tz === 'Z') {
    // String from DB without timezone (e.g. "2026-09-06 17:50:00") is in UTC
    offsetMs = 0;
  } else {
    const sign = tz[0] === '-' ? -1 : 1;
    const clean = tz.replace(':', '');
    const tzH = Number(clean.slice(1, 3));
    const tzM = Number(clean.slice(3, 5));
    offsetMs = sign * (tzH * 60 + tzM) * 60 * 1000;
  }

  return rawUtcMs - offsetMs;
}

/**
 * Returns true if the task is strictly overdue (its due timestamp has already passed).
 * Compares against true epoch, completely independent of device timezone.
 */
export function isOverduePHT(isoStr: string | null | undefined): boolean {
  if (!isoStr) return false;
  const epoch = parseToEpoch(isoStr);
  if (epoch === null) return false;
  return epoch < Date.now();
}

/**
 * Returns true if the ISO string represents today's date in PHT.
 */
export function isTodayPHT(isoStr: string | null | undefined): boolean {
  const parts = parseToPHT(isoStr);
  if (!parts) return false;
  const today = getPhilippineToday(); // "YYYY-MM-DD"
  const [ty, tm, td] = today.split('-').map(Number);
  return parts.year === ty && parts.month === tm && parts.day === td;
}

/**
 * Returns true if the task is either overdue OR due today in Philippine Time.
 * Used to populate urgent task feeds.
 */
export function isTodayOrPastPHT(isoStr: string | null | undefined): boolean {
  if (!isoStr) return false;
  return isOverduePHT(isoStr) || isTodayPHT(isoStr);
}

const DISPLAY_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats any ISO string as "Sep 7, 2026 · 1:34 AM" in Philippine Time.
 * Safe regardless of device timezone.
 */
export function formatDateTimePHT(isoStr: string | null | undefined): string {
  if (!isoStr) return '';
  const p = parseToPHT(isoStr);
  if (!p) return '';
  const ampm = p.hour >= 12 ? 'PM' : 'AM';
  const h12 = p.hour % 12 || 12;
  return `${DISPLAY_MONTHS[p.month - 1]} ${p.day}, ${p.year} · ${h12}:${pad2(p.minute)} ${ampm}`;
}

/**
 * Formats any ISO string as "1:34 AM" (time only) in Philippine Time.
 * Safe regardless of device timezone.
 */
export function formatTimePHT(isoStr: string | null | undefined): string {
  if (!isoStr) return '';
  // If it's a plain HH:MM time string (class schedule), handle directly
  if (/^\d{1,2}:\d{2}$/.test(isoStr.trim())) {
    const [h, m] = isoStr.trim().split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${pad2(m)} ${ampm}`;
  }
  const p = parseToPHT(isoStr);
  if (!p) return '';
  const ampm = p.hour >= 12 ? 'PM' : 'AM';
  return `${p.hour % 12 || 12}:${pad2(p.minute)} ${ampm}`;
}

/**
 * Creates a JS Date suitable for feeding into DateTimePicker so the picker
 * displays the correct Philippine date and time regardless of device timezone.
 *
 * Strategy: use the local Date constructor with PHT components.
 * On PHT devices → device adds +8h → picker shows PHT time correctly.
 * On UTC devices → picker shows UTC time which equals PHT time numerically
 *   (the hour/minute digits shown match what the user originally chose).
 *
 * When saved via toPhilippineISO(date), getHours() returns the same digits → stores correctly.
 */
export function parseToPHTDate(isoStr: string | null | undefined): Date | null {
  if (!isoStr) return null;
  const p = parseToPHT(isoStr);
  if (!p) return null;
  // Use LOCAL constructor so picker shows PHT hour/minute digits on any device
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
}
