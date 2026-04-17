import { z } from "zod";

const uuid = z.string().uuid();
const optionalDateString = z
  .string()
  .optional()
  .refine((s) => !s || !Number.isNaN(Date.parse(s)), "Invalid date");

export const createStudentSchema = z.object({
  fullName: z.string().min(2),
  centerId: uuid,
  programId: uuid,
  dob: optionalDateString,
  gender: z.enum(["male", "female", "other"]).optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

export const updateStudentSchema = z.object({
  fullName: z.string().min(2).optional(),
  dob: optionalDateString,
  gender: z.enum(["male", "female", "other"]).optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

export const createAttendanceSessionSchema = z.object({
  centerId: uuid,
  programId: uuid,
  sessionDate: z.string().min(1),
  activityId: uuid.optional(),
});

export const updateAttendanceSessionRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        recordId: uuid,
        status: z.enum(["present", "absent", "late"]),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

export const createExamSchema = z.object({
  centerId: uuid,
  programId: uuid,
  examType: z.enum(["baseline", "endline"]),
  academicYear: z.string().min(1),
  examDate: optionalDateString,
});

const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "date", "number", "boolean", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const formSchemaJsonSchema = z.object({
  fields: z.array(formFieldSchema).min(1),
  version: z.number().int().positive().optional(),
});

export const createFormTemplateSchema = z.object({
  formType: z.string().min(1),
  name: z.string().min(1),
  schema: formSchemaJsonSchema,
});

export const updateFormTemplateSchema = createFormTemplateSchema;

export const submitFormSchema = z.object({
  templateId: uuid,
  studentId: uuid,
  centerId: uuid,
  data: z.record(z.string(), z.unknown()),
});

export const upsertExamScoresSchema = z.object({
  scores: z
    .array(
      z.object({
        studentId: uuid,
        subject: z.string().min(1),
        marks: z.number(),
        maxMarks: z.number().positive().optional(),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});
