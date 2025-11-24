import { GoogleGenerativeAI } from "@google/generative-ai";
import { ClassroomState } from "../types";

// Lấy API Key từ biến môi trường
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

export const getTeacherAssistantAdvice = async (prompt: string, classroomState: ClassroomState): Promise<string> => {
  try {
    // Sử dụng model gemini-pro hoặc gemini-1.5-flash tùy key của bạn
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const studentCount = Object.keys(classroomState.students).length;
    const needHelpCount = Object.values(classroomState.students).filter(s => s.needsHelp).length;
    const finishedCount = Object.values(classroomState.students).filter(s => s.isFinished).length;

    const context = `
      Bạn là một trợ lý sư phạm AI.
      Dữ liệu lớp học: Sĩ số ${studentCount}, Cần giúp ${needHelpCount}, Đã xong ${finishedCount}.
      Câu hỏi của giáo viên: "${prompt}"
      Hãy trả lời ngắn gọn, súc tích và hữu ích cho việc quản lý lớp học.
    `;

    const result = await model.generateContent(context);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Lỗi Gemini AI:", error);
    return "Hệ thống AI đang bận hoặc chưa cấu hình API Key. Vui lòng kiểm tra lại.";
  }
};