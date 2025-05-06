import { User } from 'firebase/auth';
import { DocumentData } from 'firebase/firestore';

export interface UserData extends DocumentData {
  email: string;
  username: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
} 