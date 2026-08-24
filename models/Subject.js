const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Subject = db.define("Subject", {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  code: { type: DataTypes.STRING },
  course: { type: DataTypes.STRING },
});

module.exports = Subject;
