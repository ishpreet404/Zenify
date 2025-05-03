export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'awful';

export interface MoodEntry {
  id: string;
  mood: Mood;
  note: string;
  date: number;
}

export interface Quote {
  text: string;
  author: string;
}

export interface UserProfile {
  name: string;
  mood: {
    current: Mood;
    history: MoodEntry[];
  };
  journals: JournalEntry[];
  conversations: Conversation[];
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
}