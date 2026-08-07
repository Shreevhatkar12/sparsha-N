import cron from 'node-cron';
import axios from 'axios';
import prisma from './lib/prisma.js';

export function startCronJobs() {
  console.log("Starting cron jobs...");

  // Keep-alive: on Render/Neon free tier the server + DB "sleep" after a few
  // minutes idle, which causes a slow 30-60s cold start on the next visit.
  // Every 10 minutes we touch the DB (keeps Neon awake) and self-ping the
  // public URL (keeps the Render web service from spinning down). Best-effort.
  cron.schedule('*/10 * * * *', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      /* DB warm-up is best-effort */
    }
    const selfUrl = process.env.RENDER_EXTERNAL_URL;
    if (selfUrl) {
      try {
        await axios.get(selfUrl, { timeout: 15000 });
      } catch {
        /* keep-alive ping is best-effort */
      }
    }
  });

  // Run every day at 23:59
  cron.schedule('59 23 * * *', async () => {
    console.log("Running auto-submit attendance cron job...");
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await prisma.attendanceRecord.updateMany({
        where: {
          status: "pending",
          session: {
            sessionDate: today,
            isHoliday: false,
          },
        },
        data: {
          status: "absent",
        },
      });

      console.log(`Auto-submitted attendance. Marked ${result.count} pending records as absent.`);
    } catch (error) {
      console.error("Error running auto-submit attendance cron job:", error);
    }
  });
}
