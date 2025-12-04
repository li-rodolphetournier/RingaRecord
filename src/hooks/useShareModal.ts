import { useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import {
  getFacebookShareUrl,
  getTwitterShareUrl,
  getWhatsAppShareUrl,
  getLinkedInShareUrl,
  getEmailShareUrl,
  copyToClipboard,
  shareNative,
  type ShareOptions,
} from '../utils/share.utils';

export interface UseShareModalProps {
  shareUrl: string;
  title?: string;
  description?: string;
  onClose?: () => void;
}

export interface UseShareModalReturn {
  copied: boolean;
  handleShare: (platform: string) => Promise<void>;
  shareOptions: ShareOptions;
}

/**
 * Hook pour gérer la logique de partage dans ShareModal
 * @param props - Options de partage (URL, titre, description, callback de fermeture)
 * @returns État et handlers pour le modal de partage
 */
export const useShareModal = ({
  shareUrl,
  title,
  description,
  onClose,
}: UseShareModalProps): UseShareModalReturn => {
  const [copied, setCopied] = useState(false);

  const shareOptions: ShareOptions = {
    url: shareUrl,
    title: title || 'Sonnerie RingaRecord',
    description: description || 'Découvrez cette sonnerie créée avec RingaRecord!',
  };

  const handleShare = useCallback(
    async (platform: string): Promise<void> => {
      let platformUrl = '';

      switch (platform) {
        case 'facebook':
          platformUrl = getFacebookShareUrl(shareOptions);
          break;
        case 'twitter':
          platformUrl = getTwitterShareUrl(shareOptions);
          break;
        case 'whatsapp':
          platformUrl = getWhatsAppShareUrl(shareOptions);
          break;
        case 'linkedin':
          platformUrl = getLinkedInShareUrl(shareOptions);
          break;
        case 'email':
          platformUrl = getEmailShareUrl(shareOptions);
          window.location.href = platformUrl;
          return;
        case 'native': {
          const shared = await shareNative(shareOptions);
          if (shared && onClose) {
            onClose();
          }
          return;
        }
        case 'copy': {
          const success = await copyToClipboard(shareOptions.url);
          if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
          return;
        }
        default:
          return;
      }

      if (platformUrl) {
        window.open(platformUrl, '_blank', 'width=600,height=400');
      }
    },
    [shareOptions, onClose],
  );

  return {
    copied,
    handleShare,
    shareOptions,
  };
};

