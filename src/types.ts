export type MessageRole = 'user' | 'model';
export type MessageType = 'text' | 'image';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type?: MessageType;
  imageUrl?: string;
  prompt?: string;
  aspectRatio?: string;
  style?: string;
  provider?: string;
  timestamp: number;
}

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  originalPrompt: string;
  aspectRatio: string;
  style: string;
  provider: string;
  timestamp: number;
}

export type AppMode = 'chat' | 'image' | 'unified';
export type Language = 'bn' | 'en';

export interface StyleOption {
  id: string;
  nameEn: string;
  nameBn: string;
  icon: string;
  description: string;
}

export interface AspectRatioOption {
  id: string;
  label: string;
  sublabel: string;
  ratio: string;
}
