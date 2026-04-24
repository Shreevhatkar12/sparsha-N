// import "dotenv/config";
// import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { Pool } from "pg";
// import bcrypt from "bcryptjs";

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaPg(pool);
// const prisma = new PrismaClient({ adapter });

// async function main() {
//   console.log("Starting DB seeding...");

//   // 1. Programs
//   console.log("Upserting Programs...");
//   const pSwayam = await prisma.program.upsert({
//     where: { code: "SWAYAM" },
//     update: {},
//     create: {
//       code: "SWAYAM",
//       name: "Swayam Youth Development Program",
//       ageMin: 15,
//       ageMax: 18,
//       isActive: true,
//     },
//   });

//   const pShiksha = await prisma.program.upsert({
//     where: { code: "SHIKSHA" },
//     update: {},
//     create: {
//       code: "SHIKSHA",
//       name: "Shiksha Early Learning Program",
//       ageMin: 3,
//       ageMax: 6,
//       isActive: false,
//     },
//   });

//   const pSanskar = await prisma.program.upsert({
//     where: { code: "SANSKAR" },
//     update: {},
//     create: {
//       code: "SANSKAR",
//       name: "Sanskar Life Skills Program",
//       ageMin: 7,
//       ageMax: 14,
//       isActive: false,
//     },
//   });

//   // 2. Centers
//   console.log("Upserting Centers...");
//   async function upsertCenter(name: string, location: string) {
//     let center = await prisma.center.findFirst({ where: { name } });
//     if (!center) {
//       center = await prisma.center.create({
//         data: { name, location, isActive: true },
//       });
//     }
//     return center;
//   }

//   const andheriCenter = await upsertCenter("Andheri Center", "Andheri, Mumbai");
//   const dharaviCenter = await upsertCenter("Dharavi Center", "Dharavi, Mumbai");

//   // 3. CenterPrograms
//   console.log("Assigning Programs to Centers...");
//   async function assignCenterProgram(centerId: string, programId: string) {
//     await prisma.centerProgram.upsert({
//       where: { centerId_programId: { centerId, programId } },
//       update: {},
//       create: { centerId, programId, isActive: true },
//     });
//   }

//   await assignCenterProgram(andheriCenter.id, pSwayam.id);
//   await assignCenterProgram(dharaviCenter.id, pSwayam.id);

//   // 4. Users
//   console.log("Upserting Users...");
//   const adminHash = await bcrypt.hash("Admin@123", 10);
//   const teacherHash = await bcrypt.hash("Teacher@123", 10);
//   const staffHash = await bcrypt.hash("Staff@123", 10);

//   const superAdmin = await prisma.user.upsert({
//   where: { email: 'super_admin_1' }, // Our new User ID
//   update: {},
//   create: {
//     email: 'super_admin_1',
//     fullName: 'System Super Admin',
//     passwordHash: await bcrypt.hash('SuperAdmin@123', 10),
//     role: 'super_admin', // Must match the new Enum
//     isActive: true,
//   },
// });

//   const admin = await prisma.user.upsert({
//     where: { email: "admin@sparsha.org" },
//     update: { passwordHash: adminHash },
//     create: {
//       email: "admin@sparsha.org",
//       passwordHash: adminHash,
//       fullName: "Admin User",
//       role: "super_admin",
//     },
//   });

//   const teacher1 = await prisma.user.upsert({
//     where: { email: "teacher1@sparsha.org" },
//     update: { passwordHash: teacherHash },
//     create: {
//       email: "teacher1@sparsha.org",
//       passwordHash: teacherHash,
//       fullName: "Teacher One",
//       role: "teacher",
//     },
//   });

//   const teacher2 = await prisma.user.upsert({
//     where: { email: "teacher2@sparsha.org" },
//     update: { passwordHash: teacherHash },
//     create: {
//       email: "teacher2@sparsha.org",
//       passwordHash: teacherHash,
//       fullName: "Teacher Two",
//       role: "teacher",
//     },
//   });

//   const staff1 = await prisma.user.upsert({
//     where: { email: "staff1@sparsha.org" },
//     update: { passwordHash: staffHash },
//     create: {
//       email: "staff1@sparsha.org",
//       passwordHash: staffHash,
//       fullName: "Staff One",
//       role: "staff",
//     },
//   });

//   // 5. UserCenterAssignments
//   console.log("Assigning Users to Centers...");
//   async function assignUserCenter(userId: string, centerId: string) {
//     await prisma.userCenterAssignment.upsert({
//       where: { userId_centerId: { userId, centerId } },
//       update: {},
//       create: { userId, centerId, createdBy: admin.id },
//     });
//   }

