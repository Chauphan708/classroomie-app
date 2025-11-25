import { create } from 'zustand';
import { supabase } from './supabase';
import { ClassroomState, StudentStatus, WallConfig, UserRole } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ClassroomStore {
  state: ClassroomState;
  channel: RealtimeChannel | null;
  
  // Actions
  connectToRoom: (user: { id: string; name: string; role: UserRole; group?: string }) => void;
  updateStudentStatus: (id: string, updates: Partial<StudentStatus>) => void;
  removeStudent: (id: string) => void;
  sendMessage: (senderId: string, senderName: string, text?: string, imageUrl?: string) => void;
  updateWallConfig: (config: Partial<WallConfig>) => void;
  
  // New Logic
  resetBuzzer: () => void; // Mở chuông
  lockBuzzer: () => void;  // Khóa chuông
  resetAllStatuses: () => void;
}

export const useClassroomStore = create<ClassroomStore>((set, get) => ({
  state: {
    students: {},
    messages: [],
    buzzerActive: false, // Mặc định là KHÓA
    buzzerWinnerId: null,
    wallConfig: { isPublic: true, showNames: true },
  },
  channel: null,

  connectToRoom: (user) => {
    if (get().channel) get().channel?.unsubscribe();

    const channel = supabase.channel('classroom-room-1', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const studentsMap: Record<string, StudentStatus> = {};
        Object.values(newState).forEach((presences: any) => {
          const userData = presences[0];
          if (userData && userData.role === UserRole.STUDENT) {
            studentsMap[userData.id] = userData as StudentStatus;
          }
        });
        set((s) => ({ state: { ...s.state, students: studentsMap } }));
      })
      
      // Lắng nghe lệnh điều khiển (QUAN TRỌNG)
      .on('broadcast', { event: 'control' }, ({ payload }) => {
         // Giáo viên nhận lệnh của chính mình để đồng bộ, hoặc học sinh nhận lệnh
         if (payload.type === 'RESET_BUZZER') {
             set((s) => ({ state: { ...s.state, buzzerWinnerId: null, buzzerActive: true } }));
         }
         if (payload.type === 'LOCK_BUZZER') {
             set((s) => ({ state: { ...s.state, buzzerActive: false } }));
         }
         if (payload.type === 'RESET_ALL') {
             const resetStudents = Object.entries(get().state.students).reduce((acc, [id, st]) => {
                acc[id] = { ...st, needsHelp: false, isFinished: false, handRaised: false };
                return acc;
             }, {} as any);
             set((s) => ({ state: { ...s.state, students: resetStudents, buzzerWinnerId: null, buzzerActive: false } }));
         }
         if (payload.type === 'UPDATE_WALL') {
             set((s) => ({ state: { ...s.state, wallConfig: payload.config } }));
         }
         if (payload.type === 'REMOVE_STUDENT') {
             const { [payload.id]: _, ...rest } = get().state.students;
             set((s) => ({ state: { ...s.state, students: rest } }));
         }
      })

      .on('broadcast', { event: 'message' }, ({ payload }) => {
          set((s) => ({ state: { ...s.state, messages: [...s.state.messages, payload] } }));
      })

      .on('broadcast', { event: 'buzzer' }, ({ payload }) => {
          const currentState = get().state;
          // Chỉ nhận người đầu tiên nếu chuông đang MỞ và chưa có ai thắng
          if (!currentState.buzzerWinnerId && currentState.buzzerActive) {
              set((s) => ({ 
                  state: { ...s.state, buzzerWinnerId: payload.id, buzzerActive: false } // Khóa ngay khi có người thắng
              }));
          }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        if (user.role === UserRole.STUDENT) {
            const initialStatus: StudentStatus = {
                id: user.id, name: user.name, role: user.role, group: user.group,
                avatarSeed: user.id, needsHelp: false, isFinished: false, handRaised: false,
            } as any;
            await channel.track(initialStatus);
        }
      }
    });

    set({ channel });
  },

  updateStudentStatus: async (id, updates) => {
    // Cập nhật UI ngay lập tức
    set((s) => {
       const st = s.state.students[id];
       if(!st) return s;
       const newSt = { ...st, ...updates };
       if (updates.needsHelp && !st.needsHelp) newSt.needsHelpAt = Date.now();
       if (updates.isFinished && !st.isFinished) newSt.isFinishedAt = Date.now();
       if (updates.handRaised && !st.handRaised) newSt.handRaisedAt = Date.now();
       return { state: { ...s.state, students: { ...s.state.students, [id]: newSt } } };
    });

    const store = get();
    // Gửi tín hiệu chuông
    if (updates.buzzerPressedAt && store.state.buzzerActive) {
        store.channel?.send({ type: 'broadcast', event: 'buzzer', payload: { id } });
    }

    // Đồng bộ trạng thái
    if (store.channel) {
        const currentStudent = get().state.students[id];
        if (currentStudent) await store.channel.track(currentStudent);
    }
  },

  sendMessage: (senderId, senderName, text, imageUrl) => {
      const msg = { id: Math.random().toString(36).substr(2, 9), senderId, senderName, text, imageUrl, timestamp: Date.now() };
      get().channel?.send({ type: 'broadcast', event: 'message', payload: msg });
      set((s) => ({ state: { ...s.state, messages: [...s.state.messages, msg] } }));
  },

  // --- ACTIONS GIÁO VIÊN ---
  resetBuzzer: () => {
      // Gửi lệnh MỞ CHUÔNG
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'RESET_BUZZER' } });
      // Cập nhật luôn cho máy giáo viên (đỡ phải chờ mạng)
      set((s) => ({ state: { ...s.state, buzzerWinnerId: null, buzzerActive: true } }));
  },

  lockBuzzer: () => {
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'LOCK_BUZZER' } });
      set((s) => ({ state: { ...s.state, buzzerActive: false } }));
  },

  resetAllStatuses: () => {
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'RESET_ALL' } });
      set((s) => {
          const resetStudents = Object.entries(s.state.students).reduce((acc, [id, st]) => {
              acc[id] = { ...st, needsHelp: false, isFinished: false, handRaised: false };
              return acc;
          }, {} as any);
          return { state: { ...s.state, students: resetStudents, buzzerWinnerId: null, buzzerActive: false } };
      });
  },

  updateWallConfig: (config) => {
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'UPDATE_WALL', config } });
      set((s) => ({ state: { ...s.state, wallConfig: { ...s.state.wallConfig, ...config } } }));
  },
  
  removeStudent: (id) => {
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'REMOVE_STUDENT', id } });
      set((s) => {
          const { [id]: _, ...rest } = s.state.students;
          return { state: { ...s.state, students: rest } };
      });
  }
}));