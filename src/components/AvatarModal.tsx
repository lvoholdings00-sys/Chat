import React, { useState } from 'react';
import { X, Upload, Check } from 'lucide-react';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  onSaveAvatar: (newAvatar: string) => Promise<void>;
}

const PRESETS = [
  '👑', '💎', '⚡', '🛡️', '🎯', '🚀',
  '🛰️', '🦅', '🐺', '🦁', '⚔️', '🌐',
  '🌌', '🔮', '🗝️', '👁️', '🔥', '🦾'
];

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onSaveAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [uploadPreview, setUploadPreview] = useState<string | null>(
    currentAvatar.startsWith('data:') ? currentAvatar : null
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Original image is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Resize onto a 160x160 canvas to keep under 350KB
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Failed to process image');
          return;
        }

        // Draw cropped center square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 160, 160);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setUploadPreview(dataUrl);
        setSelectedAvatar(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSaveAvatar(selectedAvatar);
      onClose();
    } catch (err) {
      setError('Failed to update avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="font-['Fraunces'] text-xl font-semibold text-white tracking-wide">Your Identity</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Visible to other members across the LVO command line.</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl my-4 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tactical Symbols
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Upload Photo
          </button>
        </div>

        {/* Content */}
        {activeTab === 'presets' ? (
          <div className="grid grid-cols-6 gap-2.5 my-4 max-h-56 overflow-y-auto p-1">
            {PRESETS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setSelectedAvatar(icon)}
                className={`relative aspect-square flex items-center justify-center text-2xl rounded-xl border transition-all ${
                  selectedAvatar === icon
                    ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-md shadow-indigo-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                {icon}
                {selectedAvatar === icon && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[9px] text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="my-4 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{selectedAvatar.startsWith('data:') ? '🖼️' : selectedAvatar}</span>
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Select File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                  JPG or PNG under 350KB. Automatically cropped and scaled to square.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
