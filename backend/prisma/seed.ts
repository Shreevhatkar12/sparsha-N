import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting DB seeding...");

  // 1. Programs
  console.log("Upserting Programs...");
  const pSwayam = await prisma.program.upsert({
    where: { code: "SWAYAM" },
    update: {},
    create: {
      code: "SWAYAM",
      name: "Swayam Youth Development Program",
      ageMin: 15,
      ageMax: 18,
      isActive: true,
    },
  });

  const pShiksha = await prisma.program.upsert({
    where: { code: "SHIKSHA" },
    update: {},
    create: {
      code: "SHIKSHA",
      name: "Shiksha Early Learning Program",
      ageMin: 3,
      ageMax: 6,
      isActive: true,
    },
  });

  // 2. Centers
  console.log("Upserting Centers...");
  async function upsertCenter(name: string, location: string) {
    let center = await prisma.center.findFirst({ where: { name } });
    if (!center) {
      center = await prisma.center.create({
        data: { name, location, isActive: true },
      });
    }
    return center;
  }

  const andheriCenter = await upsertCenter("Andheri Center", "Andheri, Mumbai");
  const dharaviCenter = await upsertCenter("Dharavi Center", "Dharavi, Mumbai");

  // 3. CenterPrograms
  console.log("Assigning Programs to Centers...");
  async function assignCenterProgram(centerId: string, programId: string) {
    await prisma.centerProgram.upsert({
      where: { centerId_programId: { centerId, programId } },
      update: {},
      create: { centerId, programId, isActive: true },
    });
  }

  await assignCenterProgram(andheriCenter.id, pSwayam.id);
  await assignCenterProgram(dharaviCenter.id, pSwayam.id);

  // 4. Users
  console.log("Upserting Users...");
  const defaultPassword = await bcrypt.hash("SuperAdmin@123", 10);
  const staffPassword = await bcrypt.hash("Staff@123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super_admin_1' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'super_admin_1',
      fullName: 'System Super Admin',
      passwordHash: defaultPassword,
      role: 'super_admin',
      isActive: true,
    },
  });

  const techAdmin = await prisma.user.upsert({
    where: { email: 'tech_admin_1' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'tech_admin_1',
      fullName: 'Technical Support Admin',
      passwordHash: defaultPassword,
      role: 'tech_admin',
      creator: { connect: { id: superAdmin.id } },
      isActive: true,
    },
  });

  const centerAdmin = await prisma.user.upsert({
    where: { email: 'center_admin_1' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'center_admin_1',
      fullName: 'Vansh - Center Head',
      passwordHash: defaultPassword,
      role: 'center_admin',
      creator: { connect: { id: superAdmin.id } },
      isActive: true,
    },
  });

  const teacher1 = await prisma.user.upsert({
    where: { email: "teacher_1" },
    update: { passwordHash: staffPassword },
    create: {
      email: "teacher_1",
      passwordHash: staffPassword,
      fullName: "Teacher One",
      role: "teacher",
      creator: { connect: { id: centerAdmin.id } },
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: "teacher_2" },
    update: { passwordHash: staffPassword },
    create: {
      email: "teacher_2",
      passwordHash: staffPassword,
      fullName: "Teacher Two",
      role: "teacher",
      creator: { connect: { id: centerAdmin.id } },
    },
  });

  // 5. Center Assignments
  await prisma.userCenterAssignment.upsert({
    where: { userId_centerId: { userId: superAdmin.id, centerId: andheriCenter.id } },
    update: {}, create: { userId: superAdmin.id, centerId: andheriCenter.id, createdBy: superAdmin.id }
  });
  await prisma.userCenterAssignment.upsert({
    where: { userId_centerId: { userId: techAdmin.id, centerId: andheriCenter.id } },
    update: {}, create: { userId: techAdmin.id, centerId: andheriCenter.id, createdBy: superAdmin.id }
  });
  await prisma.userCenterAssignment.upsert({
    where: { userId_centerId: { userId: centerAdmin.id, centerId: andheriCenter.id } },
    update: {}, create: { userId: centerAdmin.id, centerId: andheriCenter.id, createdBy: superAdmin.id }
  });
  await prisma.userCenterAssignment.upsert({
    where: { userId_centerId: { userId: teacher1.id, centerId: andheriCenter.id } },
    update: {}, create: { userId: teacher1.id, centerId: andheriCenter.id, createdBy: superAdmin.id }
  });
  await prisma.userCenterAssignment.upsert({
    where: { userId_centerId: { userId: teacher2.id, centerId: dharaviCenter.id } },
    update: {}, create: { userId: teacher2.id, centerId: dharaviCenter.id, createdBy: superAdmin.id }
  });

  // 6. Students
  console.log("Creating Students...");
  const students = [];
  for (let i = 0; i < 40; i++) {
    const center = i < 20 ? andheriCenter : dharaviCenter;
    const s = await prisma.student.create({
      data: {
        fullName: `Student ${i + 1}`,
        centerId: center.id,
        programId: pSwayam.id,
        dob: new Date(2008, i % 12, (i % 28) + 1),
        gender: i % 2 === 0 ? "male" : "female",
        guardianName: "Guardian",
        guardianPhone: `98000000${i.toString().padStart(2, '0')}`,
      }
    });
    students.push(s);
  }

  // 7. Attendance
  console.log("Creating Attendance...");
  for (let d = 5; d > 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const session = await prisma.attendanceSession.create({
      data: { centerId: andheriCenter.id, programId: pSwayam.id, sessionDate: date, createdBy: teacher1.id }
    });
    const records = students.slice(0, 20).map(s => ({
      sessionId: session.id, studentId: s.id, centerId: andheriCenter.id, status: Math.random() > 0.1 ? "present" : "absent" as any
    }));
    await prisma.attendanceRecord.createMany({ data: records });
  }

  // 8. Exams
  console.log("Upserting Exams & Scores...");
  const sEnglish = await prisma.programSubject.upsert({
    where: { programId_name: { programId: pSwayam.id, name: "English" } },
    update: {}, create: { programId: pSwayam.id, name: "English" }
  });
  const sMaths = await prisma.programSubject.upsert({
    where: { programId_name: { programId: pSwayam.id, name: "Mathematics" } },
    update: {}, create: { programId: pSwayam.id, name: "Mathematics" }
  });

  const ay2024 = await prisma.academicYear.upsert({
    where: { label: "2024-25" },
    update: {},
    create: { label: "2024-25", startDate: new Date(2024, 5, 1), endDate: new Date(2025, 4, 31), isCurrent: true }
  });

  const baseline = await prisma.exam.create({
    data: { name: "Baseline 2024", examType: "baseline", centerId: andheriCenter.id, programId: pSwayam.id, createdBy: teacher1.id, academicYearId: ay2024.id }
  });
  const endline = await prisma.exam.create({
    data: { name: "Endline 2024", examType: "endline", centerId: andheriCenter.id, programId: pSwayam.id, createdBy: teacher1.id, academicYearId: ay2024.id }
  });

  const scores = [];
  for (let i = 0; i < 20; i++) {
    const s = students[i];
    [sEnglish.id, sMaths.id].forEach(subId => {
      scores.push({ examId: baseline.id, studentId: s.id, centerId: andheriCenter.id, subjectId: subId, marks: 20 + Math.random() * 20, enteredBy: teacher1.id });
      scores.push({ examId: endline.id, studentId: s.id, centerId: andheriCenter.id, subjectId: subId, marks: 40 + Math.random() * 10, enteredBy: teacher1.id });
    });
  }
  await prisma.examScore.createMany({ data: scores });

  // 9. Skills
  console.log("Upserting Skills...");
  const skillDefs = [];
  for (const name of ["Communication", "Leadership", "Teamwork"]) {
    const sk = await prisma.skillDefinition.upsert({
      where: { programId_name: { programId: pSwayam.id, name } },
      update: {}, create: { programId: pSwayam.id, name, description: name }
    });
    skillDefs.push(sk);
  }

  for (const s of students.slice(0, 30)) {
    for (const sk of skillDefs) {
      await prisma.studentSkillLog.create({
        data: { studentId: s.id, centerId: s.centerId, skillId: sk.id, level: Math.floor(Math.random() * 5) + 1, assessedBy: teacher1.id }
      });
    }
  }

  // 10. Career (Forms)
  console.log("Upserting Career Forms...");
  const careerTpl = await prisma.formTemplate.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" }, // Using a fixed UUID for easy ref
    update: {},
    create: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Career Tracking", formType: "system", targetEntity: "student", createdBy: superAdmin.id, schema: { fields: [] }
    }
  });

  for (const s of students.slice(0, 10)) {
    await prisma.formSubmission.create({
      data: {
        templateId: careerTpl.id, studentId: s.id, centerId: s.centerId, submittedBy: teacher1.id,
        data: { careerGoal: "Software Engineer", industry: "Tech" }
      }
    });
  }

  console.log("Seeding complete.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());