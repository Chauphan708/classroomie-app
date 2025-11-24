import { useState, useEffect, useCallback } from 'react';
import { ClassroomState, StudentStatus, ChatMessage, WallConfig } from '../types';

const STORAGE_KEY = 'classroom_v1_state';

const INITIAL_STATE: ClassroomState = {
  students: {},
  messages: [],
  buzzerActive: true,
  buzzerWinnerId: null,
  wallConfig: {
    isPublic: true,
    showNames: true,
  }
};

const getStoredState = (): ClassroomState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Merge with defaults to handle schema updates
    return { ...INITIAL_STATE, ...parsed, wallConfig: { ...INITIAL_STATE.wallConfig, ...parsed.wallConfig } };
  }
  return INITIAL_STATE;
};

const setStoredState = (state: ClassroomState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('classroom-local-update'));
  } catch (e) {
    console.error("Storage limit reached or error", e);
    // In a real app, handle quota exceeded
  }
};

export const useClassroomStore = () => {
  const [state, setState] = useState<ClassroomState>(getStoredState());

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setState(JSON.parse(e.newValue));
      }
    };

    const handleLocalUpdate = () => {
       setState(getStoredState());
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('classroom-local-update', handleLocalUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('classroom-local-update', handleLocalUpdate);
    };
  }, []);

  const joinClass = useCallback((name: string, group: string, id: string) => {
    const current = getStoredState();
    if (!current.students[id]) {
      const newStudent: StudentStatus = {
        id,
        name,
        group,
        needsHelp: false,
        isFinished: false,
        handRaised: false,
        avatarSeed: Math.floor(Math.random() * 1000),
      };
      setStoredState({
        ...current,
        students: { ...current.students, [id]: newStudent }
      });
    }
  }, []);

  const updateStudentStatus = useCallback((id: string, updates: Partial<StudentStatus>) => {
    const current = getStoredState();
    const student = current.students[id];
    
    if (student) {
      const now = Date.now();
      const updatedStudent = { ...student, ...updates };

      // Auto-timestamp logic
      if (updates.needsHelp === true && !student.needsHelp) updatedStudent.needsHelpAt = now;
      if (updates.needsHelp === false) updatedStudent.needsHelpAt = undefined;

      if (updates.isFinished === true && !student.isFinished) updatedStudent.isFinishedAt = now;
      if (updates.isFinished === false) updatedStudent.isFinishedAt = undefined;

      if (updates.handRaised === true && !student.handRaised) updatedStudent.handRaisedAt = now;
      if (updates.handRaised === false) updatedStudent.handRaisedAt = undefined;
      
      let buzzerWinnerId = current.buzzerWinnerId;
      if (updates.buzzerPressedAt && current.buzzerActive && !current.buzzerWinnerId) {
        buzzerWinnerId = id;
      }

      setStoredState({
        ...current,
        buzzerWinnerId,
        students: { ...current.students, [id]: updatedStudent }
      });
    }
  }, []);

  const sendMessage = useCallback((senderId: string, senderName: string, text?: string, imageUrl?: string) => {
    const current = getStoredState();
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId,
      senderName,
      text,
      imageUrl,
      timestamp: Date.now(),
      type: imageUrl ? 'image' : 'text'
    };
    
    // Keep last 50 messages to save space
    const updatedMessages = [...current.messages, newMessage].slice(-50);

    setStoredState({
      ...current,
      messages: updatedMessages
    });
  }, []);

  const updateWallConfig = useCallback((config: Partial<WallConfig>) => {
    const current = getStoredState();
    setStoredState({
      ...current,
      wallConfig: { ...current.wallConfig, ...config }
    });
  }, []);

  const resetBuzzer = useCallback(() => {
    const current = getStoredState();
    const updatedStudents = { ...current.students };
    Object.keys(updatedStudents).forEach(key => {
      updatedStudents[key] = { ...updatedStudents[key], buzzerPressedAt: undefined };
    });

    setStoredState({
      ...current,
      students: updatedStudents,
      buzzerWinnerId: null,
      buzzerActive: true,
    });
  }, []);

  const resetAllStatuses = useCallback(() => {
     const current = getStoredState();
     const updatedStudents = { ...current.students };
     Object.keys(updatedStudents).forEach(key => {
       updatedStudents[key] = { 
         ...updatedStudents[key], 
         needsHelp: false, needsHelpAt: undefined,
         isFinished: false, isFinishedAt: undefined,
         handRaised: false, handRaisedAt: undefined,
         buzzerPressedAt: undefined
       };
     });
     
     setStoredState({
       ...current,
       students: updatedStudents,
       buzzerWinnerId: null,
       buzzerActive: true
     });
  }, []);

  const removeStudent = useCallback((id: string) => {
    const current = getStoredState();
    const { [id]: removed, ...remaining } = current.students;
    setStoredState({
      ...current,
      students: remaining
    });
  }, []);

  return {
    state,
    joinClass,
    updateStudentStatus,
    sendMessage,
    updateWallConfig,
    resetBuzzer,
    resetAllStatuses,
    removeStudent
  };
};