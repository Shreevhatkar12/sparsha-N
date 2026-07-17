import prisma from "../lib/prisma.js";
import { ForbiddenError, NotFoundError, ValidationError, } from "../lib/errors.js";
function ensureCenterAccess(user, centerId) {
    if (user.role !== "super_admin" && !user.centerIds.includes(centerId)) {
        throw new ForbiddenError("No access to the requested center");
    }
}
function validateSchema(schema) {
    if (!schema || !Array.isArray(schema.fields) || schema.fields.length === 0) {
        throw new ValidationError("schema.fields must be a non-empty array");
    }
    for (const field of schema.fields) {
        if (!field.name ||
            !field.label ||
            typeof field.required !== "boolean" ||
            !field.type) {
            throw new ValidationError("Each field must have name, label, type, required");
        }
        const allowed = [
            "text",
            "textarea",
            "date",
            "number",
            "boolean",
            "select",
        ];
        if (!allowed.includes(field.type)) {
            throw new ValidationError(`Unsupported field type: ${field.type}`);
        }
        if (field.type === "select" &&
            (!Array.isArray(field.options) || field.options.length === 0)) {
            throw new ValidationError("select fields must include non-empty options array");
        }
    }
}
function parseDate(value) {
    if (!value)
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new ValidationError("Invalid date");
    }
    return date;
}
export async function createTemplate(user, input) {
    validateSchema(input.schema);
    const schemaWithVersion = {
        ...input.schema,
        version: input.schema.version ?? 1,
    };
    return prisma.formTemplate.create({
        data: {
            formType: input.formType,
            name: input.name,
            targetEntity: input.targetEntity ?? "student",
            createdBy: user.userId,
            schema: schemaWithVersion,
        },
    });
}
export async function listTemplates(formType, options) {
    return prisma.formTemplate.findMany({
        where: {
            ...(options?.includeInactive ? {} : { isActive: true }),
            ...(formType ? { formType } : {}),
        },
        orderBy: { createdAt: "desc" },
    });
}
export async function getTemplateById(templateId) {
    const template = await prisma.formTemplate.findUnique({
        where: { id: templateId },
    });
    if (!template)
        throw new NotFoundError("Form template");
    return template;
}
export async function updateTemplate(templateId, input) {
    const existing = await getTemplateById(templateId);
    validateSchema(input.schema);
    const prevSchema = existing.schema;
    const schemaWithVersion = {
        ...input.schema,
        version: input.schema.version ?? (prevSchema?.version ?? 1) + 1,
    };
    return prisma.formTemplate.update({
        where: { id: templateId },
        data: {
            formType: input.formType,
            name: input.name,
            schema: schemaWithVersion,
        },
    });
}
export async function softDeleteTemplate(templateId) {
    await getTemplateById(templateId);
    return prisma.formTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
    });
}
export async function submitForm(user, input) {
    ensureCenterAccess(user, input.centerId);
    const [template, student] = await Promise.all([
        prisma.formTemplate.findUnique({ where: { id: input.templateId } }),
        prisma.student.findUnique({
            where: { id: input.studentId },
            select: { id: true, centerId: true, fullName: true },
        }),
    ]);
    if (!template || !template.isActive) {
        throw new NotFoundError("Form template");
    }
    if (!student) {
        throw new NotFoundError("Student");
    }
    if (student.centerId !== input.centerId) {
        throw new ValidationError("studentId does not belong to centerId");
    }
    const schema = template.schema;
    validateSchema(schema);
    for (const field of schema.fields) {
        if (field.required) {
            const value = input.data[field.name];
            if (value === undefined || value === null || value === "") {
                throw new ValidationError(`Missing required field: ${field.name}`);
            }
        }
    }
    return prisma.formSubmission.create({
        data: {
            templateId: input.templateId,
            studentId: input.studentId,
            centerId: input.centerId,
            submittedBy: user.userId,
            data: input.data,
        },
        include: {
            template: { select: { id: true, name: true, formType: true } },
            student: { select: { id: true, fullName: true } },
        },
    });
}
export async function listSubmissions(user, query) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.max(query.limit ?? 50, 1);
    const skip = (page - 1) * limit;
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    const centerFilter = user.role === "super_admin"
        ? query.centerId
        : query.centerId
            ? user.centerIds.includes(query.centerId)
                ? query.centerId
                : { in: [] }
            : { in: user.centerIds };
    const where = {
        centerId: centerFilter,
        ...(query.templateId ? { templateId: query.templateId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(from || to
            ? {
                submittedAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                },
            }
            : {}),
    };
    const [submissions, total] = await Promise.all([
        prisma.formSubmission.findMany({
            where,
            skip,
            take: limit,
            orderBy: { submittedAt: "desc" },
            include: {
                template: { select: { name: true, formType: true } },
                student: { select: { fullName: true } },
            },
        }),
        prisma.formSubmission.count({ where }),
    ]);
    return {
        submissions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}
export async function getSubmissionById(user, submissionId) {
    const submission = await prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
            template: true,
            student: true,
        },
    });
    if (!submission)
        throw new NotFoundError("Form submission");
    ensureCenterAccess(user, submission.centerId);
    return submission;
}
export async function deleteSubmission(submissionId) {
    await prisma.formSubmission.findUniqueOrThrow({
        where: { id: submissionId },
    });
    await prisma.formSubmission.delete({ where: { id: submissionId } });
    return { success: true };
}
export async function getStudentSubmissions(user, studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student)
        throw new NotFoundError("Student");
    ensureCenterAccess(user, student.centerId);
    const submissions = await prisma.formSubmission.findMany({
        where: { studentId },
        include: {
            template: { select: { id: true, name: true, formType: true } },
        },
        orderBy: { submittedAt: "desc" },
    });
    const grouped = submissions.reduce((acc, row) => {
        const key = row.template.formType;
        if (!acc[key])
            acc[key] = [];
        acc[key].push(row);
        return acc;
    }, {});
    return { studentId, groupedByFormType: grouped };
}
export async function getPendingSubmissions(user, query) {
    if (!query.templateId) {
        throw new ValidationError("templateId is required");
    }
    const centerId = query.centerId ??
        (user.role === "super_admin"
            ? undefined
            : user.centerIds.length === 1
                ? user.centerIds[0]
                : undefined);
    if (!centerId && user.role !== "super_admin") {
        throw new ValidationError("centerId is required for multi-center users");
    }
    if (centerId)
        ensureCenterAccess(user, centerId);
    const studentWhere = {
        ...(centerId
            ? { centerId }
            : user.role === "super_admin"
                ? {}
                : { centerId: { in: user.centerIds } }),
        isActive: true,
    };
    const students = await prisma.student.findMany({
        where: studentWhere,
        select: { id: true, fullName: true, centerId: true, programId: true },
        orderBy: { fullName: "asc" },
    });
    const existing = await prisma.formSubmission.findMany({
        where: {
            templateId: query.templateId,
            studentId: { in: students.map((s) => s.id) },
        },
        select: { studentId: true },
    });
    const submittedIds = new Set(existing.map((row) => row.studentId));
    return students.filter((student) => !submittedIds.has(student.id));
}
