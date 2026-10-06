/**
 * Date normalization for SQL Server `smalldatetime` procedure parameters.
 *
 * Values bound as `VarChar` to `smalldatetime` params fail with
 * "Error converting data type varchar to smalldatetime" unless they use the
 * unambiguous `YYYYMMDD` format (independent of the session DATEFORMAT).
 * This helper converts every known dirty input (`DD/MM/YYYY`, `YYYY-MM-DD`,
 * serialized `Date` strings, `Date` objects) to `YYYYMMDD`, and maps anything
 * unparseable (`""`, `"null"`, garbage) to `''` instead of passing it through
 * raw to the stored procedure.
 */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildYmd(y: number, m: number, d: number): string {
  return `${y}${pad2(m)}${pad2(d)}`;
}

function isPlausibleYmd(y: number, m: number, d: number): boolean {
  return y >= 1753 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

/**
 * Calendar (wall) day in America/Lima (UTC-5, no DST) for a given instant.
 * The SPs expect the date the operator sees on screen in Lima, not the UTC
 * day: e.g. 22 Sep 20:00 in Lima is 23 Sep 01:00Z, but must be sent as
 * `YYYYMMDD` of the 22nd. Explicit timeZone keeps this deterministic no
 * matter which TZ the server runs in (UTC getters shift the day, and server
 * local getters depend on the host).
 */
const limaDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function buildYmdFromLimaWallDay(value: Date): string {
  const parts = limaDayFormat.formatToParts(value);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

/**
 * Normalizes `value` to `YYYYMMDD` for SQL Server date params.
 * Idempotent: an already-normalized `YYYYMMDD` string is returned as-is.
 * Returns `''` for empty/invalid input and reports it via `onInvalid`
 * (callers wire it to their Nest `Logger.warn`).
 */
export function toIsoDateParam(
  value: string | Date | undefined | null,
  onInvalid?: (raw: string) => void,
): string {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      onInvalid?.('Invalid Date');
      return '';
    }
    // Lima wall day: the SP expects the calendar date seen in Lima,
    // not the UTC day of the instant.
    return buildYmdFromLimaWallDay(value);
  }

  const s = (value ?? '').trim();
  if (!s) {
    onInvalid?.(s);
    return '';
  }
  const lowered = s.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') {
    onInvalid?.(s);
    return '';
  }

  // Already normalized → idempotent.
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(4, 6));
    const d = Number(s.slice(6, 8));
    if (isPlausibleYmd(y, m, d)) return s;
    onInvalid?.(s);
    return '';
  }

  // DD/MM/YYYY (legacy Peruvian locale; tolerates a trailing time part).
   const dm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    const y = Number(dm[3]);
    if (isPlausibleYmd(y, m, d)) return buildYmd(y, m, d);
    // Out-of-range DD/MM/YYYY (e.g. month 23 from a MM/DD/YYYY mix-up):
    // fall through to the Date parser instead of emitting garbage.
  }

  // YYYY-MM-DD: bare calendar date stays as-is; with a time suffix
  // (T.../Z/offset) it is an instant → Lima wall day, same as Date branch.
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (isPlausibleYmd(y, m, d)) {
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return buildYmd(y, m, d);
      const instant = new Date(s);
      if (!isNaN(instant.getTime())) {
        return buildYmdFromLimaWallDay(instant);
      }
      // Invalid Date: fall through to the last-resort parser below,
      // which reports via onInvalid and returns ''.
    }
  }

  // Last resort: serialized Date strings ("Wed Sep 23 2026 00:00:00 GMT+0000")
  // and any other format the JS engine can parse.
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return buildYmdFromLimaWallDay(parsed);
  }

  onInvalid?.(s);
  return '';
}
