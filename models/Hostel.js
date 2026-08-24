const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Hostel = db.define("Hostel", {
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  roomNo: { type: DataTypes.STRING, allowNull: false },
  block: { type: DataTypes.STRING },
  bedNo: { type: DataTypes.STRING },
  checkInDate: { type: DataTypes.DATEONLY },
  checkOutDate: { type: DataTypes.DATEONLY },
  status: {
    type: DataTypes.ENUM("Active", "Vacated"),
    defaultValue: "Active",
  },
  monthlyRent: { type: DataTypes.FLOAT, defaultValue: 0 },
  remarks: { type: DataTypes.STRING },
});

module.exports = Hostel;
