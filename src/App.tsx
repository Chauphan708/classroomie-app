import React, { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { StudentView } from './components/StudentView';
import { TeacherView } from './components/TeacherView';
import { useClassroomStore } from './services/store';
import { UserRole, UserSession } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const store = useClassroomStore();

  const handleJoin = (name: string, role: UserRole, roomId: string, group?: string) => {
    const id = generateId();
    // Lưu roomId vào session để dùng về sau
    const newSession = { id, name, role, roomId }; 
    setSession(newSession);
    
    // Gọi hàm connectToRoom với đầy đủ 2 tham số: user + roomId
    store.connectToRoom({ 
      id, 
      name, 
      role, 
      group: role === UserRole.STUDENT ? group : undefined 
    }, roomId);
  };

  const handleLogout = () => {
    if (store.channel) {
        store.channel.unsubscribe();
    }
    setSession(null);
  };

  if (!session) {
    return <WelcomeScreen onJoin={handleJoin} />;
  }

  if (session.role === UserRole.TEACHER) {
    return <TeacherView store={store} onLogout={handleLogout} />;
  }

  return <StudentView session={session} store={store} onLogout={handleLogout} />;
}