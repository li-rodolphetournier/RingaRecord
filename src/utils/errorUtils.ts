import { toast } from 'react-toastify';

/**
 * Messages d'erreur user-friendly pour les erreurs courantes
 */
const ERROR_MESSAGES: Record<string, string> = {
  'NetworkError': 'Erreur de connexion. Vérifiez votre connexion internet.',
  'AbortError': 'Opération annulée.',
  'NotAllowedError': 'Permission refusée. Veuillez autoriser l\'accès au microphone.',
  'NotFoundError': 'Ressource non trouvée.',
  'QuotaExceededError': 'Espace de stockage insuffisant.',
  'UnknownError': 'Une erreur inattendue s\'est produite.',
};

/**
 * Extrait un message d'erreur user-friendly à partir d'une erreur
 */
function getUserFriendlyMessage(error: unknown, context?: string): string {
  if (error instanceof Error) {
    // Vérifier si c'est une erreur réseau
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return ERROR_MESSAGES.NetworkError;
    }

    // Vérifier si c'est une erreur de permission
    if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
      return ERROR_MESSAGES.NotAllowedError;
    }

    // Utiliser le message de l'erreur s'il est disponible
    if (error.message) {
      return error.message;
    }

    // Utiliser le nom de l'erreur comme fallback
    if (ERROR_MESSAGES[error.name]) {
      return ERROR_MESSAGES[error.name];
    }
  }

  // Fallback générique
  return context
    ? `Erreur lors de ${context}. Veuillez réessayer.`
    : ERROR_MESSAGES.UnknownError;
}

/**
 * Gère une erreur de manière standardisée (pour utilisation dans les stores)
 * @param error - L'erreur à gérer
 * @param context - Contexte de l'erreur (optionnel, pour logging)
 * @param showToast - Afficher un toast (défaut: true)
 */
export function handleError(error: unknown, context?: string, showToast: boolean = true): void {
  // Log dans la console pour le debugging
  if (context) {
    console.error(`[${context}]`, error);
  } else {
    console.error('Erreur:', error);
  }

  // Afficher un toast user-friendly
  if (showToast) {
    const message = getUserFriendlyMessage(error, context);
    toast.error(message);
  }

  // TODO: Optionnellement, envoyer à un service de monitoring (Sentry, LogRocket, etc.)
  // if (import.meta.env.PROD) {
  //   captureException(error, { tags: { context } });
  // }
}

/**
 * Affiche un message d'erreur personnalisé (pour utilisation dans les stores)
 */
export function showError(message: string): void {
  toast.error(message);
  console.error(message);
}

/**
 * Affiche un message d'avertissement (pour utilisation dans les stores)
 */
export function showWarning(message: string): void {
  toast.warning(message);
  console.warn(message);
}

/**
 * Affiche un message d'information (pour utilisation dans les stores)
 */
export function showInfo(message: string): void {
  toast.info(message);
}

/**
 * Affiche un message de succès (pour utilisation dans les stores)
 */
export function showSuccess(message: string): void {
  toast.success(message);
}

