import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabaseAuthService } from '../services/supabase/auth.service';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { scrollRevealVariants } from '../utils/animations';

export const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const { showError, showSuccess } = useErrorHandler();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (password !== confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await register({ email, password });
      // Ne naviguer que si l'utilisateur est authentifié (pas de confirmation email requise)
      const session = await supabaseAuthService.getSession();
      if (session) {
        showSuccess('Inscription réussie !');
        setTimeout(() => navigate('/dashboard'), 800);
      }
      // Sinon, le message d'erreur du store indiquera qu'il faut confirmer l'email
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <motion.div
        className="absolute top-4 right-4"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ThemeToggle />
      </motion.div>
      <motion.div
        variants={scrollRevealVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Card className="w-full">
          <motion.h1
            className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Inscription
          </motion.h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          
          <Input
            type="password"
            label="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />

          <Input
            type="password"
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            error={password && confirmPassword && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
            S'inscrire
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
        </Card>
      </motion.div>
    </div>
  );
};

