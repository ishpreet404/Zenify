import { UserProfile, JournalEntry, Conversation, Mood, MoodEntry } from '../types';

// Default user profile
const defaultProfile: UserProfile = {
  name: '',
  mood: {
    current: 'neutral',
    history: [],
  },
  journals: [],
  conversations: [],
  settings: {
    theme: 'light',
    notifications: false,
    fontSize: 'medium',
  },
};

// Storage keys
const STORAGE_KEYS = {
  USER_PROFILE: 'zenify_user_profile',
  JOURNALS: 'zenify_journals',
  MOOD_ENTRIES: 'zenify_mood_entries',
  CONVERSATIONS: 'zenify_conversations',
};

// Initialize storage
export const initializeStorage = (): UserProfile => {
  const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  
  if (!storedProfile) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
    return defaultProfile;
  }
  
  return JSON.parse(storedProfile);
};

// User profile
export const getUserProfile = (): UserProfile => {
  const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  return storedProfile ? JSON.parse(storedProfile) : initializeStorage();
};

export const updateUserProfile = (profile: Partial<UserProfile>): UserProfile => {
  const currentProfile = getUserProfile();
  const updatedProfile = { ...currentProfile, ...profile };
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
  return updatedProfile;
};

// Journal entries
export const getJournalEntries = (): JournalEntry[] => {
  const profile = getUserProfile();
  return profile.journals;
};

export const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): JournalEntry => {
  const profile = getUserProfile();
  const newEntry: JournalEntry = {
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...entry,
  };
  
  const updatedJournals = [...profile.journals, newEntry];
  updateUserProfile({ journals: updatedJournals });
  
  return newEntry;
};

export const updateJournalEntry = (id: string, updates: Partial<JournalEntry>): JournalEntry | null => {
  const profile = getUserProfile();
  const entryIndex = profile.journals.findIndex(entry => entry.id === id);
  
  if (entryIndex === -1) return null;
  
  const updatedEntry = {
    ...profile.journals[entryIndex],
    ...updates,
    updatedAt: Date.now(),
  };
  
  const updatedJournals = [...profile.journals];
  updatedJournals[entryIndex] = updatedEntry;
  
  updateUserProfile({ journals: updatedJournals });
  return updatedEntry;
};

export const deleteJournalEntry = (id: string): boolean => {
  const profile = getUserProfile();
  const updatedJournals = profile.journals.filter(entry => entry.id !== id);
  
  if (updatedJournals.length === profile.journals.length) return false;
  
  updateUserProfile({ journals: updatedJournals });
  return true;
};

// Mood tracking
export const getMoodEntries = (): MoodEntry[] => {
  const profile = getUserProfile();
  return profile.mood.history;
};

export const addMoodEntry = (mood: Mood, note: string = ''): MoodEntry => {
  const profile = getUserProfile();
  const newEntry: MoodEntry = {
    id: Date.now().toString(),
    mood,
    note,
    date: Date.now(),
  };
  
  const updatedHistory = [...profile.mood.history, newEntry];
  updateUserProfile({
    mood: {
      current: mood,
      history: updatedHistory,
    },
  });
  
  return newEntry;
};

// Conversations
export const getConversations = (): Conversation[] => {
  const profile = getUserProfile();
  return profile.conversations;
};

export const getConversation = (id: string): Conversation | undefined => {
  const profile = getUserProfile();
  return profile.conversations.find(convo => convo.id === id);
};

export const createConversation = (title: string = 'New Conversation'): Conversation => {
  const profile = getUserProfile();
  const systemMessage = {
    id: 'system-1',
    role: 'system' as const,
    content: 'You are Zenify, an empathetic AI psychologist designed to provide support, guidance, and a safe space for reflection. Your approach is calm, non-judgmental, and focused on helping users explore their thoughts and feelings. While you can offer thoughtful perspectives and strategies based on psychological principles, you clearly acknowledge you are not a replacement for professional mental health services.',
    timestamp: Date.now(),
  };
  
  const newConversation: Conversation = {
    id: Date.now().toString(),
    title,
    messages: [systemMessage],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const updatedConversations = [...profile.conversations, newConversation];
  updateUserProfile({ conversations: updatedConversations });
  
  return newConversation;
};

export const updateConversation = (id: string, updates: Partial<Conversation>): Conversation | null => {
  const profile = getUserProfile();
  const convoIndex = profile.conversations.findIndex(convo => convo.id === id);
  
  if (convoIndex === -1) return null;
  
  const updatedConvo = {
    ...profile.conversations[convoIndex],
    ...updates,
    updatedAt: Date.now(),
  };
  
  const updatedConversations = [...profile.conversations];
  updatedConversations[convoIndex] = updatedConvo;
  
  updateUserProfile({ conversations: updatedConversations });
  return updatedConvo;
};

export const addMessageToConversation = (
  conversationId: string,
  message: Omit<Omit<Omit<ChatMessage, 'id'>, 'timestamp'>, 'conversationId'>
): Conversation | null => {
  const profile = getUserProfile();
  const convoIndex = profile.conversations.findIndex(convo => convo.id === conversationId);
  
  if (convoIndex === -1) return null;
  
  const newMessage = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...message
  };
  
  const updatedMessages = [...profile.conversations[convoIndex].messages, newMessage];
  const updatedConvo = {
    ...profile.conversations[convoIndex],
    messages: updatedMessages,
    updatedAt: Date.now(),
  };
  
  const updatedConversations = [...profile.conversations];
  updatedConversations[convoIndex] = updatedConvo;
  
  updateUserProfile({ conversations: updatedConversations });
  return updatedConvo;
};

export const deleteConversation = (id: string): boolean => {
  const profile = getUserProfile();
  const updatedConversations = profile.conversations.filter(convo => convo.id !== id);
  
  if (updatedConversations.length === profile.conversations.length) return false;
  
  updateUserProfile({ conversations: updatedConversations });
  return true;
};

// Export all storage functions
export const storage = {
  initializeStorage,
  getUserProfile,
  updateUserProfile,
  getJournalEntries,
  addJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getMoodEntries,
  addMoodEntry,
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  addMessageToConversation,
  deleteConversation,
};

export default storage;