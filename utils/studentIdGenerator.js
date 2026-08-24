const { Student } = require("../models/index");

const generateStudentId = async () => {
  const year = new Date().getFullYear();
  const count = await Student.count();
  const seq = String(count + 1).padStart(3, "0");
  return `SC${year}${seq}`;
};

module.exports = generateStudentId;
