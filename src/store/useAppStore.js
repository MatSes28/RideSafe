import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAppStore = create((set) => ({
  currentUser: null,
  userRole: null,
  walletBalance: 0,
  isApproved: false,
  liteMode: false,
  language: 'en', // 'en' | 'tl' | 'ceb'
  isInitialized: false,
  
  setLiteMode: (val) => set({ liteMode: val }),
  setLanguage: (val) => set({ language: val }),
  
  initialize: () => {
    const fetchProfile = async (user) => {
      if (!user) {
        set({ isInitialized: true });
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      set({ 
        currentUser: user, 
        userRole: user.user_metadata?.role || null,
        walletBalance: data?.wallet_balance || 0,
        isApproved: data?.is_approved || false,
        isInitialized: true
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        set({ currentUser: null, userRole: null, walletBalance: 0, isApproved: false, isInitialized: true });
      }
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, userRole: null, isInitialized: true });
  },
}));
