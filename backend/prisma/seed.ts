import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting TOTAL DB REBUILD & EXTENSIVE SEEDING...");
  // 0. Cleanup existing dynamic data to prevent duplication on multiple runs
  console.log("🧹 Cleaning up old records...");
  await prisma.message.deleteMany();
  await prisma.threadParticipant.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.formAssignment.deleteMany();
  await prisma.formTemplate.deleteMany();
  await prisma.equipmentLog.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.studentSkillLog.deleteMany();
  await prisma.skillDefinition.deleteMany();
  await prisma.examScore.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.userActivityAssignment.deleteMany();
  await prisma.activity.deleteMany();
  // Note: We don't delete Students, Users, Centers, or Academic Years as they use upsert
  console.log("📅 Seeding Academic Years...");
  const ay2024 = await prisma.academicYear.upsert({
    where: { label: "2024-25" },
    update: {},
    create: { label: "2024-25", startDate: new Date(2024, 5, 1), endDate: new Date(2025, 4, 31), isCurrent: false }
  });
  const ay2025 = await prisma.academicYear.upsert({
    where: { label: "2025-26" },
    update: { isCurrent: false },
    create: { label: "2025-26", startDate: new Date(2025, 5, 1), endDate: new Date(2026, 4, 31), isCurrent: false }
  });
  const ay2026 = await prisma.academicYear.upsert({
    where: { label: "2026-27" },
    update: { isCurrent: true },
    create: { label: "2026-27", startDate: new Date(2026, 5, 1), endDate: new Date(2027, 4, 31), isCurrent: true }
  });
  
  // Use ay2026 for the rest of the seeding
  const currentAY = ay2026;

  // 2. Programs & Subjects
  console.log("🎓 Seeding Programs & Subjects...");
  const programData = [
    { code: "SWAYAM", name: "Swayam Youth Development", ageMin: 15, ageMax: 18 },
    { code: "SHIKSHA", name: "Shiksha Early Learning", ageMin: 3, ageMax: 6 },
    { code: "KUSUM", name: "Kusum Women Empowerment", ageMin: 18, ageMax: 45 },
    { code: "UDAY", name: "Uday Vocational Training", ageMin: 18, ageMax: 30 },
  ];
  const pMap: any = {};
  for (const p of programData) {
    pMap[p.code] = await prisma.program.upsert({
      where: { code: p.code },
      update: { isActive: true },
      create: { ...p, isActive: true },
    });
    const subjects = ["English", "Mathematics", "Science", "Digital Literacy", "Social Skills"];
    for (const sName of subjects) {
      await prisma.programSubject.upsert({
        where: { programId_name: { programId: pMap[p.code].id, name: sName } },
        update: {}, create: { programId: pMap[p.code].id, name: sName, maxMarks: 100 }
      });
    }
  }

  // 3. Centers
  console.log("🏢 Seeding 5 Centers...");
  const centerData = [
    { name: "Andheri Center", location: "Andheri West, Mumbai" },
    { name: "Dharavi Center", location: "Dharavi Main, Mumbai" },
    { name: "Govandi Center", location: "Govandi East, Mumbai" },
    { name: "Kurla Center", location: "Kurla West, Mumbai" },
    { name: "Malad Center", location: "Malad East, Mumbai" },
  ];
  const centers = [];
  for (const c of centerData) {
    let center = await prisma.center.findFirst({ where: { name: c.name } });
    if (center) {
      center = await prisma.center.update({ where: { id: center.id }, data: { location: c.location } });
    } else {
      center = await prisma.center.create({ data: { name: c.name, location: c.location, isActive: true } });
    }
    centers.push(center);
    await prisma.centerProgram.upsert({
      where: { centerId_programId: { centerId: center.id, programId: pMap.SWAYAM.id } },
      update: {}, create: { centerId: center.id, programId: pMap.SWAYAM.id }
    });
    await prisma.centerProgram.upsert({
      where: { centerId_programId: { centerId: center.id, programId: pMap.SHIKSHA.id } },
      update: {}, create: { centerId: center.id, programId: pMap.SHIKSHA.id }
    });
  }

  // 4. Users
  console.log("👤 Seeding User Hierarchy...");
  const superPassword = await bcrypt.hash("SuperAdmin@123", 10);
  const staffPassword = await bcrypt.hash("Staff@123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super_admin@sparsha.org' },
    update: { passwordHash: superPassword },
    create: { email: 'super_admin@sparsha.org', fullName: 'System Super Admin', passwordHash: superPassword, role: 'super_admin', isActive: true },
  });

  const techAdmin = await prisma.user.upsert({
    where: { email: 'tech_admin@sparsha.org' },
    update: { passwordHash: superPassword },
    create: { email: 'tech_admin@sparsha.org', fullName: 'Technical Support Admin', passwordHash: superPassword, role: 'tech_admin', createdBy: superAdmin.id, isActive: true },
  });

  const cAdmins = [];
  const teachers = [];
  for (let i = 0; i < centers.length; i++) {
    const ca = await prisma.user.upsert({
      where: { email: `center_admin_${i + 1}@sparsha.org` },
      update: { passwordHash: staffPassword },
      create: { email: `center_admin_${i + 1}@sparsha.org`, fullName: `Admin - ${centers[i].name}`, passwordHash: staffPassword, role: 'center_admin', createdBy: superAdmin.id, isActive: true },
    });
    cAdmins.push(ca);
    await prisma.userCenterAssignment.upsert({
      where: { userId_centerId: { userId: ca.id, centerId: centers[i].id } },
      update: {}, create: { userId: ca.id, centerId: centers[i].id, createdBy: superAdmin.id }
    });

    for (let j = 0; j < 2; j++) {
      const t = await prisma.user.upsert({
        where: { email: `teacher_${i * 2 + j + 1}@sparsha.org` },
        update: { passwordHash: staffPassword },
        create: { email: `teacher_${i * 2 + j + 1}@sparsha.org`, fullName: `Teacher ${j + 1} - ${centers[i].name}`, passwordHash: staffPassword, role: 'teacher', createdBy: ca.id, isActive: true },
      });
      teachers.push(t);
      await prisma.userCenterAssignment.upsert({
        where: { userId_centerId: { userId: t.id, centerId: centers[i].id } },
        update: {}, create: { userId: t.id, centerId: centers[i].id, createdBy: ca.id }
      });
    }
  }

  // 5. Students
  console.log("🧑‍🎓 Seeding 100 Students...");
  const students = [];
  for (let i = 0; i < 100; i++) {
    const center = centers[i % centers.length];
    const program = i % 2 === 0 ? pMap.SWAYAM : pMap.SHIKSHA;
    const s = await prisma.student.create({
      data: {
        fullName: `Student ${i + 1}`,
        centerId: center.id,
        programId: program.id,
        academicYearId: currentAY.id,
        dob: new Date(2005 + (i % 12), i % 12, (i % 28) + 1),
        gender: i % 2 === 0 ? "male" : "female",
        guardianName: `Parent of ${i + 1}`,
        guardianPhone: `98765432${i.toString().padStart(2, '0')}`,
        isActive: true,
      }
    });
    students.push(s);
  }

  // 6. Activities
  console.log("🏀 Seeding Activities...");
  for (const center of centers) {
    await prisma.activity.create({
      data: {
        name: `Summer Camp - ${center.name}`,
        description: "Annual summer workshop for youth.",
        centerId: center.id,
        programId: pMap.SWAYAM.id,
        activityType: "general",
        startDate: new Date(2025, 4, 1),
        endDate: new Date(2025, 4, 15),
        createdBy: superAdmin.id,
        status: "planned",
      }
    });
  }

  // 7. Attendance
  console.log("📅 Seeding 14 days of Attendance...");
  for (let d = 14; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(9, 0, 0, 0);

    for (const center of centers) {
      for (const p of [pMap.SWAYAM, pMap.SHIKSHA]) {
        const session = await prisma.attendanceSession.create({
          data: { centerId: center.id, programId: p.id, sessionDate: date, createdBy: teachers[0].id, academicYearId: currentAY.id }
        });
        const centerStudents = students.filter(s => s.centerId === center.id && s.programId === p.id);
        const records = centerStudents.map(s => ({
          sessionId: session.id, studentId: s.id, centerId: center.id, status: Math.random() > 0.15 ? "present" : "absent" as any
        }));
        await prisma.attendanceRecord.createMany({ data: records });
      }
    }
  }

  // 8. Exams
  console.log("📝 Seeding Baseline & Endline Exams...");
  for (const center of centers) {
    const swayamSubs = await prisma.programSubject.findMany({ where: { programId: pMap.SWAYAM.id } });
    // Filter to only the 3 subjects expected by the frontend for now
    const targetSubs = swayamSubs.filter(s => ["English", "Science", "Mathematics"].includes(s.name));
    
    for (const type of ["baseline", "endline"]) {
      const exam = await prisma.exam.create({
        data: {
          name: `${type.toUpperCase()} Exam 2025 - ${center.name}`,
          examType: type as any,
          centerId: center.id,
          programId: pMap.SWAYAM.id,
          academicYearId: currentAY.id,
          createdBy: teachers[0].id,
          examDate: datePlusDays(currentAY.startDate, type === "baseline" ? 30 : 200)
        }
      });
      const centerSwayamStudents = students.filter(s => s.centerId === center.id && s.programId === pMap.SWAYAM.id);
      const scores = [];
      for (const s of centerSwayamStudents) {
        for (const sub of targetSubs) {
          scores.push({
            examId: exam.id, studentId: s.id, centerId: center.id, subjectId: sub.id,
            marks: type === "baseline" ? 15 + Math.random() * 20 : 25 + Math.random() * 24,
            enteredBy: teachers[0].id
          });
        }
      }
      await prisma.examScore.createMany({ data: scores });
    }
  }

  // 9. Skills
  console.log("🛠️ Seeding Skill Assessments...");
  const skillSets = ["Public Speaking", "Critical Thinking", "Team Collaboration", "Digital Literacy", "Emotional Resilience"];
  for (const name of skillSets) {
    const sd = await prisma.skillDefinition.create({
      data: { programId: pMap.SWAYAM.id, name, description: `Mastery of ${name}`, maxLevel: 5 }
    });
    for (const s of students.slice(0, 40)) {
      await prisma.studentSkillLog.create({
        data: {
          studentId: s.id, centerId: s.centerId, skillId: sd.id,
          level: Math.floor(Math.random() * 5) + 1,
          assessedBy: teachers[0].id, assessedOn: new Date(), remarks: "Active participation."
        }
      });
    }
  }

  // 10. Equipment
  console.log("📦 Seeding Center Equipment...");
  const equipmentItems = ["Laptop", "Projector", "Science Kit", "Whiteboard", "First Aid Kit"];
  for (const center of centers) {
    for (const name of equipmentItems) {
      await prisma.equipment.create({
        data: {
          centerId: center.id, name, category: "Resource", quantity: 5, condition: "good",
          isActive: true, createdBy: superAdmin.id
        }
      });
    }
  }

  // 11. Forms
  console.log("📋 Seeding Form Templates...");
  const templates = ["Career Goal Tracking", "Maintenance Audit", "Parent Feedback", "Health Check", "Performance Review"];
  for (const name of templates) {
    const template = await prisma.formTemplate.create({
      data: { name, formType: "system", targetEntity: "student", createdBy: superAdmin.id, isActive: true, schema: { fields: [] } }
    });
    for (const s of students.slice(0, 10)) {
      await prisma.formSubmission.create({
        data: {
          templateId: template.id, studentId: s.id, centerId: s.centerId, submittedBy: teachers[0].id,
          data: { status: "complete" }
        }
      });
    }
  }

  // 12. Messaging
  console.log("📢 Seeding Communications...");
  await prisma.announcement.createMany({
    data: [
      { title: "Annual Day 2025", body: "Cultural event preparation.", isPinned: true, createdBy: superAdmin.id, targetRoles: ["teacher", "super_admin"] },
      { title: "Exam Schedule", body: "Check the notice board.", isPinned: false, createdBy: superAdmin.id, targetRoles: ["all", "super_admin"] }
    ]
  });

  const thread = await prisma.messageThread.create({
    data: {
      subject: "IT Support", centerId: centers[0].id, createdBy: teachers[0].id,
      participants: { create: [{ userId: teachers[0].id }, { userId: techAdmin.id }, { userId: superAdmin.id }] }
    }
  });
  await prisma.message.create({
    data: { threadId: thread.id, senderId: teachers[0].id, body: "Need help with laptop setup." }
  });

  console.log("✅ TOTAL REBUILD COMPLETE.");
}

function datePlusDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());