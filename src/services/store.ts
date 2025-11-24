import { create } from 'zustand';
import { supabase } from './supabase';
import { ClassroomState, StudentStatus, WallConfig, UserRole } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ClassroomStore {
  state: ClassroomState;
  
  // Actions logic (Cập nhật UI + Gửi lên Server)
  connectToRoom: (user: { id: string; name: string; role: UserRole; group?: string }) => void;
  updateStudentStatus: (id: string, updates: Partial<StudentStatus>) => void;
  removeStudent: (id: string) => void;
  sendMessage: (senderId: string, senderName: string, text?: string, imageUrl?: string) => void;
  updateWallConfig: (config: Partial<WallConfig>) => void;
  resetBuzzer: () => void;
  resetAllStatuses: () => void;
  
  // Internal
  channel: RealtimeChannel | null;
}

export const useClassroomStore = create<ClassroomStore>((set, get) => ({
  state: {
    students: {},
    messages: [],
    buzzerActive: true,
    buzzerWinnerId: null,
    wallConfig: { isPublic: true, showNames: true },
  },
  channel: null,

  connectToRoom: (user) => {
    // 1. Ngắt kết nối cũ nếu có
    if (get().channel) get().channel?.unsubscribe();

    // 2. Tạo kênh kết nối mới 'classroom-room-1'
    const channel = supabase.channel('classroom-room-1', {
      config: {
        presence: {
          key: user.id, // Định danh người dùng
        },
      },
    });

    // 3. Lắng nghe sự kiện "Điểm danh" (Presence Sync)
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const studentsMap: Record<string, StudentStatus> = {};

        // Gom dữ liệu từ tất cả mọi người đang online
        Object.values(newState).forEach((presences: any) => {
          const userData = presences[0]; // Lấy dữ liệu mới nhất của user đó
          if (userData && userData.role === UserRole.STUDENT) {
            studentsMap[userData.id] = userData as StudentStatus;
          }
        });

        // Cập nhật danh sách học sinh vào Store
        set((s) => ({ state: { ...s.state, students: studentsMap } }));
      })
      
      // 4. Lắng nghe lệnh điều khiển từ Giáo viên (Broadcast)
      .on('broadcast', { event: 'control' }, ({ payload }) => {
         if (payload.type === 'RESET_BUZZER') {
             set((s) => ({ state: { ...s.state, buzzerWinnerId: null, buzzerActive: true } }));
         }
         if (payload.type === 'RESET_ALL') {
             // Logic reset cục bộ để phản hồi nhanh
             const resetStudents = Object.entries(get().state.students).reduce((acc, [id, st]) => {
                acc[id] = { ...st, needsHelp: false, isFinished: false, handRaised: false };
                return acc;
             }, {} as any);
             set((s) => ({ state: { ...s.state, students: resetStudents, buzzerWinnerId: null } }));
         }
         if (payload.type === 'UPDATE_WALL') {
             set((s) => ({ state: { ...s.state, wallConfig: payload.config } }));
         }
         if (payload.type === 'REMOVE_STUDENT') {
             // Nếu mình là học sinh bị xóa -> reload trang hoặc logout (xử lý sau)
             // Ở đây chỉ cập nhật UI tạm thời
             const { [payload.id]: _, ...rest } = get().state.students;
             set((s) => ({ state: { ...s.state, students: rest } }));
         }
      })

      // 5. Lắng nghe tin nhắn chat
      .on('broadcast', { event: 'message' }, ({ payload }) => {
          set((s) => ({
              state: {
                  ...s.state,
                  messages: [...s.state.messages, payload]
              }
          }));
      })

      // 6. Lắng nghe sự kiện Bấm Chuông (Ưu tiên tốc độ)
      .on('broadcast', { event: 'buzzer' }, ({ payload }) => {
          const currentWinner = get().state.buzzerWinnerId;
          // Chỉ nhận người đầu tiên nếu chưa có ai thắng
          if (!currentWinner && get().state.buzzerActive) {
              set((s) => ({ state: { ...s.state, buzzerWinnerId: payload.id } }));
          }
      });

    // 7. Kích hoạt kết nối
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Nếu là Học sinh -> Gửi thông tin ban đầu của mình lên mạng
        if (user.role === UserRole.STUDENT) {
            const initialStatus: StudentStatus = {
                id: user.id,
                name: user.name,
                role: user.role, // Thêm role vào để lọc
                group: user.group,
                avatarSeed: user.id,
                needsHelp: false,
                isFinished: false,
                handRaised: false,
            } as any;
            await channel.track(initialStatus);
        }
      }
    });

    set({ channel });
  },

  updateStudentStatus: async (id, updates) => {
    // 1. Cập nhật UI cục bộ cho mượt
    set((s) => {
       const st = s.state.students[id];
       if(!st) return s;
       
       // Logic timestamp
       const newSt = { ...st, ...updates };
       if (updates.needsHelp && !st.needsHelp) newSt.needsHelpAt = Date.now();
       if (updates.isFinished && !st.isFinished) newSt.isFinishedAt = Date.now();
       if (updates.handRaised && !st.handRaised) newSt.handRaisedAt = Date.now();

       return { state: { ...s.state, students: { ...s.state.students, [id]: newSt } } };
    });

    // 2. Gửi tín hiệu Bấm chuông (Broadcast) để đảm bảo tốc độ cao
    const store = get();
    if (updates.buzzerPressedAt && store.channel) {
        store.channel.send({
            type: 'broadcast',
            event: 'buzzer',
            payload: { id }
        });
    }

    // 3. Đồng bộ trạng thái mới lên Presence (để Giáo viên thấy)
    if (store.channel) {
        // Lấy state mới nhất vừa cập nhật ở bước 1
        const currentStudent = get().state.students[id];
        if (currentStudent) {
            // Gửi dữ liệu cập nhật lên mạng
            await store.channel.track(currentStudent);
        }
    }
  },

  sendMessage: (senderId, senderName, text, imageUrl) => {
      const msg = {
          id: Math.random().toString(36).substr(2, 9),
          senderId,
          senderName,
          text,
          imageUrl,
          timestamp: Date.now(),
      };

      // Gửi cho mọi người
      get().channel?.send({
          type: 'broadcast',
          event: 'message',
          payload: msg
      });

      // Hiện luôn ở máy mình
      set((s) => ({ state: { ...s.state, messages: [...s.state.messages, msg] } }));
  },

  // --- Các hành động của Giáo viên (Broadcast) ---

  resetBuzzer: () => {
      set((s) => ({ state: { ...s.state, buzzerWinnerId: null } }));
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'RESET_BUZZER' } });
  },

  resetAllStatuses: () => {
      // Gửi lệnh reset cho tất cả máy con
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'RESET_ALL' } });
      
      // Reset máy mình
      set((s) => {
          const resetStudents = Object.entries(s.state.students).reduce((acc, [id, st]) => {
              acc[id] = { ...st, needsHelp: false, isFinished: false, handRaised: false };
              return acc;
          }, {} as any);
          return { state: { ...s.state, students: resetStudents, buzzerWinnerId: null } };
      });
  },

  updateWallConfig: (config) => {
      set((s) => ({ state: { ...s.state, wallConfig: { ...s.state.wallConfig, ...config } } }));
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'UPDATE_WALL', config } });
  },

  removeStudent: (id) => {
      set((s) => {
          const { [id]: _, ...rest } = s.state.students;
          return { state: { ...s.state, students: rest } };
      });
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'REMOVE_STUDENT', id } });
  }
}));