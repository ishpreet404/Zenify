import { ChatMessage, Conversation } from '../types';
import storage from './storage';

// Simulated API call with mock responses
// In a real application, you would replace this with actual OpenAI API calls
export const simulateAIResponse = async (messages: ChatMessage[]): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const userMessage = messages[messages.length - 1].content.toLowerCase();
  
  // Basic response templates based on keywords
  if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
    return "Hello! I'm Zenify, your AI companion for mental wellness. How are you feeling today?";
  }
  
  if (userMessage.includes('sad') || userMessage.includes('depressed') || userMessage.includes('unhappy')) {
    return "I'm sorry to hear you're feeling this way. Remember that it's completely normal to experience these emotions. Would you like to talk more about what might be causing these feelings?";
  }
  
  if (userMessage.includes('anxious') || userMessage.includes('anxiety') || userMessage.includes('worried')) {
    return "Anxiety can be challenging to deal with. Let's take a moment to breathe. Can you tell me more about what's triggering these feelings for you right now?";
  }
  
  if (userMessage.includes('happy') || userMessage.includes('good') || userMessage.includes('great')) {
    return "I'm glad to hear you're feeling positive! What's contributing to these good feelings today?";
  }
  
  if (userMessage.includes('tired') || userMessage.includes('exhausted') || userMessage.includes('fatigue')) {
    return "It sounds like you're experiencing fatigue. Rest is essential for mental well-being. Are you getting enough sleep and taking breaks throughout your day?";
  }
  
  if (userMessage.includes('thank') || userMessage.includes('thanks')) {
    return "You're welcome. Remember, I'm here anytime you need someone to talk to.";
  }
  
  if (userMessage.includes('help') || userMessage.includes('advice')) {
    return "I'm here to listen and offer perspective. Can you tell me more specifically what you'd like help with today?";
  }
  
  if (userMessage.includes('meditation') || userMessage.includes('mindfulness')) {
    return "Mindfulness and meditation can be powerful tools for mental wellness. Even just 5 minutes of focused breathing can help center your thoughts. Would you like to explore some simple mindfulness techniques?";
  }
  
  // Default response if no keywords match
  return "Thank you for sharing. How does that make you feel? I'm here to listen and provide a space for you to explore your thoughts.";
};

// Send message and get AI response
export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Conversation | null> => {
  // Add user message
  const updatedConvo = storage.addMessageToConversation(conversationId, {
    role: 'user',
    content,
  });
  
  if (!updatedConvo) return null;
  
  try {
    // Get AI response
    const aiResponse = await simulateAIResponse(updatedConvo.messages);
    
    // Add AI response to conversation
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: aiResponse,
    });
  } catch (error) {
    console.error('Error getting AI response:', error);
    
    // Add error message
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    });
  }
};

export default {
  simulateAIResponse,
  sendMessage,
};