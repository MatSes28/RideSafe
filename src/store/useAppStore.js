import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAppStore = create((set) => ({
  currentUser: null,
  userRole: null, // 'customer' or 'driver'
  
  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ 
          currentUser: session.user, 
          userRole: session.user.user_metadata?.role || null 
        });
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ 
          currentUser: session.user, 
          userRole: session.user.user_metadata?.role || null 
        });
      } else {
        set({ currentUser: null, userRole: null });
      }
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, userRole: null });
  },
}));
