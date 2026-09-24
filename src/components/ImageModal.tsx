import React, { useState } from 'react';
import { Download, X, Copy, Check, Sparkles, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageModalProps {
  image: GeneratedImage | null;
  onClose: () => void;
  onRemix?: (prompt: string, style: string, aspectRatio: string) => void;
  lang: 'bn' | 'en';
}

export const ImageModal: React.FC<ImageModalProps> = ({ image, onClose, onRemix, lang }) => {
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!image) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.originalPrompt || image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      if (image.imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = image.imageUrl;
        link.download = `ai-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fetch blob for external image URLs to allow cross-origin downloads
        const response = await fetch(image.imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `ai-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      console.error('Download error:', e);
      window.open(image.imageUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-white">
              {lang === 'bn' ? 'ছবি প্রিভিউ ও ডাউনলোড' : 'Image Preview & Details'}
            </span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {image.aspectRatio} • {image.style}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-950/60 min-h-[300px]">
          <div
            className="transition-transform duration-200 ease-out origin-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={image.imageUrl}
              alt={image.prompt}
              className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800/80"
            />
          </div>
        </div>

        {/* Footer controls & prompt */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
          <div className="text-xs sm:text-sm text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 max-h-24 overflow-y-auto">
            <span className="font-semibold text-indigo-400 block mb-1">
              {lang === 'bn' ? 'প্রম্পট বিবরণ:' : 'Prompt Description:'}
            </span>
            <p className="text-slate-200 select-all leading-relaxed">
              {image.originalPrompt || image.prompt}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (lang === 'bn' ? 'প্রম্পট কপি' : 'Copy Prompt')}</span>
              </button>

              {onRemix && (
                <button
                  onClick={() => {
                    onRemix(image.originalPrompt || image.prompt, image.style, image.aspectRatio);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs sm:text-sm font-medium transition-colors border border-indigo-500/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'পুনরায় ব্যবহার (Remix)' : 'Remix Prompt'}</span>
                </button>
              )}
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'bn' ? 'হাই-রেস ছবি ডাউনলোড' : 'Download High-Res'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
