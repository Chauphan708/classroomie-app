import { create } from 'zustand';
import { ClassroomState, StudentStatus, WallConfig } from '../types';

interface ClassroomStore {
  state: ClassroomState;
  
  // Actions
  joinClass: (name: string, group: string, id: string) => void;
  updateStudentStatus: (id: string, updates: Partial<StudentStatus>) => void;
  removeStudent: (id: string) => void;
  sendMessage: (senderId: string, senderName: string, text?: string, imageUrl?: string) => void;
  updateWallConfig: (config: Partial<WallConfig>) => void;
  resetBuzzer: () => void;
  resetAllStatuses: () => void;
}

export const useClassroomStore = create<ClassroomStore>((set) => ({
  state: {
    students: {},
    messages: [],
    buzzerActive: true,
    buzzerWinnerId: null,
    wallConfig: { isPublic: true, showNames: true },
  },

  joinClass: (name, group, id) => set((store) => {
    const newStudent: StudentStatus = {
      id,
      name,
      group,
      avatarSeed: id, // Dùng ID làm hạt giống để tạo avatar ngẫu nhiên
      needsHelp: false,
      isFinished: false,
      handRaised: false,
    };
    return {
      state: {
        ...store.state,
        students: { ...store.state.students, [id]: newStudent }
      }
    };
  }),

  updateStudentStatus: (id, updates) => set((store) => {
    const currentStudent = store.state.students[id];
    if (!currentStudent) return store;

    const updatedStudent = { ...currentStudent, ...updates };
    
    // Cập nhật thời gian khi trạng thái thay đổi
    if (updates.needsHelp && !currentStudent.needsHelp) updatedStudent.needsHelpAt = Date.now();
    if (updates.isFinished && !currentStudent.isFinished) updatedStudent.isFinishedAt = Date.now();
    if (updates.handRaised && !currentStudent.handRaised) updatedStudent.handRaisedAt = Date.now();

    // Xử lý logic Nhấn Chuông
    let newWinner = store.state.buzzerWinnerId;
    if (updates.buzzerPressedAt && store.state.buzzerActive && !newWinner) {
       newWinner = id;
    }

    return {
      state: {
        ...store.state,
        students: { ...store.state.students, [id]: updatedStudent },
        buzzerWinnerId: newWinner
      }
    };
  }),

  removeStudent: (id) => set((store) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [id]: _, ...rest } = store.state.students;
    return { state: { ...store.state, students: rest } };
  }),

  sendMessage: (senderId, senderName, text, imageUrl) => set((store) => ({
    state: {
      ...store.state,
      messages: [
        ...store.state.messages,
        {
          id: Math.random().toString(36).substr(2, 9),
          senderId,
          senderName,
          text,
          imageUrl,
          timestamp: Date.now(),
        }
      ]
    }
  })),

  updateWallConfig: (config) => set((store) => ({
    state: { ...store.state, wallConfig: { ...store.state.wallConfig, ...config } }
  })),

  resetBuzzer: () => set((store) => ({
    state: { ...store.state, buzzerWinnerId: null, buzzerActive: true }
  })),

  resetAllStatuses: () => set((store) => {
    const resetStudents = Object.entries(store.state.students).reduce((acc, [id, s]) => {
      acc[id] = { 
        ...s, 
        needsHelp: false, 
        isFinished: false, 
        handRaised: false, 
        needsHelpAt: undefined, 
        isFinishedAt: undefined, 
        handRaisedAt: undefined 
      };
      return acc;
    }, {} as Record<string, StudentStatus>);
    
    return {
      state: { ...store.state, students: resetStudents, buzzerWinnerId: null }
    };
  }),
}));