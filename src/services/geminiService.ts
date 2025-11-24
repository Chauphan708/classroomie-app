import { GoogleGenAI } from "@google/genai";
import { ClassroomState } from "../types";

// Support both Node.js process.env (standard) and Vite import.meta.env
// @ts-ignore
const apiKey = process.env.API_KEY || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_KEY : undefined);

if (!apiKey) {
  console.warn("Missing API KEY. AI features will not work.");
}

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const getTeacherAssistantAdvice = async (
  prompt: string, 
  classroomState: ClassroomState
): Promise<string> => {
  try {
    const studentCount = Object.keys(classroomState.students).length;
    const finishedCount = Object.values(classroomState.students).filter(s => s.isFinished).length;
    const helpCount = Object.values(classroomState.students).filter(s => s.needsHelp).length;
    
    const context = `
      Bạn là một trợ lý giáo viên tiểu học thông thái, vui tính và hữu ích.
      Tình trạng lớp học hiện tại:
      - Tổng số học sinh: ${studentCount}
      - Số học sinh đã làm xong: ${finishedCount}
      - Số học sinh cần giúp đỡ: ${helpCount}
      
      Hãy đưa ra lời khuyên ngắn gọn, động viên hoặc gợi ý hoạt động dựa trên câu hỏi của giáo viên.
      Giữ giọng văn thân thiện, sư phạm và tích cực.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: context,
      },
      contents: prompt,
    });

    return response.text || "Xin lỗi, tôi đang suy nghĩ một chút, bạn hỏi lại sau nhé!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hiện tại tôi không thể kết nối. Hãy thử lại sau.";
  }
};