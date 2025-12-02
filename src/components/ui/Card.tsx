import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div
      className={`bg-white/80 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-none p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
};

