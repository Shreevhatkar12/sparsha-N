# Seeded Data for Testing (Extensive)

The database has been seeded with the following data to facilitate comprehensive system testing.

## 1. Academic Years
- **2024-25**: Past year.
- **2025-26**: **Current Year** (Active for most operations).
- **2026-27**: Future year.

## 2. Centers (5)
- **Andheri Center**
- **Dharavi Center**
- **Govandi Center**
- **Kurla Center**
- **Malad Center**

## 3. Programs
- **SWAYAM** (Youth Development, Age 15-18)
- **SHIKSHA** (Early Learning, Age 3-6)
- **KUSUM** (Women Empowerment)
- **UDAY** (Vocational)

## 4. Users & Access Control
| Email | Password | Role | Center(s) |
|---|---|---|---|
| `super_admin_1` | `SuperAdmin@123` | `super_admin` | All |
| `tech_admin_1` | `SuperAdmin@123` | `tech_admin` | All |
| `center_admin_1` | `Staff@123` | `center_admin` | Andheri |
| `teacher_1` | `Staff@123` | `teacher` | Andheri |
| `teacher_2` | `Staff@123` | `teacher` | Dharavi |
| (up to `teacher_10`) | `Staff@123` | `teacher` | Rotating |

## 5. Students (100)
- Distributed across all 5 centers.
- 50% in SWAYAM, 50% in SHIKSHA.
- All enrolled in the `2025-26` Academic Year.

## 6. Attendance
- **History**: Last 7 days of daily attendance sessions created for ALL centers and BOTH major programs.
- **Completion**: 90% attendance marks populated. 10% random absences for analytics testing.

## 7. Exams & Performance
- **Baseline 2025**: Created for all students in Andheri Center.
- **Endline 2025**: Created for all students in Andheri Center.
- **Scores**: Seeded for English, Mathematics, and Science. Endline scores are generally higher to show "Improvement" in analytics.

## 8. Skill Assessments
- **Skill Areas**: Communication, Critical Thinking, Collaboration, Creativity, Self-Management.
- **Records**: 20 students in each program have initial proficiency logs (Levels 1-5).

## 9. Forms & Templates
- **Templates (5)**: Career Interest, Family Background, Health Assessment, Quarterly Feedback, Center Safety Audit.
- **Submissions**: 10 sample submissions created for the first 10 students.

## 10. Equipment
- 5 items (Laptop, Projector, etc.) assigned to EACH center.
- All items marked as "Active" and "Good condition".

## 11. Announcements
- **Pinned**: "Quarterly Review Meeting", "Exam Schedule Updated".
- **General**: "New Resource Center Opening".

## 12. Messages
- 5 Threaded conversations between Teachers and Tech Admin regarding password resets.
