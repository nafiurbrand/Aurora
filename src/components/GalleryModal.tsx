import React from 'react';
import { X, Trash2, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { GeneratedImage } from '../types';

interface GalleryModalProps {
  images: GeneratedImage[];
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (image: GeneratedImage) => void;
  onClearGallery: () => void;
  lang: 'bn' | 'en';
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  images,
  isOpen,
  onClose,
  onSelectImage,
  onClearGallery,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {lang === 'bn' ? 'তৈরিকৃত ছবির গ্যালারি' : 'Generated Image Gallery'}
              </h2>
              <p className="text-xs text-slate-400">
                {images.length} {lang === 'bn' ? 'টি ছবি সংরক্ষিত আছে' : 'images saved'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {images.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(lang === 'bn' ? 'সব ছবি মুছে ফেলতে চান?' : 'Clear all saved images?')) {
                    onClearGallery();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
                title="Clear gallery"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'bn' ? 'গ্যালারি খালি করুন' : 'Clear All'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/50">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4">
                <ImageIcon className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                {lang === 'bn' ? 'কোনো ছবি নেই' : 'No images generated yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                {lang === 'bn'
                  ? 'ছবি জেনারেট মোড বেছে নিয়ে যেকোনো দৃশ্য বা ধারণার বিবরণ লিখুন।'
                  : 'Switch to Image Creator mode and describe any scene to generate your first visual!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {images.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectImage(item);
                  }}
                  className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-indigo-500/10"
                >
                  <div className="aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                    <p className="text-[11px] text-white line-clamp-2 font-medium leading-snug">
                      {item.originalPrompt || item.prompt}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-700/60 text-[10px] text-slate-400">
                      <span>{item.aspectRatio}</span>
                      <span className="flex items-center gap-1 text-indigo-300">
                        <ExternalLink className="w-3 h-3" />
                        <span>View</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
