import { forwardRef } from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Composant Switch réutilisable pour activer/désactiver des options
 * Accessible et mobile-friendly (taille minimale 44x44px)
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, disabled = false, label, className = '', 'aria-label': ariaLabel }, ref) => {
    const handleClick = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!disabled) {
          onChange(!checked);
        }
      }
    };

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {label && (
          <label
            htmlFor={`switch-${label.replace(/\s+/g, '-')}`}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {label}
          </label>
        )}
        <button
          ref={ref}
          id={label ? `switch-${label.replace(/\s+/g, '-')}` : undefined}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={ariaLabel || label || 'Toggle switch'}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
            disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation
            ${checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
            ${disabled ? '' : 'cursor-pointer hover:opacity-90 active:opacity-75'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
              ${checked ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    );
  },
);

Switch.displayName = 'Switch';

