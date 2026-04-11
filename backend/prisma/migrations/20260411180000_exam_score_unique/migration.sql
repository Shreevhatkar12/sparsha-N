-- CreateIndex
CREATE UNIQUE INDEX "ExamScore_examId_studentId_subject_key" ON "exam_scores"("exam_id", "student_id", "subject");
