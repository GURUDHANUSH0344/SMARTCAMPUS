const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

/**
 * Parses an Excel or CSV file and returns an array of objects.
 * @param {string} filePath - Absolute path to the uploaded file.
 * @returns {Array<Object>} - Parsed data.
 */
exports.parseFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON, using header row (row 1) as keys
    const data = xlsx.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error("[PARSING ERROR]:", error);
    throw new Error("Failed to parse file. Ensure it's a valid Excel or CSV.");
  }
};

/**
 * Cleans a string to extract a numeric value (removes currency symbols and commas).
 */
const cleanNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^\d.-]/g, "");
  return parseFloat(cleaned) || 0;
};

/**
 * Maps input string to a valid Fee Type ENUM value.
 */
const mapFeeType = (val) => {
  if (!val) return "Tuition Fee";
  const search = String(val).toLowerCase().trim();
  
  if (search.includes("tuition")) return "Tuition Fee";
  if (search.includes("hostel")) return "Hostel Fee";
  if (search.includes("library")) return "Library Fee";
  if (search.includes("exam")) return "Exam Fee";
  if (search.includes("transport") || search.includes("bus")) return "Transport Fee";
  if (search.includes("sport") || search.includes("gym")) return "Sports Fee";
  if (search.includes("lab")) return "Lab Fee";
  if (search.includes("place")) return "Placement Fee";
  
  return "Miscellaneous";
};

/**
 * Validates and maps fee data from the parsed file.
 * Expected columns: Student ID, Student Name, Department, Type, Amount, Discount, Paid, Method, Due Date, Paid Date, Remarks
 */
exports.mapFeeData = (rawData) => {
  return rawData.map((row) => ({
    studentIdStr: row["Student ID"] || row["student_id"] || row["Roll No"] || row["Roll"] || row["ID"],
    studentName: row["Student Name"] || row["name"] || row["Student"] || row["Full Name"],
    department: row["Department"] || row["course"] || row["Dept"] || row["Branch"],
    feeType: mapFeeType(row["Type"] || row["Fee Type"] || row["Category"]),
    amount: cleanNumber(row["Amount"] || row["Total"] || row["Total Amount"]),
    discount: cleanNumber(row["Discount"] || row["Scholarship"] || row["Concession"]),
    amountPaid: cleanNumber(row["Paid"] || row["Paid Amount"] || row["Amount Paid"]),
    paymentMethod: row["Method"] || row["Payment Method"] || row["Mode"] || "Cash",
    dueDate: row["Due Date"] || row["due_date"] || row["Due"],
    paidDate: row["Paid Date"] || row["paid_date"] || row["Payment Date"],
    remarks: row["Remarks"] || row["notes"] || row["Comment"] || ""
  }));
};

/**
 * Validates and maps student data from the parsed file.
 * Expected columns: Name, Email, Phone, Course, Year, Address
 */
exports.mapStudentData = (rawData) => {
  return rawData.map((row) => ({
    name: row["Name"] || row["name"],
    email: row["Email"] || row["email"],
    phone: row["Phone"] || row["phone"],
    course: row["Course"] || row["Department"] || row["course"],
    year: row["Year"] || row["year"] || "1",
    address: row["Address"] || row["address"] || "Campus"
  }));
};

/**
 * Validates and maps admission data from the parsed file.
 * Expected columns: Name, Email, Phone, Course
 */
exports.mapAdmissionData = (rawData) => {
  return rawData.map((row) => ({
    name: row["Name"] || row["name"],
    email: row["Email"] || row["email"],
    phone: row["Phone"] || row["phone"],
    course: row["Course"] || row["Department"] || row["course"]
  }));
};

/**
 * Validates and maps exam data from the parsed file.
 * Expected columns: Student ID, Semester, Subject, Type, Max Marks, Marks Obtained, Credits, Date, Remarks
 */
exports.mapExamData = (rawData) => {
  return rawData.map((row) => ({
    studentIdStr: row["Student ID"] || row["student_id"] || row["Roll No"],
    semester: parseInt(row["Semester"] || row["sem"]) || 1,
    subject: row["Subject"] || row["subject"] || "General",
    examType: row["Type"] || row["Exam Type"] || "Internal",
    maxMarks: parseFloat(row["Max Marks"] || row["max_marks"]) || 100,
    marksObtained: parseFloat(row["Marks Obtained"] || row["marks"]) || 0,
    credits: parseFloat(row["Credits"] || row["credits"]) || 3.0,
    examDate: row["Date"] || row["Exam Date"] || row["exam_date"],
    remarks: row["Remarks"] || row["notes"] || ""
  }));
};