//   await assignUserCenter(admin.id, andheriCenter.id);
//   await assignUserCenter(admin.id, dharaviCenter.id);
//   await assignUserCenter(teacher1.id, andheriCenter.id);
//   await assignUserCenter(teacher2.id, dharaviCenter.id);
//   await assignUserCenter(staff1.id, andheriCenter.id);

//   // 6. Students
//   console.log("Creating 60 Students...");
//   const baseNames = [
//     "Aarav", "Diya", "Vihaan", "Ananya", "Kabir", "Isha", "Vivaan", "Neha", "Arjun", "Riya",
//     "Ayaan", "Sara", "Krishna", "Pooja", "Rohan", "Anjali", "Aditya", "Kriti", "Aryan", "Sneha"
//   ];
//   const surnames = ["Patel", "Sharma", "Kumar", "Singh", "Das", "Gupta", "Joshi", "Verma", "Yadav", "Menon"];
//   const studentsDetails = [];
  
//   for (let i = 0; i < 60; i++) {
//     const fullName = `${baseNames[i % baseNames.length]} ${surnames[i % surnames.length]} ${i}`;
//     const center = i < 30 ? andheriCenter : dharaviCenter;
//     const gType = Math.random() > 0.5 ? "male" : "female";
//     const year = 2006 + Math.floor(Math.random() * 4);
//     const month = Math.floor(Math.random() * 12);
//     const day = Math.floor(Math.random() * 28) + 1;
//     const dob = new Date(year, month, day);

//     let existing = await prisma.student.findFirst({
//       where: { fullName, centerId: center.id },
//     });

//     if (!existing) {
//       existing = await prisma.student.create({
//         data: {
//           fullName,
//           centerId: center.id,
//           programId: pSwayam.id,
//           dob,
//           gender: gType as any,
//           guardianName: `${fullName.split(" ")[0]}'s Parent`,
//           guardianPhone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
//         },
//       });
//     }
//     studentsDetails.push(existing);
//   }

//   // 7. Attendance Sessions (4 Weeks)
//   console.log("Creating 4 Weeks of Attendance Sessions...");
//   async function createAttendanceForCenter(centerId: string, students: any[]) {
//     // Generate 20 days (4 weeks * 5 days)
//     for (let dayOffset = 28; dayOffset > 0; dayOffset--) {
//       // Skip weekends implicitly by just acting like it's a weekday for simplicity
//       if (dayOffset % 7 === 0 || dayOffset % 7 === 1) continue; 
      
//       const sessionDate = new Date();
//       sessionDate.setDate(sessionDate.getDate() - dayOffset);
      
//       let session = await prisma.attendanceSession.findFirst({
//         where: { centerId, programId: pSwayam.id, sessionDate: sessionDate },
//       });

//       if (!session) {
//         session = await prisma.attendanceSession.create({
//           data: {
//             centerId,
//             programId: pSwayam.id,
//             sessionDate,
//             createdBy: admin.id,
//           },
//         });
//       }
      
//       const recordsCount = await prisma.attendanceRecord.count({ where: { sessionId: session.id } });
//       if (recordsCount === 0) {
//         const data = students.map((s) => {
//           let status = "present";
//           const roll = Math.random();
//           if (roll > 0.85) status = "absent";
//           else if (roll > 0.75) status = "late";
//           return {
//             sessionId: session!.id,
//             studentId: s.id,
//             centerId,
//             status: status as any,
//           };
//         });
//         await prisma.attendanceRecord.createMany({ data });
//       }
//     }
//   }

//   await createAttendanceForCenter(andheriCenter.id, studentsDetails.slice(0, 30));
//   await createAttendanceForCenter(dharaviCenter.id, studentsDetails.slice(30, 60));

//   // 8. Exams (Baseline and Endline)
//   console.log("Creating Baseline and Endline Exams...");
//   const sEnglish = await prisma.programSubject.upsert({
//     where: { programId_name: { programId: pSwayam.id, name: "english" } },
//     update: {}, create: { programId: pSwayam.id, name: "english" }
//   });
//   const sMaths = await prisma.programSubject.upsert({
//     where: { programId_name: { programId: pSwayam.id, name: "maths" } },
//     update: {}, create: { programId: pSwayam.id, name: "maths" }
//   });
//   const sScience = await prisma.programSubject.upsert({
//     where: { programId_name: { programId: pSwayam.id, name: "science" } },
//     update: {}, create: { programId: pSwayam.id, name: "science" }
//   });
//   const subjects = [sEnglish.id, sMaths.id, sScience.id];

//   async function createExamsForCenter(centerId: string, students: any[]) {
    
