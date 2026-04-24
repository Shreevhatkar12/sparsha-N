import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting Extensive DB seeding...");

  // 1. Academic Years
  console.log("Upserting Academic Years...");
  const ay2024 = await prisma.academicYear.upsert({
    where: { label: "2024-25" },
    update: {},
    create: { label: "2024-25", startDate: new Date(2024, 5, 1), endDate: new Date(2025, 4, 31), isCurrent: false }
  });
  const ay2025 = await prisma.academicYear.upsert({
    where: { label: "2025-26" },
    update: {},
    create: { label: "2025-26", startDate: new Date(2025, 5, 1), endDate: new Date(2026, 4, 31), isCurrent: true }
  });
  const ay2026 = await prisma.academicYear.upsert({
    where: { label: "2026-27" },
    update: {},
    create: { label: "2026-27", startDate: new Date(2026, 5, 1), endDate: new Date(2027, 4, 31), isCurrent: false }
  });

  // 2. Programs
  console.log("Upserting Programs...");
  const pSwayam = await prisma.program.upsert({
    where: { code: "SWAYAM" },
    update: { name: "Swayam Youth Development", ageMin: 15, ageMax: 18, isActive: true },
    create: { code: "SWAYAM", name: "Swayam Youth Development", ageMin: 15, ageMax: 18, isActive: true }
  });
  const pShiksha = await prisma.program.upsert({
    where: { code: "SHIKSHA" },
    update: { name: "Shiksha Early Learning", ageMin: 3, ageMax: 6, isActive: true },
    create: { code: "SHIKSHA", name: "Shiksha Early Learning", ageMin: 3, ageMax: 6, isActive: true }
  });

  const pMap = { SWAYAM: pSwayam, SHIKSHA: pShiksha };

  // 3. Subjects
  console.log("Upserting Subjects...");
  const subjects = ["English", "Mathematics", "Science", "Soft Skills", "Computer Literacy"];
  const subMap: any = { SWAYAM: [], SHIKSHA: [] };
  for (const sName of subjects) {
    const s1 = await prisma.programSubject.upsert({
      where: { programId_name: { programId: pSwayam.id, name: sName } },
      update: {}, create: { programId: pSwayam.id, name: sName }
    });
    subMap.SWAYAM.push(s1);
    const s2 = await prisma.programSubject.upsert({
      where: { programId_name: { programId: pShiksha.id, name: sName } },
      update: {}, create: { programId: pShiksha.id, name: sName }
    });
    subMap.SHIKSHA.push(s2);
  }

  // 4. Centers
  console.log("Upserting Centers...");
  const centerNames = ["Andheri Center", "Dharavi Center", "Govandi Center", "Kurla Center", "Malad Center"];
  const centers = [];
  for (const name of centerNames) {
    let center = await prisma.center.findFirst({ where: { name } });
    if (!center) {
      center = await prisma.center.create({ data: { name, location: `${name} Location`, isActive: true } });
    }
    centers.push(center);
    // Assign programs
    await prisma.centerProgram.upsert({
      where: { centerId_programId: { centerId: center.id, programId: pSwayam.id } },
      update: {}, create: { centerId: center.id, programId: pSwayam.id, isActive: true }
    });
    await prisma.centerProgram.upsert({
      where: { centerId_programId: { centerId: center.id, programId: pShiksha.id } },
      update: {}, create: { centerId: center.id, programId: pShiksha.id, isActive: true }
    });
  }

  // 5. Users
  console.log("Upserting Users...");
  const superPassword = await bcrypt.hash("SuperAdmin@123", 10);
  const staffPassword = await bcrypt.hash("Staff@123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super_admin_1' },
    update: { passwordHash: superPassword },
    create: { email: 'super_admin_1', fullName: 'System Super Admin', passwordHash: superPassword, role: 'super_admin', isActive: true },
  });

  const techAdmin = await prisma.user.upsert({
    where: { email: 'tech_admin_1' },
    update: { passwordHash: superPassword },
    create: { email: 'tech_admin_1', fullName: 'Technical Admin', passwordHash: superPassword, role: 'tech_admin', createdBy: superAdmin.id, isActive: true },
  });

  const cAdmins = [];
  for (let i = 0; i < centers.length; i++) {
    const ca = await prisma.user.upsert({
      where: { email: `center_admin_${i + 1}` },
      update: { passwordHash: staffPassword },
      create: { email: `center_admin_${i + 1}`, fullName: `Center Admin ${i + 1}`, passwordHash: staffPassword, role: 'center_admin', createdBy: superAdmin.id, isActive: true },
    });
    cAdmins.push(ca);
    await prisma.userCenterAssignment.upsert({
      where: { userId_centerId: { userId: ca.id, centerId: centers[i].id } },
      update: {}, create: { userId: ca.id, centerId: centers[i].id, createdBy: superAdmin.id }
    });
  }

  const teachers = [];
  for (let i = 0; i < 10; i++) {
    const center = centers[i % centers.length];
    const t = await prisma.user.upsert({
      where: { email: `teacher_${i + 1}` },
      update: { passwordHash: staffPassword },
      create: { email: `teacher_${i + 1}`, fullName: `Teacher ${i + 1}`, passwordHash: staffPassword, role: 'teacher', createdBy: cAdmins[i % cAdmins.length].id, isActive: true },
    });
    teachers.push(t);
    await prisma.userCenterAssignment.upsert({
      where: { userId_centerId: { userId: t.id, centerId: center.id } },
      update: {}, create: { userId: t.id, centerId: center.id, createdBy: superAdmin.id }
    });
  }

  // 6. Students (Use findFirst to avoid duplicates if re-running)
  console.log("Checking Students...");
  const existingStudents = await prisma.student.count();
  if (existingStudents < 100) {
    console.log("Creating Students...");
    for (let i = 0; i < 100; i++) {
      const center = centers[i % centers.length];
      const program = i % 2 === 0 ? pSwayam : pShiksha;
      await prisma.student.create({
        data: {
          fullName: `Student ${i + 1}`,
          centerId: center.id,
          programId: program.id,
          academicYearId: ay2025.id,
          dob: new Date(2005 + (i % 10), i % 12, (i % 28) + 1),
          gender: i % 3 === 0 ? "female" : "male",
          guardianName: `Guardian ${i + 1}`,
          guardianPhone: `9100000${i.toString().padStart(3, '0')}`,
          isActive: true,
        }
      });
    }
  }
  const students = await prisma.student.findMany();

  // 7. Attendance
  const existingSessions = await prisma.attendanceSession.count();
  if (existingSessions === 0) {
    console.log("Creating Attendance sessions...");
    for (let d = 7; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      for (const center of centers) {
        for (const program of [pSwayam, pShiksha]) {
          const session = await prisma.attendanceSession.create({
            data: { centerId: center.id, programId: program.id, sessionDate: date, createdBy: teachers[0].id, academicYearId: ay2025.id }
          });
          const centerStudents = students.filter(s => s.centerId === center.id && s.programId === program.id);
          const records = centerStudents.map(s => ({
            sessionId: session.id, studentId: s.id, centerId: center.id, status: Math.random() > 0.1 ? "present" : "absent" as any
          }));
          await prisma.attendanceRecord.createMany({ data: records });
        }
      }
    }
  }

  // 8. Exams
  const existingExams = await prisma.exam.count();
  if (existingExams === 0) {
    console.log("Creating Exams...");
    for (const center of centers) {
      for (const type of ["baseline", "endline"]) {
        const exam = await prisma.exam.create({
          data: {
            name: `${type.toUpperCase()} 2025 - ${center.name}`,
            examType: type as any,
            centerId: center.id,
            programId: pSwayam.id,
            academicYearId: ay2025.id,
            createdBy: teachers[0].id
          }
        });
        const centerSwayamStudents = students.filter(s => s.centerId === center.id && s.programId === pSwayam.id);
        const scores = [];
        for (const s of centerSwayamStudents) {
          for (const sub of subMap.SWAYAM.slice(0, 3)) {
            scores.push({ examId: exam.id, studentId: s.id, centerId: center.id, subjectId: sub.id, marks: type === "baseline" ? 30 + Math.random() * 30 : 50 + Math.random() * 40, enteredBy: teachers[0].id });
          }
        }
        await prisma.examScore.createMany({ data: scores });
      }
    }
  }

  // 9. Skill Definitions
  console.log("Upserting Skill Definitions...");
  const skillNames = ["Communication", "Critical Thinking", "Collaboration", "Creativity", "Self-Management"];
  for (const program of [pSwayam, pShiksha]) {
    for (const name of skillNames) {
      await prisma.skillDefinition.upsert({
        where: { programId_name: { programId: program.id, name } },
        update: {}, create: { programId: program.id, name, description: `Proficiency in ${name}` }
      });
    }
  }

  // 10. Form Templates
  const existingTemplates = await prisma.formTemplate.count();
  if (existingTemplates === 0) {
    console.log("Creating Form Templates...");
    const templates = [
      { name: "Career Interest Survey", type: "career", entity: "student" },
      { name: "Family Background", type: "enrollment", entity: "student" },
      { name: "Health Assessment", type: "health", entity: "student" },
      { name: "Quarterly Feedback", type: "feedback", entity: "student" },
      { name: "Center Safety Audit", type: "audit", entity: "center" },
    ];
    for (const t of templates) {
      await prisma.formTemplate.create({
        data: { name: t.name, formType: t.type, targetEntity: t.entity as any, createdBy: superAdmin.id, schema: { fields: [] }, isActive: true }
      });
    }
  }

  console.log("Extensive Seeding complete.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());