import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRingtoneStore } from '../stores/ringtoneStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AudioPlayer } from '../components/AudioPlayer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Ringtone } from '../types/ringtone.types';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const { ringtones, fetchAll, isLoading } = useRingtoneStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [isAuthenticated, navigate, fetchAll]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDuration = (seconds: number) => {
    return `${seconds}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (ringtone: Ringtone) => {
    try {
      // Méthode optimisée pour mobile : télécharger via fetch et créer un blob
      const response = await fetch(ringtone.fileUrl);
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du fichier');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ringtone.title}.${ringtone.format}`;
      link.style.display = 'none';
      
      // Ajouter au DOM, cliquer, puis retirer
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Nettoyer l'URL du blob après un délai
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      // Fallback: ouvrir dans un nouvel onglet (pour mobile)
      window.open(ringtone.fileUrl, '_blank');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            RingaRecord
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/record')} variant="primary">
              Nouvelle sonnerie
            </Button>
            <Button onClick={handleLogout} variant="secondary">
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          Mes sonneries
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
          </div>
        ) : ringtones.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucune sonnerie pour le moment
              </p>
              <Button onClick={() => navigate('/record')} variant="primary">
                Créer ma première sonnerie
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ringtones.map((ringtone) => (
              <Card key={ringtone.id} className="hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                  {ringtone.title}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <p>Format: {ringtone.format.toUpperCase()}</p>
                  <p>Durée: {formatDuration(ringtone.duration)}</p>
                  <p>Taille: {formatSize(ringtone.sizeBytes)}</p>
                  <p>
                    Créé le:{' '}
                    {format(new Date(ringtone.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>

                {/* Player audio */}
                <div className="mb-4">
                  <AudioPlayer src={ringtone.fileUrl} title="Écouter" />
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleDownload(ringtone)}
                    variant="primary"
                    className="flex-1 min-h-[44px]"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Enregistrer sur téléphone
                  </Button>
                  <Button
                    onClick={() => navigate(`/ringtones/${ringtone.id}`)}
                    variant="secondary"
                    className="flex-1 min-h-[44px]"
                  >
                    Détails
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

