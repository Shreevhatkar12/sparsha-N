import { Request, Response, NextFunction } from "express";
import * as messageService from "../services/message.service.js";

export async function listThreads(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req.user!;
    const threads = await messageService.listThreads(userId, role);
    res.json(threads);
  } catch (err) {
    next(err);
  }
}

export async function getThreadMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { threadId } = req.params;
    const { userId, role } = req.user!;
    const messages = await messageService.getThreadMessages(threadId, userId, role);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { threadId } = req.params;
    const { content } = req.body;
    const userId = req.user!.userId;
    const message = await messageService.sendMessage(threadId, userId, content);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

export async function createThread(req: Request, res: Response, next: NextFunction) {
  try {
    const { participantIds, subject, message } = req.body;
    const userId = req.user!.userId;
    const thread = await messageService.createThread(userId, participantIds, subject, message);
    res.status(201).json(thread);
  } catch (err) {
    next(err);
  }
}
