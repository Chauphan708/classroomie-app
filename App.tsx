import React, { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { StudentView } from './components/StudentView';
import { TeacherView } from './components/TeacherView';
import { useClassroomStore } from './services/store';
import { UserRole, UserSession } from './types';

// Simple UUID generator for demo purposes
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const store = useClassroomStore();

  const handleJoin = (name: string, role: UserRole, group?: string) => {
    const id = generateId();
    const newSession = { id, name, role };
    setSession(newSession);
    
    if (role === UserRole.STUDENT && group) {
      store.joinClass(name, group, id);
    }
  };

  const handleLogout = () => {
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