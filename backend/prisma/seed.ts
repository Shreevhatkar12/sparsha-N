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

  await assignUserCenter(admin.id, andheriCenter.id);
  await assignUserCenter(admin.id, dharaviCenter.id);
  await assignUserCenter(teacher1.id, andheriCenter.id);
  await assignUserCenter(teacher2.id, dharaviCenter.id);
  await assignUserCenter(staff1.id, andheriCenter.id);

  // 6. Students
  console.log("Creating 60 Students...");
  const baseNames = [
    "Aarav", "Diya", "Vihaan", "Ananya", "Kabir", "Isha", "Vivaan", "Neha", "Arjun", "Riya",
    "Ayaan", "Sara", "Krishna", "Pooja", "Rohan", "Anjali", "Aditya", "Kriti", "Aryan", "Sneha"
  ];
  const surnames = ["Patel", "Sharma", "Kumar", "Singh", "Das", "Gupta", "Joshi", "Verma", "Yadav", "Menon"];
  const studentsDetails = [];
  
  for (let i = 0; i < 60; i++) {
    const fullName = `${baseNames[i % baseNames.length]} ${surnames[i % surnames.length]} ${i}`;
    const center = i < 30 ? andheriCenter : dharaviCenter;
    const gType = Math.random() > 0.5 ? "male" : "female";
    const year = 2006 + Math.floor(Math.random() * 4);
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    const dob = new Date(year, month, day);

    let existing = await prisma.student.findFirst({
      where: { fullName, centerId: center.id },
    });

    if (!existing) {
      existing = await prisma.student.create({
        data: {
          fullName,
          centerId: center.id,
          programId: pSwayam.id,
          dob,
          gender: gType as any,
          guardianName: `${fullName.split(" ")[0]}'s Parent`,
          guardianPhone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
      });
    }
    studentsDetails.push(existing);
  }

  // 7. Attendance Sessions (4 Weeks)
  console.log("Creating 4 Weeks of Attendance Sessions...");
  async function createAttendanceForCenter(centerId: string, students: any[]) {
    // Generate 20 days (4 weeks * 5 days)
    for (let dayOffset = 28; dayOffset > 0; dayOffset--) {
      // Skip weekends implicitly by just acting like it's a weekday for simplicity
      if (dayOffset % 7 === 0 || dayOffset % 7 === 1) continue; 
      
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - dayOffset);
      
      let session = await prisma.attendanceSession.findFirst({
        where: { centerId, programId: pSwayam.id, sessionDate: sessionDate },
      });

      if (!session) {
        session = await prisma.attendanceSession.create({
          data: {
            centerId,
            programId: pSwayam.id,
            sessionDate,
            createdBy: admin.id,
          },
        });
      }
      
      const recordsCount = await prisma.attendanceRecord.count({ where: { sessionId: session.id } });
      if (recordsCount === 0) {
        const data = students.map((s) => {
          let status = "present";
          const roll = Math.random();
          if (roll > 0.85) status = "absent";
          else if (roll > 0.75) status = "late";
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
  }

  await createAttendanceForCenter(andheriCenter.id, studentsDetails.slice(0, 30));
  await createAttendanceForCenter(dharaviCenter.id, studentsDetails.slice(30, 60));

  // 8. Exams (Baseline and Endline)
  console.log("Creating Baseline and Endline Exams...");
  async function createExamsForCenter(centerId: string, students: any[]) {
    const subjects = ["english", "maths", "science"];
    
    // Baseline
    let baselineExam = await prisma.exam.findFirst({
      where: { centerId, programId: pSwayam.id, examType: "baseline", academicYear: "2024-25" },
    });
    if (!baselineExam) {
      baselineExam = await prisma.exam.create({
        data: { centerId, programId: pSwayam.id, examType: "baseline", academicYear: "2024-25", createdBy: admin.id },
      });
    }

    const baselineCount = await prisma.examScore.count({ where: { examId: baselineExam.id }});
    if (baselineCount === 0) {
      const bData: any[] = [];
      students.forEach(s => {
        subjects.forEach(sub => {
          bData.push({
            examId: baselineExam!.id, studentId: s.id, centerId, subject: sub,
            marks: 15 + Math.random() * 15, maxMarks: 50 // 30-60%
          });
        });
      });
      await prisma.examScore.createMany({ data: bData });
    }

    // Endline
    let endlineExam = await prisma.exam.findFirst({
      where: { centerId, programId: pSwayam.id, examType: "endline", academicYear: "2024-25" },
    });
    if (!endlineExam) {
      endlineExam = await prisma.exam.create({
        data: { centerId, programId: pSwayam.id, examType: "endline", academicYear: "2024-25", createdBy: admin.id },
      });
    }

    const endlineCount = await prisma.examScore.count({ where: { examId: endlineExam.id }});
    if (endlineCount === 0) {
      const eData: any[] = [];
      students.forEach(s => {
        subjects.forEach(sub => {
          eData.push({
            examId: endlineExam!.id, studentId: s.id, centerId, subject: sub,
            marks: 35 + Math.random() * 15, maxMarks: 50 // 70-100%
          });
        });
      });
      await prisma.examScore.createMany({ data: eData });
    }
  }

  await createExamsForCenter(andheriCenter.id, studentsDetails.slice(0, 30));
  await createExamsForCenter(dharaviCenter.id, studentsDetails.slice(30, 60));

  // 9. Form Template + Submissions
  console.log("Upserting Form Templates & Fake Submissions...");
  
  let smFormTpl = await prisma.formTemplate.findFirst({ where: { formType: "student_meeting" } });
  if (!smFormTpl) {
    smFormTpl = await prisma.formTemplate.create({
      data: {
        formType: "student_meeting", name: "Student Meeting Form", isActive: true,
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
          formType, name, isActive: true,
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

  // Create some submissions for the first 5 students
  for (let i = 0; i < 5; i++) {
    const stud = studentsDetails[i];
    const exists = await prisma.formSubmission.count({ where: { studentId: stud.id } });
    if (exists === 0) {
      await prisma.formSubmission.create({
        data: {
          templateId: smFormTpl.id,
          studentId: stud.id,
          centerId: stud.centerId,
          submittedBy: admin.id,
          data: {
            meetingDate: new Date().toISOString().split('T')[0],
            agenda: "Regular monthly review to discuss academic progress and Swayam activities.",
            outcome: "Student is actively participating but needs more help in English.",
            followUp: true
          }
        }
      });
    }
  }

  // Summary
  const tCenters = await prisma.center.count();
  const tPrograms = await prisma.program.count();
  const tUsers = await prisma.user.count();
  const tStudents = await prisma.student.count();
  const tAttendance = await prisma.attendanceRecord.count();
  const tScores = await prisma.examScore.count();
  const tForms = await prisma.formSubmission.count();

  console.log("\n--- SEEDING COMPLETE ---");
  console.log(`Summary: ${tCenters} centers, ${tPrograms} programs, ${tUsers} users`);
  console.log(`Payload: ${tStudents} students, ${tAttendance} attendances, ${tScores} exam scores, ${tForms} form submissions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
