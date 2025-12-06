import { memo, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { buttonVariants } from '../../utils/animations';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button = memo(({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-sm ' +
    'transition-all duration-150 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 ' +
      'dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700',
    secondary:
      'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 ' +
      'dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ' +
      'dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700',
  };

  return (
    <motion.button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      type={props.type || 'button'}
      onClick={props.onClick}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      aria-label={props['aria-label']}
      aria-disabled={props['aria-disabled']}
      title={props.title}
    >
      {isLoading ? 'Chargement...' : children}
    </motion.button>
  );
});

Button.displayName = 'Button';

