import { create } from 'zustand';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  contact_number: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  fetchUser: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('stella_auth_token') : null,
  user: null,
  login: (token, username) => {
    localStorage.setItem('stella_auth_token', token);
    set({ token, user: { id: '', username, email: '', contact_number: '' } });
    get().fetchUser();
  },
  logout: () => {
    localStorage.removeItem('stella_auth_token');
    set({ token: null, user: null });
  },
  fetchUser: async () => {
    const token = get().token;
    if (!token) return false;
    
    try {
      const res = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data });
        return true;
      } else {
        get().logout();
        return false;
      }
    } catch (err) {
      console.error("Auth fetch user failed:", err);
      return false;
    }
  }
}));
