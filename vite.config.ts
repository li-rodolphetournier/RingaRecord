import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(() => {
  // Déterminer le base path selon l'environnement
  // Pour Capacitor (build mobile), utiliser './'
  // Pour déploiement web (Vercel, etc.), utiliser '/'
  const isCapacitorBuild = process.env.CAPACITOR === 'true';
  const base = isCapacitorBuild ? './' : '/';

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Regroupe React et le runtime dans un chunk séparé
            react: ['react', 'react-dom', 'react-router-dom'],
            // Regroupe Supabase / réseau
            supabase: ['@supabase/supabase-js'],
            // Regroupe les libs d'UI / utilitaires éventuelles
            vendor: ['react-toastify', 'date-fns'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
    // Configuration du base path : '/' pour web, './' pour Capacitor
    base,
    server: {
      host: '0.0.0.0', // Permet l'accès depuis l'émulateur Android
      port: 5173,
    },
  };
});