//     // Baseline
//     let baselineExam = await prisma.exam.findFirst({
//       where: { centerId, programId: pSwayam.id, examType: "baseline", name: "Baseline 2024" },
//     });
//     if (!baselineExam) {
//       baselineExam = await prisma.exam.create({
//         data: { centerId, programId: pSwayam.id, examType: "baseline", name: "Baseline 2024", createdBy: admin.id },
//       });
//     }

//     const baselineCount = await prisma.examScore.count({ where: { examId: baselineExam.id }});
//     if (baselineCount === 0) {
//       const bData: any[] = [];
//       students.forEach(s => {
//         subjects.forEach(sub => {
//           bData.push({
//             examId: baselineExam!.id, studentId: s.id, centerId, subjectId: sub, enteredBy: admin.id,
//             marks: 15 + Math.random() * 15 // 30-60%
//           });
//         });
//       });
//       await prisma.examScore.createMany({ data: bData });
//     }

//     // Endline
//     let endlineExam = await prisma.exam.findFirst({
//       where: { centerId, programId: pSwayam.id, examType: "endline", name: "Endline 2024" },
//     });
//     if (!endlineExam) {
//       endlineExam = await prisma.exam.create({
//         data: { centerId, programId: pSwayam.id, examType: "endline", name: "Endline 2024", createdBy: admin.id },
//       });
//     }

//     const endlineCount = await prisma.examScore.count({ where: { examId: endlineExam.id }});
//     if (endlineCount === 0) {
//       const eData: any[] = [];
//       students.forEach(s => {
//         subjects.forEach(sub => {
//           eData.push({
//             examId: endlineExam!.id, studentId: s.id, centerId, subjectId: sub, enteredBy: admin.id,
//             marks: 35 + Math.random() * 15 // 70-100%
//           });
//         });
//       });
//       await prisma.examScore.createMany({ data: eData });
//     }
//   }

//   await createExamsForCenter(andheriCenter.id, studentsDetails.slice(0, 30));
//   await createExamsForCenter(dharaviCenter.id, studentsDetails.slice(30, 60));

//   // 9. Form Template + Submissions
//   console.log("Upserting Form Templates & Fake Submissions...");
  
//   let smFormTpl = await prisma.formTemplate.findFirst({ where: { formType: "student_meeting" } });
//   if (!smFormTpl) {
//     smFormTpl = await prisma.formTemplate.create({
//       data: {
//         formType: "student_meeting", name: "Student Meeting Form", isActive: true, targetEntity: "student", createdBy: admin.id,
//         schema: {
//           fields: [
//              { name: 'meetingDate', label: 'Meeting Date', type: 'date', required: true },
//              { name: 'agenda', label: 'Agenda', type: 'textarea', required: true },
//              { name: 'outcome', label: 'Outcome', type: 'textarea', required: false },
//              { name: 'followUp', label: 'Follow-up Required?', type: 'boolean', required: false }
//           ]
//         }
//       }
//     });
//   }

//   const extraForms: Array<[string, string]> = [
//     ["parent_meeting", "Parent Meeting Form"],
//     ["activity_form", "Activity Form"],
//   ];
//   for (const [formType, name] of extraForms) {
//     const existing = await prisma.formTemplate.findFirst({ where: { formType } });
//     if (!existing) {
//       await prisma.formTemplate.create({
//         data: {
//           formType, name, isActive: true, targetEntity: "student", createdBy: admin.id,
//           schema: {
//             fields: [
//               { name: "title", label: "Title", type: "text", required: true },
//               { name: "details", label: "Details", type: "textarea", required: true },
//               { name: "date", label: "Date", type: "date", required: false },
//             ],
//           },
//         },
//       });
//     }
//   }

//   // Create some submissions for the first 5 students
//   for (let i = 0; i < 5; i++) {
//     const stud = studentsDetails[i];
//     const exists = await prisma.formSubmission.count({ where: { studentId: stud.id } });
//     if (exists === 0) {
//       await prisma.formSubmission.create({
//         data: {
//           templateId: smFormTpl.id,
//           studentId: stud.id,
//           centerId: stud.centerId,
//           submittedBy: admin.id,
//           data: {
//             meetingDate: new Date().toISOString().split('T')[0],
//             agenda: "Regular monthly review to discuss academic progress and Swayam activities.",
//             outcome: "Student is actively participating but needs more help in English.",
//             followUp: true
//           }
//         }
//       });
//     }
//   }

//   // Summary
//   const tCenters = await prisma.center.count();
//   const tPrograms = await prisma.program.count();
//   const tUsers = await prisma.user.count();
//   const tStudents = await prisma.student.count();
//   const tAttendance = await prisma.attendanceRecord.count();
//   const tScores = await prisma.examScore.count();
//   const tForms = await prisma.formSubmission.count();

