import { create } from 'zustand';
import { supabase } from './supabase';
import { ClassroomState, StudentStatus, WallConfig, UserRole } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ClassroomStore {
  state: ClassroomState;
  channel: RealtimeChannel | null;
  
  // Actions
  connectToRoom: (user: { id: string; name: string; role: UserRole; group?: string }, roomId: string) => void;
  updateStudentStatus: (id: string, updates: Partial<StudentStatus>) => void;
  removeStudent: (id: string) => void;
  sendMessage: (senderId: string, senderName: string, role: UserRole, text?: string, imageUrl?: string) => void;
  updateWallConfig: (config: Partial<WallConfig>) => void;
  resetBuzzer: () => void;
  lockBuzzer: () => void;
  resetAllStatuses: () => void;
}

export const useClassroomStore = create<ClassroomStore>((set, get) => ({
  state: {
    students: {},
    messages: [],
    buzzerActive: false,
    buzzerWinnerId: null,
    wallConfig: { 
        isPublic: true, 
        showNames: true, 
        isLocked: false, 
        allowedStudentIds: [] 
    },
    teacherPresent: false,
  },
  channel: null,

  connectToRoom: (user, roomId) => {
    // 1. Ngắt kết nối cũ
    if (get().channel) supabase.removeChannel(get().channel as RealtimeChannel);

    // 2. Tạo kênh riêng theo Mã Phòng (roomId)
    // Chuyển mã về chữ thường, bỏ khoảng trắng để đồng bộ (VD: "5A2 " -> "5a2")
    const cleanRoomId = roomId.trim().toLowerCase();
    const channel = supabase.channel(`classroom-room-${cleanRoomId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const studentsMap: Record<string, StudentStatus> = {};
        let isTeacherHere = false;

        console.log(`📡 Phòng [${cleanRoomId}] - Dữ liệu:`, newState);

        Object.values(newState).forEach((presences: any) => {
          const userData = presences[0];
          if (!userData) return;

          // Kiểm tra xem có Giáo viên trong phòng không
          if (userData.role === UserRole.TEACHER) {
            isTeacherHere = true;
          }
          // Lấy danh sách học sinh (có ID và Tên)
          else if (userData.id && userData.name) {
            studentsMap[userData.id] = userData as StudentStatus;
          }
        });

        // Cập nhật State: Danh sách HS và Trạng thái Giáo viên
        set((s) => ({ 
            state: { 
                ...s.state, 
                students: studentsMap,
                teacherPresent: isTeacherHere
            } 
        }));
      })
      // Các sự kiện Broadcast (Giữ nguyên logic cũ)
      .on('broadcast', { event: 'control' }, ({ payload }) => {
         if (payload.type === 'RESET_BUZZER') set((s) => ({ state: { ...s.state, buzzerWinnerId: null, buzzerActive: true } }));
         if (payload.type === 'LOCK_BUZZER') set((s) => ({ state: { ...s.state, buzzerActive: false } }));
         if (payload.type === 'RESET_ALL') {
             const resetStudents = Object.entries(get().state.students).reduce((acc, [id, st]) => {
                acc[id] = { ...st, needsHelp: false, isFinished: false, handRaised: false };
                return acc;
             }, {} as any);
             set((s) => ({ state: { ...s.state, students: resetStudents, buzzerWinnerId: null, buzzerActive: false } }));
         }
         if (payload.type === 'UPDATE_WALL') set((s) => ({ state: { ...s.state, wallConfig: payload.config } }));
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
          if (!currentState.buzzerWinnerId && currentState.buzzerActive) {
              set((s) => ({ state: { ...s.state, buzzerWinnerId: payload.id, buzzerActive: false } }));
          }
      });

    // 3. Kích hoạt và Gửi thông tin định danh
    channel.subscribe(async (status) => {
      console.log(`🔌 Kết nối phòng [${cleanRoomId}]:`, status);
      
      if (status === 'SUBSCRIBED') {
        const myInfo = {
            id: user.id,
            name: user.name,
            role: user.role,
            group: user.group,
            avatarSeed: user.id,
            // Các trạng thái mặc định
            needsHelp: false, isFinished: false, handRaised: false
        };
        await channel.track(myInfo);
      }
    });

    set({ channel });
  },

  updateStudentStatus: async (id, updates) => {
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
    if (updates.buzzerPressedAt && store.state.buzzerActive) {
        store.channel?.send({ type: 'broadcast', event: 'buzzer', payload: { id } });
    }
    if (store.channel) {
        const currentStudent = get().state.students[id];
        if (currentStudent) await store.channel.track(currentStudent);
    }
  },

  sendMessage: (senderId, senderName, role, text, imageUrl) => {
      const msg = { id: Math.random().toString(36).substr(2, 9), senderId, senderName, role, text, imageUrl, timestamp: Date.now() };
      get().channel?.send({ type: 'broadcast', event: 'message', payload: msg });
      set((s) => ({ state: { ...s.state, messages: [...s.state.messages, msg] } }));
  },

  resetBuzzer: () => { get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'RESET_BUZZER' } }); set((s) => ({ state: { ...s.state, buzzerWinnerId: null, buzzerActive: true } })); },
  lockBuzzer: () => { get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'LOCK_BUZZER' } }); set((s) => ({ state: { ...s.state, buzzerActive: false } })); },
  resetAllStatuses: () => { get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'RESET_ALL' } }); set((s) => { const resetStudents = Object.entries(s.state.students).reduce((acc, [id, st]) => { acc[id] = { ...st, needsHelp: false, isFinished: false, handRaised: false }; return acc; }, {} as any); return { state: { ...s.state, students: resetStudents, buzzerWinnerId: null, buzzerActive: false } }; }); },
  
  updateWallConfig: (config) => {
      get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'UPDATE_WALL', config } });
      set((s) => ({ state: { ...s.state, wallConfig: { ...s.state.wallConfig, ...config } } }));
  },
  
  removeStudent: (id) => { get().channel?.send({ type: 'broadcast', event: 'control', payload: { type: 'REMOVE_STUDENT', id } }); set((s) => { const { [id]: _, ...rest } = s.state.students; return { state: { ...s.state, students: rest } }; }); }
}));