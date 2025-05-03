import { UserProfile, JournalEntry, Conversation, Mood, MoodEntry, FlaggedContent, ChatMessage } from '../types';
import { checkContent } from './contentMonitor';

// Default user profile
const defaultProfile: UserProfile = {
  name: '',
  isAdmin: false,
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
  FLAGGED_CONTENT: 'zenify_flagged_content',
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

// Flagged content
export const getFlaggedContent = (): FlaggedContent[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.FLAGGED_CONTENT);
  return stored ? JSON.parse(stored) : [];
};

export const addFlaggedContent = (content: Omit<FlaggedContent, 'id' | 'timestamp'>): FlaggedContent => {
  const flaggedContent = getFlaggedContent();
  
  const newEntry: FlaggedContent = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...content,
  };
  
  const updated = [...flaggedContent, newEntry];
  localStorage.setItem(STORAGE_KEYS.FLAGGED_CONTENT, JSON.stringify(updated));
  
  return newEntry;
};

export const updateFlaggedContent = (id: string, updates: Partial<FlaggedContent>): FlaggedContent | null => {
  const flaggedContent = getFlaggedContent();
  const index = flaggedContent.findIndex(item => item.id === id);
  
  if (index === -1) return null;
  
  const updatedItem = { ...flaggedContent[index], ...updates };
  const updated = [...flaggedContent];
  updated[index] = updatedItem;
  
  localStorage.setItem(STORAGE_KEYS.FLAGGED_CONTENT, JSON.stringify(updated));
  return updatedItem;
};

// Journal entries with content monitoring
export const getJournalEntries = (): JournalEntry[] => {
  const profile = getUserProfile();
  return profile.journals;
};

export const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): JournalEntry => {
  const profile = getUserProfile();
  const contentCheck = checkContent(entry.content);
  
  const newEntry: JournalEntry = {
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...entry,
    flagged: contentCheck.flagged,
    flagReason: contentCheck.reason,
  };
  
  if (contentCheck.flagged) {
    addFlaggedContent({
      type: 'journal',
      content: entry.content,
      reason: contentCheck.reason!,
    });
  }
  
  const updatedJournals = [...profile.journals, newEntry];
  updateUserProfile({ journals: updatedJournals });
  
  return newEntry;
};

export const updateJournalEntry = (id: string, updates: Omit<JournalEntry, 'id' | 'createdAt'>): JournalEntry | null => {
  const profile = getUserProfile();
  const index = profile.journals.findIndex(journal => journal.id === id);
  
  if (index === -1) return null;
  
  const contentCheck = checkContent(updates.content);
  
  const updatedEntry: JournalEntry = {
    ...profile.journals[index],
    ...updates,
    id,
    createdAt: profile.journals[index].createdAt,
    updatedAt: Date.now(),
    flagged: contentCheck.flagged,
    flagReason: contentCheck.reason,
  };
  
  if (contentCheck.flagged) {
    addFlaggedContent({
      type: 'journal',
      content: updates.content,
      reason: contentCheck.reason!,
    });
  }
  
  const updatedJournals = [...profile.journals];
  updatedJournals[index] = updatedEntry;
  updateUserProfile({ journals: updatedJournals });
  
  return updatedEntry;
};

export const deleteJournalEntry = (id: string): boolean => {
  const profile = getUserProfile();
  const updatedJournals = profile.journals.filter(journal => journal.id !== id);
  
  if (updatedJournals.length === profile.journals.length) {
    return false;
  }
  
  updateUserProfile({ journals: updatedJournals });
  return true;
};

// Mood entries
export const getMoodEntries = (): MoodEntry[] => {
  const profile = getUserProfile();
  return profile.mood.history;
};

export const addMoodEntry = (mood: Mood): MoodEntry => {
  const profile = getUserProfile();
  const newEntry: MoodEntry = {
    mood,
    timestamp: Date.now(),
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

export const getConversation = (id: string): Conversation | null => {
  const profile = getUserProfile();
  return profile.conversations.find(convo => convo.id === id) || null;
};

export const createConversation = (title: string): Conversation => {
  const profile = getUserProfile();
  const newConversation: Conversation = {
    id: Date.now().toString(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hasFlaggedContent: false,
  };
  
  const updatedConversations = [...profile.conversations, newConversation];
  updateUserProfile({ conversations: updatedConversations });
  
  return newConversation;
};

export const updateConversation = (id: string, updates: Partial<Conversation>): Conversation | null => {
  const profile = getUserProfile();
  const index = profile.conversations.findIndex(convo => convo.id === id);
  
  if (index === -1) return null;
  
  const updatedConvo = {
    ...profile.conversations[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  const updatedConversations = [...profile.conversations];
  updatedConversations[index] = updatedConvo;
  
  updateUserProfile({ conversations: updatedConversations });
  return updatedConvo;
};

// Chat messages with content monitoring
export const addMessageToConversation = (
  conversationId: string,
  message: Omit<Omit<Omit<ChatMessage, 'id'>, 'timestamp'>, 'conversationId'>
): Conversation | null => {
  const profile = getUserProfile();
  const convoIndex = profile.conversations.findIndex(convo => convo.id === conversationId);
  
  if (convoIndex === -1) return null;
  
  const contentCheck = message.role === 'user' ? checkContent(message.content) : { flagged: false };
  
  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    ...message,
    flagged: contentCheck.flagged,
    flagReason: contentCheck.reason,
  };
  
  if (contentCheck.flagged) {
    addFlaggedContent({
      type: 'chat',
      content: message.content,
      reason: contentCheck.reason!,
    });
  }
  
  const updatedMessages = [...profile.conversations[convoIndex].messages, newMessage];
  const updatedConvo = {
    ...profile.conversations[convoIndex],
    messages: updatedMessages,
    updatedAt: Date.now(),
    hasFlaggedContent: updatedMessages.some(msg => msg.flagged),
  };
  
  const updatedConversations = [...profile.conversations];
  updatedConversations[convoIndex] = updatedConvo;
  
  updateUserProfile({ conversations: updatedConversations });
  return updatedConvo;
};

export const deleteConversation = (id: string): boolean => {
  const profile = getUserProfile();
  const updatedConversations = profile.conversations.filter(convo => convo.id !== id);
  
  if (updatedConversations.length === profile.conversations.length) {
    return false;
  }
  
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
  getFlaggedContent,
  addFlaggedContent,
  updateFlaggedContent,
};

export default storage;