import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './stores/authStore';
import { supabaseAuthService } from './services/supabase/auth.service';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useThemeStore } from './stores/themeStore';

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Record = lazy(() => import('./pages/Record').then((m) => ({ default: m.Record })));
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })));

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Vérifier la session au chargement
    supabaseAuthService.getSession().then((session) => {
      if (isMounted) {
        useAuthStore.setState({ isAuthenticated: !!session });
        setLoading(false);
      }
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabaseAuthService.onAuthStateChange((_event, session) => {
      if (isMounted) {
        useAuthStore.setState({ isAuthenticated: !!session });
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      isMounted = false;
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  // Initialiser le thème au chargement de l'application
  // Le store s'initialise automatiquement et applique le thème
  useThemeStore();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/record"
              element={
                <PrivateRoute>
                  <Record />
                </PrivateRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <PrivateRoute>
                  <Favorites />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
        <ToastContainer position="top-center" autoClose={3500} hideProgressBar theme="colored" />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
