export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  roomId: string; // Mã phòng học
}

export interface WallConfig {
  isPublic: boolean;
  showNames: boolean;
  isLocked: boolean;
  allowedStudentIds: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: UserRole;
  text?: string;
  imageUrl?: string;
  timestamp: number;
}

export interface StudentStatus {
  id: string;
  name: string;
  group?: string;
  avatarSeed: string;
  needsHelp: boolean;
  needsHelpAt?: number;
  isFinished: boolean;
  isFinishedAt?: number;
  handRaised: boolean;
  handRaisedAt?: number;
  buzzerPressedAt?: number;
}

export interface ClassroomState {
  students: Record<string, StudentStatus>;
  messages: ChatMessage[];
  buzzerActive: boolean;
  buzzerWinnerId: string | null;
  wallConfig: WallConfig;
  teacherPresent: boolean; // Trạng thái: Giáo viên đã vào lớp chưa
}