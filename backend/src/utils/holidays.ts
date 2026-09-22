// ----------------------------------------------------------------------
// Official SPARSHA holiday calendar.
//
// A "default holiday" is Sunday, OR a date on this list — both are
// excluded from attendance % calculations UNLESS a center actually held
// a class that day (a teacher explicitly saved attendance for it — see
// bulkUpdateSessionRecords in attendanceService.ts, which flips the
// session's isHoliday flag back to false the moment real attendance is
// submitted for it).
//
// Add future years' holiday lists here as SPARSHA sends them — nothing
// else needs to change.
// ----------------------------------------------------------------------
const OFFICIAL_HOLIDAYS: Record<number, string[]> = {
  2026: [
    '2026-01-01', // New Year
    '2026-03-03', // Holi
    '2026-03-19', // Gudi Padwa
    '2026-05-01', // Maharashtra Day
    '2026-08-28', // Raksha Bandhan
    '2026-09-04', // Janmashtami
    '2026-09-14', // Ganesh Chaturthi
    '2026-09-25', // Anant Chaturdashi
    '2026-10-20', // Dussehra
    '2026-11-09', // Diwali
    '2026-12-06', // Maha Nirvana Divas
    '2026-12-25', // Christmas
  ],
};

// sessionDate is stored as a plain @db.Date (midnight UTC, no real time
// component) — reading UTC parts avoids an off-by-one from local timezone
// shifts when the server or a client is not on UTC.
function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDefaultHoliday(date: Date): boolean {
  if (date.getUTCDay() === 0) return true; // Sunday
  const key = toDateKey(date);
  const year = date.getUTCFullYear();
  return (OFFICIAL_HOLIDAYS[year] || []).includes(key);
}

export function holidaysForYear(year: number): string[] {
  return OFFICIAL_HOLIDAYS[year] || [];
}
