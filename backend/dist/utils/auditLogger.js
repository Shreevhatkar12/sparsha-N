import prisma from '../lib/prisma.js';
export async function logAudit(entry, tx) {
    const db = tx || prisma;
    await db.auditLog.create({
        data: {
            userId: entry.userId,
            action: entry.action,
            tableName: entry.targetModel,
            recordId: entry.targetId,
            newData: entry.meta,
        }
    });
}
