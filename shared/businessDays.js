/** Dias úteis (seg–sex) com feriados nacionais do Brasil */

function parseIsoLocal(iso) {
  if (!iso || typeof iso !== "string") return null;
  const parts = iso.trim().split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toIsoLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addCalendarDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Domingo de Páscoa (calendário gregoriano) */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const holidayCache = new Map();

function holidaysForYear(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);

  const fixed = [
    `${year}-01-01`,
    `${year}-04-21`,
    `${year}-05-01`,
    `${year}-09-07`,
    `${year}-10-12`,
    `${year}-11-02`,
    `${year}-11-15`,
    `${year}-12-25`
  ];

  const easter = easterSunday(year);
  const mobile = [
    toIsoLocal(addCalendarDays(easter, -48)),
    toIsoLocal(addCalendarDays(easter, -47)),
    toIsoLocal(addCalendarDays(easter, -2)),
    toIsoLocal(addCalendarDays(easter, 60))
  ];

  const set = new Set([...fixed, ...mobile]);
  holidayCache.set(year, set);
  return set;
}

export function isWeekend(isoOrDate) {
  const d =
    typeof isoOrDate === "string" ? parseIsoLocal(isoOrDate) : new Date(isoOrDate);
  if (!d) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(iso) {
  const d = parseIsoLocal(iso);
  if (!d) return false;
  return holidaysForYear(d.getFullYear()).has(toIsoLocal(d));
}

export function isBusinessDay(iso) {
  if (!iso) return false;
  return !isWeekend(iso) && !isHoliday(iso);
}

/** Se cair em fim de semana ou feriado, volta para o dia útil anterior */
export function adjustToPreviousBusinessDay(iso) {
  const d = parseIsoLocal(iso);
  if (!d) return iso;

  let current = d;
  while (!isBusinessDay(toIsoLocal(current))) {
    current = addCalendarDays(current, -1);
  }
  return toIsoLocal(current);
}

export function normalizeDeliveryDate(iso) {
  return adjustToPreviousBusinessDay(iso);
}

/** Retrocede N dias úteis (não conta o dia de referência) */
export function subtractBusinessDays(dateStr, days) {
  const d = parseIsoLocal(dateStr);
  if (!d || days <= 0) return dateStr;

  let remaining = days;
  let current = d;

  while (remaining > 0) {
    current = addCalendarDays(current, -1);
    if (isBusinessDay(toIsoLocal(current))) {
      remaining--;
    }
  }

  return toIsoLocal(current);
}

/** Alias usado pelo workflow */
export const subtractDays = subtractBusinessDays;
