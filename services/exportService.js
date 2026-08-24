const XLSX = require("xlsx");

/**
 * Generates an Excel buffer from multiple data arrays.
 * @param {Object} data - { sheetName: ArrayOfObjects }
 * @returns {Buffer}
 */
exports.generateExcelBuffer = (data) => {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(data)) {
    const worksheet = XLSX.utils.json_to_sheet(rows || []);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};
