const PDFDocument = require("pdfkit");
const fs = require("fs");

exports.generatePDF = (data, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header: College Name
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#1e40af").text("SmartCampus Institute of Technology", { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text("Main Campus, University Road | office@smartcampus.edu", { align: "center" });
    doc.moveDown(1.5);
    
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#111827").text("OFFICIAL FEE RECEIPT", { align: "center" });
    doc.moveDown();
    
    // Receipt Info Bar
    doc.rect(50, doc.y, 500, 20).fill("#f8fafc");
    doc.fontSize(10).fillColor("#475569").text(`Receipt No: ${data.receiptNo}`, 60, doc.y + 5);
    doc.text(`Date: ${data.date || new Date().toISOString().split('T')[0]}`, 450, doc.y - 12);
    doc.moveDown(2);

    // Main Details Table Concept
    const row = (label, value) => {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#374151").text(label.padEnd(20, " "), 60, doc.y, { continued: true });
      doc.font("Helvetica").fillColor("#111827").text(": " + (value || "-"), 180, doc.y);
      doc.moveDown(0.8);
    };

    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown();

    row("Student Name", data.name);
    row("Student ID", data.studentId);
    row("Course/Dept", data.course);
    row("Fee Type", data.feeType);
    doc.moveDown();
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    row("Total Fee Amount", "Rs. " + parseFloat(data.totalAmount || 0).toLocaleString());
    row("Amount Paid", "Rs. " + parseFloat(data.paidAmount || 0).toLocaleString());
    
    const balance = (parseFloat(data.totalAmount || 0) - parseFloat(data.paidAmount || 0));
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#b91c1c").text("Remaining Balance", 60, doc.y, { continued: true });
    doc.text(": Rs. " + balance.toLocaleString(), 180, doc.y);
    doc.moveDown(1.5);

    row("Payment Method", data.paymentMethod);
    row("Status", data.status);

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(10).fillColor("#94a3b8").text("Note: This is a computer-generated receipt and does not require a physical signature.", { align: "center", font: "Helvetica-Oblique" });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};
