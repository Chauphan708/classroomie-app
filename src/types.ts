export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export interface StudentStatus {
  id: string;
  name: string;
  group: string; // Added group field (Tổ)
  needsHelp: boolean;
  needsHelpAt?: number;
  isFinished: boolean;
  isFinishedAt?: number;
  handRaised: boolean;
  handRaisedAt?: number;
  buzzerPressedAt?: number;
  avatarSeed: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  timestamp: number;
  type: 'text' | 'image' | 'system'; // 'system' for status updates logs
}

export interface WallConfig {
  isPublic: boolean; // false: Teacher only, true: All students see
  showNames: boolean; // false: Anonymous to other students
}

export interface ClassroomState {
  students: Record<string, StudentStatus>;
  messages: ChatMessage[];
  buzzerActive: boolean;
  buzzerWinnerId: string | null;
  wallConfig: WallConfig;
}

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
}