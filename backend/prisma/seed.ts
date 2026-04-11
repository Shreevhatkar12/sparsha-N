import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
import bcrypt from "bcryptjs";

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
      isActive: false,
    },
  });

  const pSanskar = await prisma.program.upsert({
    where: { code: "SANSKAR" },
    update: {},
    create: {
      code: "SANSKAR",
      name: "Sanskar Life Skills Program",
      ageMin: 7,
      ageMax: 14,
      isActive: false,
    },
  });

  // 2. Centers
  console.log("Upserting Centers...");
  // Since centers usually don't have a unique string field other than ID in the schema (name is not marked @unique),
  // we will check by name manually or use findFirst.
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
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const teacherHash = await bcrypt.hash("Teacher@123", 10);
  const staffHash = await bcrypt.hash("Staff@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sparsha.org" },
    update: { passwordHash: adminHash },
    create: {
      email: "admin@sparsha.org",
      passwordHash: adminHash,
      fullName: "Admin User",
      role: "admin",
    },
  });

  const teacher1 = await prisma.user.upsert({
    where: { email: "teacher1@sparsha.org" },
    update: { passwordHash: teacherHash },
    create: {
      email: "teacher1@sparsha.org",
      passwordHash: teacherHash,
      fullName: "Teacher One",
      role: "teacher",
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: "teacher2@sparsha.org" },
    update: { passwordHash: teacherHash },
    create: {
      email: "teacher2@sparsha.org",
      passwordHash: teacherHash,
      fullName: "Teacher Two",
      role: "teacher",
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@sparsha.org" },
    update: { passwordHash: staffHash },
    create: {
      email: "staff1@sparsha.org",
      passwordHash: staffHash,
      fullName: "Staff One",
      role: "staff",
    },
  });

  // 5. UserCenterAssignments
  console.log("Assigning Users to Centers...");
  async function assignUserCenter(userId: string, centerId: string) {
    await prisma.userCenterAssignment.upsert({
      where: { userId_centerId: { userId, centerId } },
      update: {},
      create: { userId, centerId },
    });
  }

  await assignUserCenter(teacher1.id, andheriCenter.id);
  await assignUserCenter(teacher2.id, dharaviCenter.id);
  await assignUserCenter(staff1.id, andheriCenter.id);

  // 6. Students
  console.log("Creating Students...");
  const indianNames = [
    "Aarav Patel",
    "Diya Sharma",
    "Vihaan Kumar",
    "Ananya Singh",
    "Kabir Das",
    "Isha Gupta",
    "Vivaan Joshi",
    "Neha Verma",
    "Arjun Yadav",
    "Riya Menon",
    "Ayaan Reddy",
    "Sara Nair",
    "Krishna Iyer",
    "Pooja Pillai",
    "Rohan Bhat",
    "Anjali Shah",
    "Aditya Chokshi",
    "Kriti Deshmukh",
    "Aryan Kulkarni",
    "Sneha Patil",
  ];

  const studentsDetails = [];
  for (let i = 0; i < indianNames.length; i++) {
    const center = i < 10 ? andheriCenter : dharaviCenter;
    const gType = Math.random() > 0.5 ? "male" : "female";
    // Age 15-18 between 2006 and 2009
    const year = 2006 + Math.floor(Math.random() * 4);
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    const dob = new Date(year, month, day);

    // Guard up against duplicate runs
    let existing = await prisma.student.findFirst({
      where: { fullName: indianNames[i], centerId: center.id },
    });

    if (!existing) {
      existing = await prisma.student.create({
        data: {
          fullName: indianNames[i],
          centerId: center.id,
          programId: pSwayam.id,
          dob,
          gender: gType as any,
          guardianName: `${indianNames[i].split(" ")[0]}'s Parent`,
          guardianPhone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
      });
    }
    studentsDetails.push(existing);
  }

  // 7. Attendance Sessions
  console.log("Creating Attendance Sessions...");
  async function createAttendanceForCenter(centerId: string, students: any[]) {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Convert to simple date string to check existence if needed, or just find by center/program/date
    let session = await prisma.attendanceSession.findFirst({
      where: { centerId, programId: pSwayam.id, sessionDate: lastWeek },
    });

    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          centerId,
          programId: pSwayam.id,
          sessionDate: lastWeek,
          createdBy: admin.id,
        },
      });
    }
    
    // Check if records exist
    const recordsCount = await prisma.attendanceRecord.count({
      where: { sessionId: session.id }
    });
    
    if (recordsCount === 0) {
      // 8 present, 1 absent, 1 late (assuming exactly 10 students passed)
      const data = students.map((s, idx) => {
        let status = "present";
        if (idx === 8) status = "absent";
        else if (idx === 9) status = "late";
        return {
          sessionId: session!.id,
          studentId: s.id,
          centerId,
          status: status as any,
        };
      });

      await prisma.attendanceRecord.createMany({ data });
    }
  }

  await createAttendanceForCenter(andheriCenter.id, studentsDetails.slice(0, 10));
  await createAttendanceForCenter(dharaviCenter.id, studentsDetails.slice(10, 20));

  // 8. Exam (Baseline)
  console.log("Creating Baseline Exams...");
  async function createExamsForCenter(centerId: string, students: any[]) {
    let exam = await prisma.exam.findFirst({
      where: { centerId, programId: pSwayam.id, examType: "baseline", academicYear: "2024-25" },
    });

    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          centerId,
          programId: pSwayam.id,
          examType: "baseline",
          academicYear: "2024-25",
          createdBy: admin.id,
        },
      });
    }

    const scoresCount = await prisma.examScore.count({ where: { examId: exam.id }});
    if (scoresCount === 0) {
      const data: any[] = [];
      const subjects = ["english", "maths", "science"];
      
      students.forEach(s => {
        subjects.forEach(sub => {
          data.push({
            examId: exam!.id,
            studentId: s.id,
            centerId,
            subject: sub,
            marks: 20 + Math.random() * 20, // 20 to 40
            maxMarks: 50
          });
        });
      });

      await prisma.examScore.createMany({ data });
    }
  }

  await createExamsForCenter(andheriCenter.id, studentsDetails.slice(0, 10));
  await createExamsForCenter(dharaviCenter.id, studentsDetails.slice(10, 20));

  // 9. Form Template
  console.log("Upserting Form Template...");
  let formTpl = await prisma.formTemplate.findFirst({
    where: { formType: "student_meeting" }
  });

  if (!formTpl) {
    await prisma.formTemplate.create({
      data: {
        formType: "student_meeting",
        name: "Student Meeting Form",
        isActive: true,
        schema: {
          fields: [
             { name: 'meetingDate', label: 'Meeting Date', type: 'date', required: true },
             { name: 'agenda', label: 'Agenda', type: 'textarea', required: true },
             { name: 'outcome', label: 'Outcome', type: 'textarea', required: false },
             { name: 'followUp', label: 'Follow-up Required?', type: 'boolean', required: false }
          ]
        }
      }
    });
  }

  const extraForms: Array<[string, string]> = [
    ["parent_meeting", "Parent Meeting Form"],
    ["activity_form", "Activity Form"],
  ];
  for (const [formType, name] of extraForms) {
    const existing = await prisma.formTemplate.findFirst({ where: { formType } });
    if (!existing) {
      await prisma.formTemplate.create({
        data: {
          formType,
          name,
          isActive: true,
          schema: {
            fields: [
              { name: "title", label: "Title", type: "text", required: true },
              { name: "details", label: "Details", type: "textarea", required: true },
              { name: "date", label: "Date", type: "date", required: false },
            ],
          },
        },
      });
    }
  }

  // Summary
  const tCenters = await prisma.center.count();
  const tPrograms = await prisma.program.count();
  const tUsers = await prisma.user.count();
  const tStudents = await prisma.student.count();

  console.log("\n--- SEEDING COMPLETE ---");
  console.log(`Summary: ${tCenters} centers, ${tPrograms} programs, ${tUsers} users, ${tStudents} students in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
