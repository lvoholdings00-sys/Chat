import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface GifModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

// Curated high quality communication GIFs for instant responsiveness
const CURATED_GIFS = [
  { id: '1', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '2', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '3', title: 'Hacker / Matrix', url: 'https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif' },
  { id: '4', title: 'Approved / Seal', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
  { id: '5', title: 'Salute', url: 'https://media.giphy.com/media/rHR8qP1mC5V3G/giphy.gif' },
  { id: '6', title: 'Celebration', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '7', title: 'Loading / Wait', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  { id: '8', title: 'Rocket Launch', url: 'https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif' },
  { id: '9', title: 'Typing Fast', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
  { id: '10', title: 'Deal With It', url: 'https://media.giphy.com/media/A6aHBCFqlE0ak/giphy.gif' },
  { id: '11', title: 'Cheers', url: 'https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif' },
  { id: '12', title: 'High Five', url: 'https://media.giphy.com/media/pHb82xtBPfqEg/giphy.gif' },
];

export const GifModal: React.FC<GifModalProps> = ({ isOpen, onClose, onSelectGif }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredGifs = searchQuery.trim()
    ? CURATED_GIFS.filter((g) =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : CURATED_GIFS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#16181f] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-['Fraunces'] text-xl font-semibold text-white tracking-wide">Send GIF</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Quick tactical visual reactions.</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative my-4 shrink-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search GIF reactions…"
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2.5 overflow-y-auto pr-1 flex-1 min-h-[260px]">
          {filteredGifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => {
                onSelectGif(gif.url);
                onClose();
              }}
              className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-neutral-900 hover:border-indigo-500 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <img
                src={gif.url}
                alt={gif.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-[11px] font-medium text-white truncate">{gif.title}</span>
              </div>
            </button>
          ))}
          {filteredGifs.length === 0 && (
            <div className="col-span-3 py-10 text-center text-xs text-neutral-400">
              No matching tactical GIFs found.
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
