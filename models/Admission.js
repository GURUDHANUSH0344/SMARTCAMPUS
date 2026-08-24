const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Admission = db.define("Admission", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  course: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
    defaultValue: "Pending",
  },
  document: { type: DataTypes.STRING },
});

module.exports = Admission;
