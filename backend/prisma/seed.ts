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

  const centerAdmin = await prisma.user.upsert({
    where: { email: 'center_admin_1' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'center_admin_1',
      fullName: 'Vansh - Center Head',
      passwordHash: defaultPassword,
      role: 'center_admin',
      createdBy: superAdmin.id,
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
      createdBy: centerAdmin.id,
    },
  });

  // 5. UserCenterAssignments
  console.log("Assigning Users to Centers...");
  async function assignUserCenter(userId: string, centerId: string) {
    await prisma.userCenterAssignment.upsert({
      where: { userId_centerId: { userId, centerId } },
      update: {},
      create: { userId, centerId, createdBy: superAdmin.id },
    });
  }

  await assignUserCenter(superAdmin.id, andheriCenter.id);
  await assignUserCenter(centerAdmin.id, andheriCenter.id);
  await assignUserCenter(teacher1.id, andheriCenter.id);

  // 6. Students
  console.log("Creating 60 Students...");
  const baseNames = ["Aarav", "Diya", "Vihaan", "Ananya", "Kabir", "Isha", "Vivaan", "Neha", "Arjun", "Riya"];
  const surnames = ["Patel", "Sharma", "Kumar", "Singh", "Das", "Gupta", "Joshi", "Verma"];
  const studentsDetails = [];
  
  for (let i = 0; i < 60; i++) {
    const fullName = `${baseNames[i % baseNames.length]} ${surnames[i % surnames.length]} ${i}`;
    const center = i < 30 ? andheriCenter : dharaviCenter;
    const dob = new Date(2008, i % 12, (i % 28) + 1);

    const student = await prisma.student.create({
      data: {
        fullName,
        centerId: center.id,
        programId: pSwayam.id,
        dob,
        gender: i % 2 === 0 ? "male" : "female",
        guardianName: `${fullName.split(" ")[0]}'s Parent`,
        guardianPhone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
    });
    studentsDetails.push(student);
  }

  // 7. Attendance Sessions
  console.log("Creating Attendance Sessions...");
  for (let dayOffset = 5; dayOffset > 0; dayOffset--) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - dayOffset);
    
    const session = await prisma.attendanceSession.create({
      data: {
        centerId: andheriCenter.id,
        programId: pSwayam.id,
        sessionDate,
        createdBy: centerAdmin.id,
      },
    });

    const records = studentsDetails.slice(0, 10).map((s) => ({
      sessionId: session.id,
      studentId: s.id,
      centerId: andheriCenter.id,
      status: Math.random() > 0.1 ? "present" : "absent" as any,
    }));
    await prisma.attendanceRecord.createMany({ data: records });
  }

  // 8. Form Templates
  console.log("Upserting Form Templates...");
  let smFormTpl = await prisma.formTemplate.findFirst({ where: { formType: "student_meeting" } });
  if (!smFormTpl) {
    smFormTpl = await prisma.formTemplate.create({
      data: {
        formType: "student_meeting",
        name: "Student Meeting Form",
        isActive: true,
        targetEntity: "student",
        createdBy: superAdmin.id,
        schema: {
          fields: [
            { name: 'meetingDate', label: 'Meeting Date', type: 'date', required: true },
            { name: 'agenda', label: 'Agenda', type: 'textarea', required: true }
          ]
        }
      }
    });
  }

  // 9. Form Submissions
  console.log("Creating Form Submissions...");
  for (let i = 0; i < 5; i++) {
    const stud = studentsDetails[i];
    await prisma.formSubmission.create({
      data: {
        templateId: smFormTpl.id,
        studentId: stud.id,
        centerId: stud.centerId,
        submittedBy: centerAdmin.id,
        data: {
          meetingDate: new Date().toISOString().split('T')[0],
          agenda: "Monthly academic review.",
          outcome: "Progressing well.",
          followUp: false
        }
      }
    });
  }

  // 10. Skills
  console.log("Upserting Skills...");
  const skillNames = ["Communication", "Leadership", "Teamwork", "Problem Solving", "Computer Literacy"];
  const skillDefs = [];
  for (const name of skillNames) {
    const s = await prisma.skillDefinition.upsert({
      where: { programId_name: { programId: pSwayam.id, name } },
      update: {},
      create: { programId: pSwayam.id, name, description: `Proficiency in ${name}` }
    });
    skillDefs.push(s);
  }

  for (let i = 0; i < 10; i++) {
    const stud = studentsDetails[i];
    for (const skill of skillDefs) {
      if (Math.random() > 0.5) {
        await prisma.studentSkillLog.create({
          data: {
            studentId: stud.id,
            centerId: stud.centerId,
            skillId: skill.id,
            level: Math.floor(Math.random() * 5) + 1,
            assessedBy: centerAdmin.id,
            remarks: "Initial assessment"
          }
        });
      }
    }
  }

  // 11. Career Template
  let careerTpl = await prisma.formTemplate.findFirst({ where: { name: "Career Tracking" } });
  if (!careerTpl) {
    careerTpl = await prisma.formTemplate.create({
      data: {
        name: "Career Tracking",
        formType: "system",
        targetEntity: "student",
        createdBy: superAdmin.id,
        schema: { fields: [] }
      }
    });
  }

  // 12. Final Summary
  const tCenters = await prisma.center.count();
  const tPrograms = await prisma.program.count();
  const tUsers = await prisma.user.count();
  const tStudents = await prisma.student.count();
  const tAttendance = await prisma.attendanceRecord.count();
  const tForms = await prisma.formSubmission.count();
  const tSkillLogs = await prisma.studentSkillLog.count();

  console.log("\n--- SEEDING COMPLETE ---");
  console.log(`Summary: ${tCenters} centers, ${tPrograms} programs, ${tUsers} users`);
  console.log(`Payload: ${tStudents} students, ${tAttendance} attendances, ${tForms} form submissions, ${tSkillLogs} skill logs.`);
  console.log(`Login: super_admin_1 / SuperAdmin@123`);
  console.log(`Login: center_admin_1 / SuperAdmin@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });