const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Exam = db.define("Exam", {
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  subjectId: { type: DataTypes.INTEGER },
  semester: { type: DataTypes.INTEGER, defaultValue: 1 },
  subject: { type: DataTypes.STRING, allowNull: false },
  examType: {
    type: DataTypes.ENUM("Internal", "External", "Practical", "Viva"),
    defaultValue: "Internal",
  },
  maxMarks: { type: DataTypes.INTEGER, defaultValue: 100 },
  marksObtained: { type: DataTypes.FLOAT },
  credits: { type: DataTypes.FLOAT, defaultValue: 3.0 },
  grade: { type: DataTypes.STRING },
  examDate: { type: DataTypes.DATEONLY },
  remarks: { type: DataTypes.STRING },
});

module.exports = Exam;
