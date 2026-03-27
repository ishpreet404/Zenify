// src/lib/githubModelsChat.ts
import { ChatMessage, Conversation } from '../types';
import storage from './storage';
import { enhancedCheckContent, SuicideRiskAnalysis } from './enhancedSuicideDetection';
import { createFlaggedEvent } from './adminApi';
import { apiFetch } from './api';

const CHAT_MODEL = (import.meta.env.VITE_CHAT_MODEL || 'stepfun/step-3.5-flash:free').trim();


const THERAPIST_SYSTEM_PROMPT =
  "You are Dr. Sarah, a warm and experienced therapist. Speak like a real, caring human in natural language. Prioritize emotional attunement: reflect the user's exact feelings, validate their experience, and respond with gentle curiosity. Keep most replies concise (about 3-6 sentences) unless the user asks for more detail. Use contractions and natural phrasing. Ask at most one meaningful follow-up question per turn. Offer one practical next step when helpful. Avoid repetitive clinical disclaimers, avoid sounding scripted, and never list many generic tips unless requested. Do not diagnose or prescribe medication. For urgent self-harm risk, shift to immediate safety support and crisis resources.";

const INITIAL_GREETING = "Hello! I'm Dr. Sarah, and I'm here to listen and support you. How has your day been treating you so far? I'd love to hear what's on your mind or how you're feeling right now.";

const RESPONSE_STYLE_GUIDE =
  'Style guide: respond with warmth, specificity, and emotional presence. Start by acknowledging the user\'s emotion in plain language. Avoid robotic phrases. Keep a conversational rhythm. End with one thoughtful question only when it helps the user open up.';

// Crisis resources response for high-risk messages
const getCrisisResourcesResponse = (riskLevel: string, analysis?: SuicideRiskAnalysis): string => {
  const actionSummary = analysis?.recommendedAction
    ? `\n\n**Recommended next step:** ${analysis.recommendedAction}`
    : '';

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

Would you like me to help you create a short safety plan for the next 10 minutes while we get you support?${actionSummary}`;
  } else if (riskLevel === 'high') {
    return `💙 **Let's Keep You Safe Right Now** 💙

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

I'm here to listen and support you. Would you like to start with one grounding step, or should we make a quick contact plan for tonight?${actionSummary}`;
  } else if (riskLevel === 'medium') {
    return `🫶 **I Hear You**

It sounds like things feel heavy right now. We can take this one step at a time.

**Helpful next steps:**
• Share what feels hardest at this moment
• Identify one person you can message today
• Pick one calming activity for the next hour

If these feelings intensify, call **988** (US) or your local crisis line.${actionSummary}`;
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
const buildRuntimeStyleMessage = (preferredName?: string): ChatMessage => {
  const personalLine = preferredName
    ? `If appropriate, address the user as ${preferredName} naturally, without overusing their name.`
    : 'Use neutral second-person language unless the user shares a preferred name.';

  return {
    role: 'system',
    content: `${RESPONSE_STYLE_GUIDE} ${personalLine}`,
  };
};

const cleanupAssistantResponse = (rawText: string): string => {
  return rawText
    .replace(/^as an ai[^.]*\.\s*/i, '')
    .replace(/^as a language model[^.]*\.\s*/i, '')
    .replace(/^i am just an ai[^.]*\.\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const fetchModelResponse = async (messages: ChatMessage[], preferredName?: string): Promise<string> => {
  try {
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    apiMessages.push(buildRuntimeStyleMessage(preferredName));

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
  const rawResponse = data.content?.trim() || "Sorry, I couldn't generate a response.";
  const responseText = cleanupAssistantResponse(rawResponse) || rawResponse;
    
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
    
    // Log critical/high cases to backend so admin sees alerts across all accounts
    if (riskAnalysis.riskLevel === 'critical' || riskAnalysis.riskLevel === 'high') {
      console.error('CRITICAL SUICIDE RISK DETECTED:', {
        conversationId,
        content,
        riskAnalysis,
        timestamp: new Date().toISOString()
      });

      await createFlaggedEvent({
        conversationId,
        type: contentType,
        content,
        reason: riskAnalysis.recommendedAction || `${riskAnalysis.riskLevel} suicide risk detected`,
        riskLevel: riskAnalysis.riskLevel,
      });
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
    const crisisResponse = getCrisisResourcesResponse(riskAnalysis.riskLevel, riskAnalysis);
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: crisisResponse,
    });
  }

  // For high risk: provide immediate support response before further discussion
  if (riskAnalysis && riskAnalysis.riskLevel === 'high') {
    const supportResponse = getCrisisResourcesResponse(riskAnalysis.riskLevel, riskAnalysis);
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: supportResponse,
    });
  }

  // For medium risk: provide a brief supportive response and continue conversation flow
  if (riskAnalysis && riskAnalysis.riskLevel === 'medium' && riskAnalysis.confidence >= 0.7) {
    storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: getCrisisResourcesResponse('medium', riskAnalysis),
    });
  }

  try {
    // Get real AI response from GitHub Models for non-crisis messages
    const preferredName = storage.getUserProfile().name?.trim() || undefined;
    const aiResponse = await fetchGitHubModelResponse(updatedConvo.messages, preferredName);

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