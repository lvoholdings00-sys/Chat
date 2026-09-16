import React from 'react';
import { X, Download } from 'lucide-react';
import type { Attachment } from '../types';

interface LightboxModalProps {
  attachment: Attachment | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 right-0 flex items-center gap-3">
          <a
            href={attachment.url}
            download={attachment.name || 'attachment'}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Download"
          >
            <Download className="w-4 h-4" /> Download
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {attachment.type === 'image' && (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
          />
        )}

        {attachment.type === 'video' && (
          <video
            src={attachment.url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-white/10"
          />
        )}
      </div>
    </div>
  );
};
