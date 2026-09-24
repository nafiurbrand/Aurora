import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Languages,
  Mic,
  MicOff,
  Wand2,
  Trash2,
  Download,
  Maximize2,
  ExternalLink,
  Layers,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatMessage, GeneratedImage, AppMode, Language } from './types';
import {
  STYLE_OPTIONS,
  ASPECT_RATIOS,
  SUGGESTED_CHAT_PROMPTS,
  SUGGESTED_IMAGE_PROMPTS,
  I18N,
} from './constants';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ImageModal } from './components/ImageModal';
import { GalleryModal } from './components/GalleryModal';

export default function App() {
  // Application State
  const [lang, setLang] = useState<Language>('bn');
  const [mode, setMode] = useState<AppMode>('chat');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Image Generation Settings
  const [selectedStyle, setSelectedStyle] = useState('default');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [showStylePanel, setShowStylePanel] = useState(false);

  // Chat and Image Storage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('ai_assistant_chats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        content:
          'হ্যালো! আমি আপনার এআই সহকারী ও ক্রিয়েটিভ আর্ট স্টুডিও। আপনি আমার সাথে বাংলায় বা ইংরেজিতে চ্যাট করতে পারেন, কোড ও যেকোনো প্রশ্ন সমাধান করতে পারেন অথবা অসাধারণ ছবি তৈরি করতে পারেন! নিচে মোড বেছে নিয়ে শুরু করুন।',
        timestamp: Date.now(),
      },
    ];
  });

  const [imagesGallery, setImagesGallery] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem('ai_assistant_gallery');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Modals & Active Viewers
  const [activeImageModal, setActiveImageModal] = useState<GeneratedImage | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = I18N[lang];

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('ai_assistant_chats', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('ai_assistant_gallery', JSON.stringify(imagesGallery));
  }, [imagesGallery]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert(lang === 'bn' ? 'আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই।' : 'Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Text to Speech
  const handleSpeak = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      if (speakingMessageId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        return;
      }

      window.speechSynthesis.cancel();
      // Remove code blocks and markdown symbols for clean speech
      const cleaned = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*#`_]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      utterance.rate = 1.0;

      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);

      setSpeakingMessageId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Copy message text
  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const handleClearChat = () => {
    if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত সব কথোপকথন মুছে ফেলতে চান?' : 'Clear all conversation history?')) {
      const resetMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content:
          lang === 'bn'
            ? 'কথোপকথন পরিষ্কার করা হয়েছে। নতুন প্রশ্ন করুন বা ছবি আঁকতে বলুন!'
            : 'Chat history cleared. Feel free to ask a new question or create an image!',
        timestamp: Date.now(),
      };
      setMessages([resetMsg]);
    }
  };

  // Enhance prompt with Gemini
  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancing) return;
    setIsEnhancing(true);

    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, language: lang }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setInput(data.enhancedPrompt);
      }
    } catch (e) {
      console.error('Enhance error:', e);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Main Submit Handler
  const handleSend = async (customPrompt?: string, forcedMode?: AppMode) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    const currentMode = forcedMode || mode;

    // Detect if unified mode was selected: if text has image trigger keywords, route to image
    let effectiveMode: 'chat' | 'image' = currentMode === 'image' ? 'image' : 'chat';

    if (currentMode === 'unified') {
      const lower = textToSend.toLowerCase();
      const imageTriggers = [
        'ছবি', 'আঁকো', 'তৈরি করো', 'অঙ্কন', 'image', 'picture', 'draw', 'generate', 'create photo', 'art of', 'photo of'
      ];
      if (imageTriggers.some((kw) => lower.includes(kw))) {
        effectiveMode = 'image';
      } else {
        effectiveMode = 'chat';
      }
    }

    const userMessageId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (effectiveMode === 'image') {
      // Execute Image Generation
      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            aspectRatio: selectedRatio,
            style: selectedStyle,
          }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const newGeneratedImage: GeneratedImage = {
          id: `img-${Date.now()}`,
          imageUrl: data.imageUrl,
          prompt: data.prompt || textToSend,
          originalPrompt: textToSend,
          aspectRatio: selectedRatio,
          style: selectedStyle,
          provider: data.provider || 'gemini',
          timestamp: Date.now(),
        };

        // Add to images gallery
        setImagesGallery((prev) => [newGeneratedImage, ...prev]);

        // Add AI message with the image
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'model',
          type: 'image',
          content:
            lang === 'bn'
              ? `আপনার জন্য ছবি তৈরি করা হয়েছে: "${textToSend}"`
              : `Here is the visual generated for: "${textToSend}"`,
          imageUrl: data.imageUrl,
          prompt: data.prompt || textToSend,
          aspectRatio: selectedRatio,
          style: selectedStyle,
          provider: data.provider,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Celebration confetti!
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
          });
        } catch (_) {}
      } catch (err: any) {
        console.error('Image gen error:', err);
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `${t.errorGeneral} (${err?.message || 'Server error'})`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Execute Chat Completion
      try {
        // Prepare history for contextual conversations
        const historyPayload = messages
          .filter((m) => m.type !== 'image')
          .slice(-8)
          .map((m) => ({
            role: m.role,
            text: m.content,
          }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
            history: historyPayload,
          }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'model',
          content: data.reply,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (err: any) {
        console.error('Chat error:', err);
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `${t.errorGeneral} (${err?.message || 'Server error'})`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f111a] text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="flex-none bg-[#171a29]/95 backdrop-blur-md border-b border-indigo-500/20 px-4 sm:px-6 py-3 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#171a29] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {t.appTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Gallery Button */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title={t.gallery}
          >
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">{t.gallery}</span>
            {imagesGallery.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {imagesGallery.length}
              </span>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Switch Language (ভাষা পরিবর্তন)"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'bn' ? 'বাং / ENG' : 'ENG / বাং'}</span>
          </button>

          {/* Clear Chat */}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title={t.clearChat}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mode Selector Strip */}
      <div className="flex-none bg-[#131624] border-b border-slate-800 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t.chatMode}</span>
          </button>

          <button
            onClick={() => setMode('image')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'image'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t.imageMode}</span>
          </button>

          <button
            onClick={() => setMode('unified')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'unified'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.unifiedMode}</span>
          </button>
        </div>

        {/* Quick Style & Aspect Ratio Controls if Image Mode is active */}
        {(mode === 'image' || mode === 'unified') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStylePanel((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.nameBn || 'স্টাইল'}:{' '}
                {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.[lang === 'bn' ? 'nameBn' : 'nameEn']}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setSelectedRatio(ar.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    selectedRatio === ar.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={ar.sublabel}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expandable Style Drawer */}
      {showStylePanel && (mode === 'image' || mode === 'unified') && (
        <div className="bg-[#181c2e] border-b border-indigo-500/20 px-4 sm:px-6 py-3 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">{t.styleSelect}</span>
            <button
              onClick={() => setShowStylePanel(false)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  setSelectedStyle(style.id);
                  setShowStylePanel(false);
                }}
                className={`p-2 rounded-xl text-left border transition-all ${
                  selectedStyle === style.id
                    ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="text-base mb-1">{style.icon}</div>
                <div className="text-xs font-semibold truncate">
                  {lang === 'bn' ? style.nameBn : style.nameEn}
                </div>
                <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                  {style.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat / Interaction Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Welcome Banner & Suggested Prompts (when only welcome message is present) */}
        {messages.length <= 1 && (
          <div className="max-w-3xl mx-auto my-6 p-6 rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-900/40 border border-indigo-500/20 shadow-xl text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{t.welcomeTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
              {t.welcomeDesc}
            </p>

            <div className="text-left">
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.suggestedPrompts}</span>
              </p>

              <div className="flex flex-wrap gap-2">
                {(mode === 'image'
                  ? SUGGESTED_IMAGE_PROMPTS[lang]
                  : SUGGESTED_CHAT_PROMPTS[lang]
                ).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-700/80 hover:border-indigo-500/40 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl transition-all duration-150 shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isImage = msg.type === 'image';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-none w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-md ${
                    isUser
                      ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white'
                      : 'bg-slate-800 border border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {isUser ? 'ইউ' : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-lg transition-all ${
                    isUser
                      ? 'bg-[#4a4ae2] text-white rounded-tr-none'
                      : 'bg-[#23273e] border border-indigo-500/15 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Generated Image Card */}
                  {isImage && msg.imageUrl ? (
                    <div className="space-y-3">
                      <div className="text-xs sm:text-sm font-medium text-indigo-200 pb-1 border-b border-indigo-500/20">
                        {msg.content}
                      </div>

                      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700/60 shadow-inner group/img">
                        <img
                          src={msg.imageUrl}
                          alt={msg.prompt || 'Generated AI visual'}
                          className="w-full h-auto max-h-[460px] object-contain cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                          onClick={() => {
                            setActiveImageModal({
                              id: msg.id,
                              imageUrl: msg.imageUrl!,
                              prompt: msg.prompt || '',
                              originalPrompt: msg.prompt || '',
                              aspectRatio: msg.aspectRatio || '1:1',
                              style: msg.style || 'default',
                              provider: msg.provider || 'gemini',
                              timestamp: msg.timestamp,
                            });
                          }}
                        />

                        {/* Quick Action Overlay */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setActiveImageModal({
                                id: msg.id,
                                imageUrl: msg.imageUrl!,
                                prompt: msg.prompt || '',
                                originalPrompt: msg.prompt || '',
                                aspectRatio: msg.aspectRatio || '1:1',
                                style: msg.style || 'default',
                                provider: msg.provider || 'gemini',
                                timestamp: msg.timestamp,
                              });
                            }}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                            title={t.viewFull}
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Image Details & Action Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                            {msg.aspectRatio || '1:1'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                            {msg.style || 'standard'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setInput(msg.prompt || '');
                              setMode('image');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{t.remixPrompt}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveImageModal({
                                id: msg.id,
                                imageUrl: msg.imageUrl!,
                                prompt: msg.prompt || '',
                                originalPrompt: msg.prompt || '',
                                aspectRatio: msg.aspectRatio || '1:1',
                                style: msg.style || 'default',
                                provider: msg.provider || 'gemini',
                                timestamp: msg.timestamp,
                              });
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>{t.downloadImage}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Regular Text / Code Response */
                    <MarkdownRenderer content={msg.content} />
                  )}

                  {/* Message Bottom Action Bar */}
                  {!isUser && (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Audio Text to Speech */}
                        <button
                          onClick={() => handleSpeak(msg.content, msg.id)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title={t.readAloud}
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Copy Message */}
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title={t.copyText}
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-[#23273e] border border-indigo-500/15 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs text-indigo-200">
                  {mode === 'image' ? t.creatingImage : t.thinking}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="flex-none bg-[#171a29]/95 backdrop-blur-md border-t border-indigo-500/20 p-3 sm:p-4 z-20">
        <div className="max-w-3xl mx-auto">
          {/* Quick suggestions when input is empty */}
          {!input && (
            <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
              <span className="text-slate-500 text-[11px] whitespace-nowrap">আইডিয়া:</span>
              {(mode === 'image'
                ? SUGGESTED_IMAGE_PROMPTS[lang]
                : SUGGESTED_CHAT_PROMPTS[lang]
              )
                .slice(0, 3)
                .map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(idea)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/30 text-slate-300 text-[11px] transition-colors"
                  >
                    {idea}
                  </button>
                ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-[#1f2338] border border-indigo-500/25 rounded-2xl p-2 shadow-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            {/* Mode selection dropdown inside input */}
            <div className="flex-none pb-1">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AppMode)}
                className="bg-[#171a29] text-xs font-semibold text-indigo-300 border border-indigo-500/30 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="chat">💬 Chat</option>
                <option value="image">🎨 Image</option>
                <option value="unified">⚡ Auto</option>
              </select>
            </div>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'image'
                  ? t.imagePlaceholder
                  : mode === 'unified'
                  ? t.unifiedPlaceholder
                  : t.chatPlaceholder
              }
              className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-slate-400 text-sm py-2 px-1 resize-none max-h-36 focus:outline-none leading-relaxed"
            />

            {/* Input Action Buttons */}
            <div className="flex items-center gap-1 pb-1">
              {/* Magic Enhance Prompt Button (for image ideas) */}
              {(mode === 'image' || mode === 'unified') && input.trim() && (
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                  className="p-2 rounded-xl text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/25 transition-colors"
                  title={t.enhancePrompt}
                >
                  <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              )}

              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isListening ? t.listeningVoice : t.voiceInput}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-xl font-bold flex items-center justify-center transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 scale-100 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
                title={t.send}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
            <span>{t.poweredBy}</span>
            <span className="hidden sm:inline">Shift + Enter for new line • Enter to send</span>
          </div>
        </div>
      </div>

      {/* Lightbox / Image Preview Modal */}
      <ImageModal
        image={activeImageModal}
        onClose={() => setActiveImageModal(null)}
        lang={lang}
        onRemix={(prompt, style, ratio) => {
          setInput(prompt);
          setSelectedStyle(style);
          setSelectedRatio(ratio);
          setMode('image');
        }}
      />

      {/* History Gallery Drawer Modal */}
      <GalleryModal
        images={imagesGallery}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectImage={(item) => {
          setIsGalleryOpen(false);
          setActiveImageModal(item);
        }}
        onClearGallery={() => setImagesGallery([])}
        lang={lang}
      />
    </div>
  );
}
