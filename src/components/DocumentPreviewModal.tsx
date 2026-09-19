import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText,
  Copy,
  Check,
  Code,
  FileSpreadsheet,
} from 'lucide-react';
import type { Attachment } from '../types';

interface DocumentPreviewModalProps {
  attachment: Attachment | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  attachment,
  isOpen: explicitIsOpen,
  onClose,
}) => {
  const isOpen = explicitIsOpen !== undefined ? explicitIsOpen : !!attachment;
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset zoom and load text if text-based
  useEffect(() => {
    if (!attachment || !isOpen) {
      setTextContent(null);
      setZoomLevel(100);
      return;
    }

    const name = attachment.name.toLowerCase();
    const isTextDoc =
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.json') ||
      name.endsWith('.csv') ||
      name.endsWith('.log') ||
      name.endsWith('.js') ||
      name.endsWith('.ts') ||
      name.endsWith('.py') ||
      name.endsWith('.html') ||
      name.endsWith('.css');

    if (isTextDoc && attachment.url) {
      setLoadingText(true);
      if (attachment.url.startsWith('data:')) {
        try {
          const parts = attachment.url.split(',');
          const base64 = parts[1];
          const decoded = decodeURIComponent(escape(atob(base64)));
          setTextContent(decoded);
          setLoadingText(false);
        } catch {
          // Fallback fetch
          fetch(attachment.url)
            .then((r) => r.text())
            .then((t) => {
              setTextContent(t);
              setLoadingText(false);
            })
            .catch(() => {
              setTextContent('Unable to decode document contents.');
              setLoadingText(false);
            });
        }
      } else {
        fetch(attachment.url)
          .then((r) => r.text())
          .then((t) => {
            setTextContent(t);
            setLoadingText(false);
          })
          .catch(() => {
            setTextContent(null);
            setLoadingText(false);
          });
      }
    } else {
      setTextContent(null);
      setLoadingText(false);
    }
  }, [attachment, isOpen]);

  if (!isOpen || !attachment) return null;

  const fileName = attachment.name || 'Document';
  const fileNameLower = fileName.toLowerCase();
  const isPdf = fileNameLower.endsWith('.pdf') || attachment.url.includes('application/pdf');
  const isSpreadsheet = fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');
  const isOfficeDoc = fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.pptx');

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col bg-[#141620] border border-white/15 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-5xl h-[88vh] max-h-[900px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#191c28] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isPdf
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isSpreadsheet
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isOfficeDoc
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {isPdf ? (
                <FileText className="w-4 h-4" />
              ) : isSpreadsheet ? (
                <FileSpreadsheet className="w-4 h-4" />
              ) : textContent !== null ? (
                <Code className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                {fileName}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                <span>
                  {isPdf
                    ? 'PDF Document'
                    : isSpreadsheet
                    ? 'Spreadsheet / Data'
                    : isOfficeDoc
                    ? 'Office Document'
                    : 'Text File'}
                </span>
                {attachment.size && (
                  <>
                    <span>•</span>
                    <span>{(attachment.size / 1024).toFixed(1)} KB</span>
                  </>
                )}
                <span>•</span>
                <span>Zoom {zoomLevel}%</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 mr-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 60}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-[10px] font-mono text-neutral-300 hover:text-white transition-colors"
                title="Reset Zoom"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Copy Content (if text) */}
            {textContent && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white text-xs border border-white/10 transition-colors"
                title="Copy Text Content"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {/* Open in New Window */}
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-xl border border-white/5 transition-colors"
              title="Open in New Window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Download */}
            <a
              href={attachment.url}
              download={fileName}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors hidden sm:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 rounded-xl transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content Viewport */}
        <div className="flex-1 overflow-auto bg-[#0e1017] p-2 sm:p-4 flex items-center justify-center relative">
          {/* PDF Viewer */}
          {isPdf ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center transition-transform origin-top"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <object
                data={`${attachment.url}#toolbar=1&navpanes=1`}
                type="application/pdf"
                className="w-full h-full rounded-xl border border-white/10 bg-white"
              >
                <iframe
                  src={`${attachment.url}#toolbar=1&navpanes=1`}
                  className="w-full h-full rounded-xl border border-white/10 bg-white"
                  title={fileName}
                >
                  <div className="p-8 text-center text-white">
                    <p className="text-sm">Embedded PDF preview not natively supported by this browser.</p>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white"
                    >
                      <ExternalLink className="w-4 h-4" /> Open PDF in Separate Viewer
                    </a>
                  </div>
                </iframe>
              </object>
            </div>
          ) : textContent !== null ? (
            /* Code / Text / Markdown / CSV Content */
            <div
              className="w-full h-full max-w-4xl bg-[#151722] border border-white/10 rounded-xl p-4 overflow-auto font-mono text-xs text-neutral-200 leading-relaxed shadow-inner"
              style={{ fontSize: `${(zoomLevel / 100) * 12}px` }}
            >
              {loadingText ? (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  <span>Rendering document contents…</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
              )}
            </div>
          ) : (
            /* Generic Office Document / File Reader fallback */
            <div
              className="max-w-md w-full bg-[#181b26] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-xl"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{fileName}</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Direct document preview rendered. For complete formatting or high-fidelity edits, launch in dedicated viewer or download.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open File
                </a>
                <a
                  href={attachment.url}
                  download={fileName}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
