import { memo } from 'react';
// import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  onClick?: () => void;
  showLink?: boolean;
  height?: string;
}

/**
 * Composant Logo pour RingaRecord
 * Affiche le logo de l'application avec support pour navigation
 */
export const Logo = memo(({ 
  className = '', 
  onClick, 
  showLink = true,
  // height = 'h-10'
}: LogoProps) => {
  // const [hasError, setHasError] = useState(false);
  // const [imgLoaded, setImgLoaded] = useState(false);
  
  // Le logo doit être placé dans le dossier public/
  // const logoSrc = '/logo.png';

  const logoContent = (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      style={{ backgroundColor: 'transparent' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {/* {!hasError && (
        <img
          src={logoSrc}
          alt=""
          className={`${height} w-auto object-contain ${!imgLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          style={{ 
            backgroundColor: 'transparent',
            background: 'transparent',
            mixBlendMode: 'normal'
          }}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            console.warn('Impossible de charger le logo:', logoSrc);
            setHasError(true);
          }}
        />
      )} */}
      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        RingaRecord
      </span>
    </motion.div>
  );

  if (showLink && !onClick) {
    return (
      <Link 
        to="/dashboard" 
        className="flex items-center bg-transparent" 
        style={{ backgroundColor: 'transparent' }}
        aria-label="Retour à l'accueil RingaRecord"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
});

Logo.displayName = 'Logo';

