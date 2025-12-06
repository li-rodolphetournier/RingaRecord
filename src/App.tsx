import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full"
      >
        <Routes location={location}>
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
      </motion.div>
    </AnimatePresence>
  );
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
          <AnimatedRoutes />
        </Suspense>
        <ToastContainer position="top-center" autoClose={3500} hideProgressBar theme="colored" />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
