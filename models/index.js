const db = require("../config/db");
const User = require("./User");
const Student = require("./Student");
const Admission = require("./Admission");
const Exam = require("./Exam");
const Fee = require("./Fee");
const Hostel = require("./Hostel");
const Subject = require("./Subject");

// Associations
Student.hasMany(Exam, { foreignKey: "studentId", as: "exams" });
Exam.belongsTo(Student, { foreignKey: "studentId", as: "student" });

Subject.hasMany(Exam, { foreignKey: "subjectId", as: "exams" });
Exam.belongsTo(Subject, { foreignKey: "subjectId", as: "subjectRef" }); // Using subjectRef to avoid conflict with 'subject' string field if any

Student.hasMany(Fee, { foreignKey: "studentId", as: "fees" });
Fee.belongsTo(Student, { foreignKey: "studentId", as: "student" });

Student.hasOne(Hostel, { foreignKey: "studentId", as: "hostel" });
Hostel.belongsTo(Student, { foreignKey: "studentId", as: "student" });

module.exports = { db, User, Student, Admission, Exam, Fee, Hostel, Subject };
