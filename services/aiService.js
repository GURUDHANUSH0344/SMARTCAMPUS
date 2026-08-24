const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async getChatResponse(studentData, userMessage) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY_HERE")) {
      return this.getMockResponse(studentData, userMessage);
    }

    try {
      const systemPrompt = `
        You are an intelligent AI assistant for a Student ERP system.
        Your job is to answer student queries by fetching real-time data from the backend database.

        -----------------------------------
        🎯 CORE BEHAVIOR
        -----------------------------------
        - Always give clear, short, helpful answers
        - Be conversational but professional
        - If data is available → show it clearly
        - If data is missing → say it politely
        - Never hallucinate data
        - Always prioritize backend data over assumptions

        -----------------------------------
        📦 DATA ACCESS (STUDENT CONTEXT)
        -----------------------------------
        ${JSON.stringify(this.formatContext(studentData), null, 2)}

        -----------------------------------
        🧠 INTENT HANDLING & RESPONSE FORMATS
        -----------------------------------

        💰 FEES RELATED ("fee", "payment", "due"):
        - Total Fees: ₹{total_fees}
        - Paid: ₹{amount_paid}
        - Due: ₹{amount_due}
        - Last Payment: {last_payment_date}
        - Due Date: {due_date}
        If amount_due > 0: "Please pay before the due date to avoid penalties."
        If due is high: "Would you like to pay now?"

        📅 EXAM RELATED ("exam", "test", "results"):
        Upcoming: "Your upcoming exams are:" - {subject} on {date} at {time}
        Results: "{subject}: {marks} ({status})"
        If exam is within 3 days: "Your exam is قريب. Start preparing!"

        🏠 HOSTEL RELATED ("hostel", "room"):
        If allocated:
        - Block: {block}
        - Room: {room_number}
        Else: "Hostel room is not yet allocated. Contact admin for allocation."
        Also show: - Hostel Fee Due: ₹{hostel_fee_due}

        -----------------------------------
        💬 TONE: Friendly, Helpful, Slightly conversational. UseEmojis: ✅ 📅 💰

        USER QUESTION: "${userMessage}"
      `;

      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("AI Service Error:", error);
      return "Sorry, I’m unable to fetch your data right now. Please try again later.";
    }
  }

  formatContext(data) {
    const fees = data.fees || [];
    const exams = data.exams || [];
    const hostel = data.hostel;

    const total_fees = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
    const amount_paid = fees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
    const hostel_fee_due = fees.filter(f => f.feeType.toLowerCase().includes('hostel'))
                               .reduce((sum, f) => sum + ((f.amount || 0) - (f.amountPaid || 0)), 0);

    return {
      student_id: data.profile ? data.profile.student_id : null,
      name: data.profile ? data.profile.name : 'Student',
      fee_details: {
        total_fees,
        amount_paid,
        amount_due: total_fees - amount_paid,
        last_payment_date: fees.length > 0 ? fees[0].updatedAt : 'N/A',
        due_date: fees.length > 0 ? fees[0].dueDate : 'N/A'
      },
      exam_details: {
        upcoming_exams: exams.filter(e => !e.marksObtained).map(e => ({
          subject: e.subject,
          date: e.examDate || 'TBD',
          time: '10:00 AM' // Default as not in model
        })),
        results: exams.filter(e => e.marksObtained !== null).map(e => ({
          subject: e.subject,
          marks: e.marksObtained,
          status: e.grade === 'F' ? 'Fail' : 'Pass'
        }))
      },
      hostel_details: {
        hostel_allocated: !!hostel,
        block: hostel ? hostel.block : 'N/A',
        room_number: hostel ? hostel.roomNo : 'N/A',
        hostel_fee_due: hostel_fee_due
      }
    };
  }

  getMockResponse(studentData, userMessage) {
    const ctx = this.formatContext(studentData);
    const msg = userMessage.toLowerCase();
    
    // Quick conversational start
    let response = `Hello ${ctx.name}! 👋\n\n`;

    if (msg.includes("fee") || msg.includes("due") || msg.includes("payment")) {
      const f = ctx.fee_details;
      response += `💰 **Fee Status:**\n`;
      response += `- Total Fees: ₹${f.total_fees}\n`;
      response += `- Paid: ₹${f.amount_paid}\n`;
      response += `- Due: ₹${f.amount_due}\n`;
      response += `- Last Payment: ${f.last_payment_date}\n`;
      response += `- Due Date: ${f.due_date}\n\n`;
      
      if (f.amount_due > 0) {
        response += "Please pay before the due date to avoid penalties. ✅\n";
        if (f.amount_due > 5000) response += "Would you like to pay now? 💳";
      }
    } 
    else if (msg.includes("exam") || msg.includes("result") || msg.includes("test")) {
      const e = ctx.exam_details;
      if (msg.includes("result") || msg.includes("marks")) {
        if (e.results.length > 0) {
          response += "📝 **Your Results:**\n";
          e.results.forEach(r => response += `- ${r.subject}: ${r.marks} (${r.status})\n`);
        } else {
          response += "I couldn't find any results yet. 📅";
        }
      } else {
        if (e.upcoming_exams.length > 0) {
          response += "📅 **Your upcoming exams are:**\n";
          e.upcoming_exams.forEach(ex => response += `- ${ex.subject} on ${ex.date} at ${ex.time}\n`);
          // Check if قریب
          const nextExamDate = new Date(e.upcoming_exams[0].date);
          const diffDays = Math.ceil((nextExamDate - new Date()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 3 && diffDays >= 0) response += "\nYour exam is قريب. Start preparing! 🔥";
        } else {
          response += "No upcoming exams scheduled. ✅";
        }
      }
    }
    else if (msg.includes("hostel") || msg.includes("room")) {
      const h = ctx.hostel_details;
      if (h.hostel_allocated) {
        response += `🏠 **Hostel Details:**\n`;
        response += `- Block: ${h.block}\n`;
        response += `- Room: ${h.room_number}\n`;
      } else {
        response += "Hostel room is not yet allocated. Contact admin for allocation. 🏠\n";
      }
      response += `- Hostel Fee Due: ₹${h.hostel_fee_due}\n`;
    }
    else {
      response += "I'm here to help! Try asking about your **fees**, **exams**, or **hostel**. 😊";
    }

    return response;
  }
}

module.exports = new AIService();
