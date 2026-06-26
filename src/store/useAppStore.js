import { create } from 'zustand';

export const useAppStore = create((set) => ({
  currentUser: null,
  userRole: null, // 'customer' or 'driver'
  login: (userData, role) => set({ currentUser: userData, userRole: role }),
  logout: () => set({ currentUser: null, userRole: null }),
}));
