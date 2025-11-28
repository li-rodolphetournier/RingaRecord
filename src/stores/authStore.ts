import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseAuthService } from '../services/supabase/auth.service';
import type { LoginCredentials, RegisterCredentials } from '../types/auth.types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: (partial: AuthState | Partial<AuthState>) => void) => ({
      isAuthenticated: false, // Sera mis à jour par onAuthStateChange
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          await supabaseAuthService.login(credentials);
          const session = await supabaseAuthService.getSession();
          set({ isAuthenticated: !!session, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur de connexion';
          set({ error: message, isLoading: false, isAuthenticated: false });
          throw error;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await supabaseAuthService.register(credentials);
          
          // Si pas de token, c'est que l'email de confirmation est requis
          if (!response.access_token) {
            set({ 
              error: 'Un email de confirmation a été envoyé. Veuillez vérifier votre boîte mail avant de vous connecter.', 
              isLoading: false, 
              isAuthenticated: false 
            });
            return; // Ne pas naviguer vers le dashboard
          }
          
          // Si on a un token, l'utilisateur est connecté
          const session = await supabaseAuthService.getSession();
          set({ isAuthenticated: !!session, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
          set({ error: message, isLoading: false, isAuthenticated: false });
          throw error;
        }
      },

      logout: async () => {
        await supabaseAuthService.logout();
        set({ isAuthenticated: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({ isAuthenticated: state.isAuthenticated }),
    },
  ),
);

