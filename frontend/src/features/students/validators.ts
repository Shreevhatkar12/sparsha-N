import { z } from 'zod';

export const attendanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  sessionTopic: z.string().min(1, 'Session topic is required'),
  status: z.enum(['present', 'absent', 'late']),
});

export const skillSchema = z.object({
  communication: z.coerce.number().int().min(1).max(5),
  confidence: z.coerce.number().int().min(1).max(5),
  computerSkill: z.coerce.number().int().min(1).max(5),
  problemSolving: z.coerce.number().int().min(1).max(5),
  languageSkill: z.coerce.number().int().min(1).max(5),
});

export const careerSchema = z.object({
  interestedCareer: z.string().min(1, 'Interested career is required'),
  courseSelected: z.string().min(1, 'Course is required'),
  collegeApplied: z.string().min(1, 'College/applied target is required'),
  scholarship: z.boolean(),
  followupStatus: z.string().min(1, 'Follow-up status is required'),
});
