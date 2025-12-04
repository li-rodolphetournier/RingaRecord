import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';

/**
 * Hook pour afficher des confirmations stylées au lieu de window.confirm()
 */
export const useStyledConfirm = () => {
  const confirm = useCallback(
    (message: string, details?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        toast.info(
          ({ closeToast }) => (
            <div className="styled-confirm-toast space-y-4">
              <div className="space-y-2">
                <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {message}
                </p>
                {details && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {details}
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button
                  variant="danger"
                  className="flex-1 min-w-0"
                  onClick={() => {
                    closeToast?.();
                    resolve(true);
                  }}
                >
                  Confirmer
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 min-w-0"
                  onClick={() => {
                    closeToast?.();
                    resolve(false);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ),
          {
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            position: 'top-center',
            className: 'styled-confirm-toast-container',
          },
        );
      });
    },
    [],
  );

  return { confirm };
};

