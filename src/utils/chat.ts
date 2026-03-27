// src/lib/githubModelsChat.ts
import { ChatMessage, Conversation } from '../types';
import storage from './storage';
import { enhancedCheckContent } from './enhancedSuicideDetection';
import { adminDashboard } from './adminDashboard';
import { apiFetch } from './api';

const CHAT_MODEL = (import.meta.env.VITE_CHAT_MODEL || 'stepfun/step-3.5-flash:free').trim();


const THERAPIST_SYSTEM_PROMPT =
  "You are Dr. Sarah, a compassionate and experienced licensed psychiatrist and therapist. Your role is to provide empathetic mental health support in a safe, non-judgmental environment. When starting a conversation, warmly introduce yourself and ask about the user's day or current feelings with questions like 'How has your day been treating you?' or 'What's on your mind today?' or 'How are you feeling right now?' Throughout the conversation, actively listen, validate their emotions, ask thoughtful follow-up questions, and offer gentle guidance when appropriate. Use a warm, professional tone that makes users feel heard and understood. Avoid making formal diagnoses or prescribing medication, and always encourage seeking help from qualified professionals for urgent concerns. Focus on creating a supportive space where users feel comfortable sharing their thoughts and emotions.";

const INITIAL_GREETING = "Hello! I'm Dr. Sarah, and I'm here to listen and support you. How has your day been treating you so far? I'd love to hear what's on your mind or how you're feeling right now.";

// Crisis resources response for high-risk messages
const getCrisisResourcesResponse = (riskLevel: string): string => {
  if (riskLevel === 'critical') {
    return `🚨 **IMMEDIATE HELP AVAILABLE** 🚨

I'm very concerned about what you've shared. Your safety is the most important thing right now.

**IMMEDIATE CRISIS SUPPORT:**
• **Call 988** - National Suicide Prevention Lifeline (24/7)
• **Text HOME to 741741** - Crisis Text Line (24/7)
• **Call 911** - For immediate emergency assistance

**International Crisis Lines:**
• UK: 116 123 (Samaritans)
• Canada: 1-833-456-4566
• Australia: 13 11 14 (Lifeline)

**You are not alone.** These trained counselors are available right now to talk with you and help you through this difficult time.

If you're in immediate danger, please reach out to emergency services or go to your nearest hospital emergency room.

Would you like me to help you find local mental health resources or talk about what's making you feel this way?`;
  } else if (riskLevel === 'high') {
    return `💙 **I'm Here to Listen** 💙

I hear that you're going through a really tough time right now. It takes courage to share what you're feeling.

**Support Resources Available:**
• **Call 988** - National Suicide Prevention Lifeline
• **Text HOME to 741741** - Crisis Text Line
• **Call 211** - Find local mental health resources

**Remember:**
• These feelings are temporary, even when they feel overwhelming
• Professional counselors are trained to help with exactly what you're experiencing
• Reaching out for help is a sign of strength, not weakness

**Immediate Coping Strategies:**
• Take slow, deep breaths
• Reach out to a trusted friend or family member
• Stay in a safe environment

I'm here to listen and support you. Would you like to talk about what's happening, or would you prefer information about local mental health services?`;
  }
  
  return "I'm here to support you. If you're having thoughts of self-harm, please reach out to the National Suicide Prevention Lifeline at 988.";
};

// Initialize a new conversation with the therapist's greeting
export const initializeConversation = (conversationId: string): Conversation | null => {
  // Add the system prompt (hidden from user)
  let updatedConvo = storage.addMessageToConversation(conversationId, {
    role: 'system',
    content: THERAPIST_SYSTEM_PROMPT,
  });

  if (!updatedConvo) return null;

  // Add the initial greeting from the therapist (visible to user)
  updatedConvo = storage.addMessageToConversation(conversationId, {
    role: 'assistant',
    content: INITIAL_GREETING,
  });

  return updatedConvo;
};

// Fetches a response from the backend API (which proxies to OpenRouter)
export const fetchModelResponse = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await apiFetch('/api/chat', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({
        messages: apiMessages,
        model: CHAT_MODEL,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = typeof errorData?.detail === 'string' ? errorData.detail : 'Failed to get model response';
      throw new Error(message);
    }

    const data = await response.json();
    const responseText = data.content?.trim() || "Sorry, I couldn't generate a response.";
    
    return responseText;
  } catch (error) {
    console.error('Model API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `I'm sorry, I encountered an error: ${message}. Please try again.`;
  }
};

// Alias for backward compatibility
export const fetchGitHubModelResponse = fetchModelResponse;


// Add an optional contentType parameter to support both 'chat' and 'journal'
export const sendMessage = async (
  conversationId: string,
  content: string,
  contentType: 'chat' | 'journal' = 'chat'
): Promise<Conversation | null> => {
  // Fetch current conversation
  const convo = storage.getConversation(conversationId);
  
  if (!convo) return null;

  // Enhanced suicide risk analysis before processing
  let riskAnalysis;
  try {
    const conversationContext = {
      messages: convo.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp
      })),
      userId: 'current-user', // You may want to get this from context
      conversationId: conversationId
    };

    riskAnalysis = await enhancedCheckContent(content, conversationContext);
    
    // Log critical cases immediately
    if (riskAnalysis.riskLevel === 'critical') {
      console.error('CRITICAL SUICIDE RISK DETECTED:', {
        conversationId,
        content,
        riskAnalysis,
        timestamp: new Date().toISOString()
      });
      
      // Create admin alert
      await adminDashboard.createAlert(
        'current-user', // You may want to get this from context
        conversationId,
        content,
        riskAnalysis
      );
      
      // In a real implementation, you would:
      // 1. Alert mental health professionals immediately
      // 2. Show crisis resources to the user
      // 3. Consider automated emergency response
    } else if (riskAnalysis.riskLevel === 'high') {
      // Create admin alert for high-risk cases too
      await adminDashboard.createAlert(
        'current-user',
        conversationId,
        content,
        riskAnalysis
      );
    }

  } catch (error) {
    console.error('Error in suicide risk analysis:', error);
  }

  // Add the user's message
  const updatedConvo = storage.addMessageToConversation(conversationId, {
    role: 'user',
    content,
  });

  if (!updatedConvo) return null;


  // For critical risk: block and show crisis resources
  if (riskAnalysis && riskAnalysis.riskLevel === 'critical') {
    storage.addFlaggedContent({
      type: contentType,
      content,
      reason: riskAnalysis.recommendedAction || 'Critical suicide risk detected',
      riskLevel: 'critical',
    });
    const crisisResponse = getCrisisResourcesResponse(riskAnalysis.riskLevel);
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: crisisResponse,
    });
  }

  // For high risk: flag but do not show warning, allow chat/journal to continue
  if (riskAnalysis && riskAnalysis.riskLevel === 'high') {
    storage.addFlaggedContent({
      type: contentType,
      content,
      reason: riskAnalysis.recommendedAction || 'High suicide risk detected',
      riskLevel: 'high',
    });
    // No warning message is shown to the user
    // Continue with AI response or journal flow
  }

  try {
    // Get real AI response from GitHub Models for non-crisis messages
    const aiResponse = await fetchGitHubModelResponse(updatedConvo.messages);

    // Add AI response to conversation history
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: aiResponse,
    });
  } catch (error) {
    console.error('Error getting GitHub Models response:', error);
    // Fallback error message
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    });
  }
};

export default {
  fetchGitHubModelResponse,
  sendMessage,
  initializeConversation,
};