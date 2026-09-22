// ----------------------------------------------------------------------
// One-time backfill: flag EXISTING attendance sessions as holidays where
// they fall on a Sunday or an official SPARSHA holiday date, so old data
// also benefits from the "holidays don't count against attendance %" fix.
//
// Rule (matches the live logic in attendanceService.ts):
//   - Sunday / official holiday date, and nobody actually marked real
//     attendance that day (no present/late/excused records) → flag it
//     isHoliday = true (excluded from attendance % going forward).
//   - Sunday / official holiday date, but a real class WAS held and
//     marked (present/late/excused records exist) → make sure it stays
//     isHoliday = false, since a real class happened.
//   - Any normal (non-holiday) date is left untouched.
//
// Usage (run from the backend/ folder):
//   npx tsx scripts/backfill-holidays.ts            # dry run — just prints counts
//   npx tsx scripts/backfill-holidays.ts --apply     # actually writes the changes
//
// Run the dry run first, check the numbers look sane, then run --apply once.
// ----------------------------------------------------------------------
import prisma from '../src/lib/prisma.js';
import { isDefaultHoliday } from '../src/utils/holidays.js';

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(
    APPLY
      ? 'Backfilling holiday flags on existing attendance sessions (APPLYING CHANGES)...'
      : 'Backfilling holiday flags on existing attendance sessions (DRY RUN — pass --apply to write changes)...'
  );

  const sessions = await prisma.attendanceSession.findMany({
    select: {
      id: true,
      sessionDate: true,
      isHoliday: true,
      records: { select: { status: true } },
    },
  });

  let toFlagHoliday = 0;
  let toUnflagHoliday = 0;
  let unchanged = 0;

  for (const session of sessions) {
    const defaultHoliday = isDefaultHoliday(session.sessionDate);
    const hasRealAttendance = session.records.some(
      (r) => r.status === 'present' || r.status === 'late' || r.status === 'excused'
    );

    if (defaultHoliday && !hasRealAttendance && !session.isHoliday) {
      // Sunday/holiday with no real class marked -> flag as holiday.
      toFlagHoliday++;
      if (APPLY) {
        await prisma.attendanceSession.update({
          where: { id: session.id },
          data: { isHoliday: true },
        });
      }
    } else if (defaultHoliday && hasRealAttendance && session.isHoliday) {
      // Sunday/holiday but a real class WAS held and marked -> un-flag.
      toUnflagHoliday++;
      if (APPLY) {
        await prisma.attendanceSession.update({
          where: { id: session.id },
          data: { isHoliday: false },
        });
      }
    } else {
      unchanged++;
    }
  }

  console.log(`Total sessions scanned: ${sessions.length}`);
  console.log(`Sessions to flag as holiday (Sunday/official holiday, no real class held): ${toFlagHoliday}`);
  console.log(`Sessions to un-flag (holiday date, but a real class was actually held): ${toUnflagHoliday}`);
  console.log(`Unchanged: ${unchanged}`);

  if (!APPLY) {
    console.log('\nThis was a DRY RUN - no changes were made. Re-run with --apply to write these changes:');
    console.log('  npx tsx scripts/backfill-holidays.ts --apply');
  } else {
    console.log('\nDone - changes applied.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
