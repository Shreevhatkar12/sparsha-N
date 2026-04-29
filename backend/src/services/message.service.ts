import prisma from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export async function listThreads(userId: string, role?: string) {
  const where: any = {};
  if (role !== 'super_admin') {
    where.participants = { some: { userId } };
  }
  
  return prisma.messageThread.findMany({
    where,
    include: {
      participants: {
        include: { user: { select: { fullName: true, email: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getThreadMessages(threadId: string, userId: string, role?: string) {
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { participants: true },
  });

  if (!thread) throw new AppError("Thread not found", 404);
  if (role !== 'super_admin' && !thread.participants.some((p) => p.userId === userId)) {
    throw new AppError("Access denied", 403);
  }

  return prisma.message.findMany({
    where: { threadId },
    include: { sender: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(threadId: string, senderId: string, content: string) {
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { participants: true },
  });

  if (!thread) throw new AppError("Thread not found", 404);
  if (!thread.participants.some((p) => p.userId === senderId)) {
    throw new AppError("Access denied", 403);
  }

  const message = await prisma.message.create({
    data: {
      threadId,
      senderId,
      body: content,
    },
  });


  return message;
}

export async function createThread(creatorId: string, participantIds: string[], subject: string, initialMessage?: string) {
  const thread = await prisma.messageThread.create({
    data: {
      subject,
      createdBy: creatorId,
      participants: {
        create: [
          { userId: creatorId },
          ...participantIds.map((id) => ({ userId: id })),
        ],
      },
      ...(initialMessage
        ? {
            messages: {
              create: {
                senderId: creatorId,
                body: initialMessage,
              },
            },
          }
        : {}),
    },
  });

  return thread;
}
