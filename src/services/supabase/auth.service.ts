import { supabase } from './client';
import type { LoginCredentials, RegisterCredentials, AuthResponse } from '../../types/auth.types';

export const supabaseAuthService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error('Login failed');
    }

    return {
      access_token: data.session.access_token,
    };
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      console.error('Supabase signUp error:', error);
      throw new Error(error.message);
    }

    console.log('SignUp response:', { user: data.user, session: data.session });

    // Si pas de session, c'est que l'email de confirmation est requis
    // On attend un peu et on vérifie à nouveau (pour le cas où la confirmation est désactivée)
    if (!data.session) {
      console.log('No session after signUp, waiting and checking again...');
      // Attendre 1 seconde et vérifier à nouveau la session
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check after wait:', { session: sessionData?.session, error: sessionError });
      
      if (sessionData?.session) {
        return {
          access_token: sessionData.session.access_token,
        };
      }
      
      // Si toujours pas de session, l'inscription a réussi mais l'email doit être confirmé
      // On retourne quand même un succès (l'utilisateur devra confirmer son email)
      // Ne pas lancer d'erreur, juste retourner un token vide
      console.log('No session available, email confirmation required');
      return {
        access_token: '', // Pas de token tant que l'email n'est pas confirmé
      };
    }

    return {
      access_token: data.session.access_token,
    };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  isAuthenticated(): boolean {
    // Vérifier si une session existe
    const session = supabase.auth.getSession();
    return !!session;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};

