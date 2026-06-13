import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type User = {
    id: number;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
    createdAt: string;
    updatedAt: string;
    referralCode?: string | null;
};

type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User) => void;
    clearUser: () => void;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user: User) => set({ user, isAuthenticated: true }),
            clearUser: () => {
                localStorage.removeItem('token');
                set({ user: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        },
    ),
);
