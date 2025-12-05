import { useCallback, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/**
 * Composant interne pour le prompt stylé
 */
interface PromptContentProps {
  message: string;
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  closeToast?: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
const PromptContent = ({ message, defaultValue, onConfirm, onCancel, closeToast }: PromptContentProps) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    closeToast?.();
    onConfirm(value.trim());
  };

  const handleCancel = () => {
    closeToast?.();
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="space-y-4 min-w-[300px] max-w-md">
      <div className="space-y-2">
        <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
          {message}
        </p>
      </div>
      <Input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full"
      />
      <div className="flex gap-3 pt-2">
        <Button
          variant="primary"
          className="flex-1 min-w-[120px]"
          onClick={handleSubmit}
        >
          Confirmer
        </Button>
        <Button
          variant="secondary"
          className="flex-1 min-w-[120px]"
          onClick={handleCancel}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
};

/**
 * Hook pour afficher des prompts stylés au lieu de window.prompt()
 */
export const useStyledPrompt = () => {
  const prompt = useCallback(
    (message: string, defaultValue: string = ''): Promise<string | null> => {
      return new Promise((resolve) => {
        toast.info(
          ({ closeToast }) => (
            <PromptContent
              message={message}
              defaultValue={defaultValue}
              onConfirm={(value) => {
                resolve(value || null);
              }}
              onCancel={() => {
                resolve(null);
              }}
              closeToast={closeToast}
            />
          ),
          {
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            position: 'top-center',
          },
        );
      });
    },
    [],
  );

  return { prompt };
};

