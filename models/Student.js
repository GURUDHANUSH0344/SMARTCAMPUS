const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Student = db.define("Student", {
  student_id: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  course: { type: DataTypes.STRING },
  year: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
});

module.exports = Student;