//   console.log("\n--- SEEDING COMPLETE ---");
//   console.log(`Summary: ${tCenters} centers, ${tPrograms} programs, ${tUsers} users`);
//   console.log(`Payload: ${tStudents} students, ${tAttendance} attendances, ${tScores} exam scores, ${tForms} form submissions.`);
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });


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

  // 4. Users (Using User ID System)
  console.log("Upserting Users...");
  const defaultPassword = await bcrypt.hash("SuperAdmin@123", 10);
  const staffPassword = await bcrypt.hash("Staff@123", 10);

  // MASTER SUPER ADMIN
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

  // CENTER ADMIN (Owned by Super Admin)
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

  // TEACHERS (Owned by Center Admin)
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

  const teacher2 = await prisma.user.upsert({
    where: { email: "teacher_2" },
    update: { passwordHash: staffPassword },
    create: {
      email: "teacher_2",
      passwordHash: staffPassword,
      fullName: "Teacher Two",
      role: "teacher",
      createdBy: centerAdmin.id,
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: "staff_1" },
    update: { passwordHash: staffPassword },
    create: {
      email: "staff_1",
      passwordHash: staffPassword,
      fullName: "Staff One",
      role: "staff",
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
  await assignUserCenter(teacher2.id, dharaviCenter.id);
  await assignUserCenter(staff1.id, andheriCenter.id);

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
          submittedBy: superAdmin.id,
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

  // 10. Skills
  console.log("Upserting Skills...");
  const skillNames = ["Communication", "Leadership", "Teamwork", "Problem Solving", "Computer Literacy"];
  const skillDefs = [];
  for (const name of skillNames) {
    const s = await prisma.skillDefinition.upsert({
      where: { programId_name: { programId: pSwayam.id, name } },
      update: {},
      create: { programId: pSwayam.id, name, description: `Student's proficiency in ${name}` }
    });
    skillDefs.push(s);
  }

  console.log("Assigning Skills to Students...");
  for (let i = 0; i < 30; i++) {
    const stud = studentsDetails[i];
    for (const skill of skillDefs) {
      const exists = await prisma.studentSkillLog.count({ where: { studentId: stud.id, skillId: skill.id } });
      if (exists === 0 && Math.random() > 0.3) {
        await prisma.studentSkillLog.create({
          data: {
            studentId: stud.id, centerId: stud.centerId, skillId: skill.id,
            level: Math.floor(Math.random() * 5) + 1,
            assessedBy: centerAdmin.id,
            remarks: "Baseline assessment"
          }
        });
      }
    }
  }

  // 11. Career Tracking Forms
  console.log("Upserting Career Tracking Forms...");
  let careerTpl = await prisma.formTemplate.findFirst({ where: { name: "Career Tracking", targetEntity: "student" } });
  if (!careerTpl) {
    careerTpl = await prisma.formTemplate.create({
      data: {
        name: "Career Tracking", formType: "system", targetEntity: "student", createdBy: superAdmin.id,
        schema: { fields: [] }
      }
    });
  }

  for (let i = 0; i < 30; i++) {
    const stud = studentsDetails[i];
    const exists = await prisma.formSubmission.count({ where: { studentId: stud.id, templateId: careerTpl.id } });
    if (exists === 0 && Math.random() > 0.5) {
      await prisma.formSubmission.create({
        data: {
          templateId: careerTpl.id, studentId: stud.id, centerId: stud.centerId, submittedBy: centerAdmin.id,
          data: {
            careerGoal: ["Software Engineer", "Doctor", "Teacher", "Artist", "Entrepreneur"][Math.floor(Math.random() * 5)],
            industry: ["Tech", "Medical", "Education", "Arts", "Business"][Math.floor(Math.random() * 5)],
            notes: "Initial career counseling session completed."
          }
        }
      });
    }
  }

  // Summary Report
  const tCenters = await prisma.center.count();
  const tPrograms = await prisma.program.count();
  const tUsers = await prisma.user.count();
  const tStudents = await prisma.student.count();
  const tAttendance = await prisma.attendanceRecord.count();
  const tScores = await prisma.examScore.count();
  const tForms = await prisma.formSubmission.count();
  const tSkillLogs = await prisma.studentSkillLog.count();

  console.log("\n--- SEEDING COMPLETE ---");
  console.log(`Summary: ${tCenters} centers, ${tPrograms} programs, ${tUsers} users`);
  console.log(`Payload: ${tStudents} students, ${tAttendance} attendances, ${tScores} exam scores, ${tForms} form submissions, ${tSkillLogs} skill logs.`);
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