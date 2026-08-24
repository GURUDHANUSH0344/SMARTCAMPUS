const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Fee = db.define("Fee", {
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  feeType: {
    type: DataTypes.ENUM(
      "Tuition Fee", "Hostel Fee", "Library Fee", "Exam Fee", 
      "Transport Fee", "Sports Fee", "Lab Fee", "Placement Fee", "Miscellaneous"
    ),
    defaultValue: "Tuition Fee",
  },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  amountPaid: { type: DataTypes.FLOAT, defaultValue: 0 },
  dueDate: { type: DataTypes.DATEONLY },
  paidDate: { type: DataTypes.DATEONLY },
  status: {
    type: DataTypes.ENUM("Unpaid", "Paid", "Overdue", "Partial", "Pending"),
    defaultValue: "Unpaid",
  },
  receiptNo: { type: DataTypes.STRING, unique: true },
  paymentMethod: {
    type: DataTypes.ENUM("Cash", "UPI", "NEFT/RTGS", "Bank Transfer", "Card", "DD / Cheque", "College Portal"),
    defaultValue: "Cash",
  },
  remarks: { type: DataTypes.STRING },
});

module.exports = Fee;
