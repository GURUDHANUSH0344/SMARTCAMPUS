const { DataTypes } = require("sequelize");
const db = require("../config/db");

const User = db.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM("admin", "teacher", "student"),
    defaultValue: "student",
  },
  status: {
    type: DataTypes.ENUM("active", "pending"),
    defaultValue: "active",
  },
});

module.exports = User;
