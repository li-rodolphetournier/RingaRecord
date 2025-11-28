import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Log pour debug
console.log('API URL:', API_URL);

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token JWT
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: unknown) => {
        return Promise.reject(error);
      },
    );

    // Intercepteur pour gérer les erreurs
    this.client.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (error && typeof error === 'object') {
          // Erreur réseau (backend non accessible)
          if ('code' in error && error.code === 'ERR_NETWORK') {
            console.error('❌ Erreur réseau : Le backend n\'est pas accessible à', API_URL);
            console.error('💡 Vérifie que le backend est démarré : cd server/api && npm run start:dev');
            return Promise.reject(new Error('Impossible de se connecter au serveur. Vérifie que le backend est démarré.'));
          }
          
          // Erreur HTTP
          if ('response' in error) {
            const axiosError = error as { response?: { status?: number; data?: unknown } };
            if (axiosError.response?.status === 401) {
              // Token expiré ou invalide
              localStorage.removeItem('access_token');
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      },
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;

