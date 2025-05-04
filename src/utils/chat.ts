// src/lib/geminiChat.ts
import { ChatMessage, Conversation } from '../types';
import storage from './storage';

const GEMINI_MODEL = "models/gemini-1.5-pro-latest"; // Use the model from your Postman test!

const THERAPIST_SYSTEM_PROMPT =
  "You are a compassionate, licensed psychiatrist and therapist. Your job is to support the user's mental health. Begin by introducing yourself, gently asking how they are feeling today, and performing an empathetic mental health check-in. Throughout the conversation, listen carefully, ask thoughtful follow-up questions, offer validation and support, and provide practical guidance when appropriate. Avoid making any formal diagnosis or prescribing medication, and always encourage seeking help from a qualified professional for urgent or severe concerns. Most importantly, create a safe, non-judgmental space for the user to share their thoughts and feelings.";

// Fetches a response from Gemini's API
export const fetchGeminiResponse = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const apiKey = "yaha api daldo"; // <-- Replace with your Gemini API Key

    if (!apiKey) {
      throw new Error('Gemini API key is missing.');
    }

    // Map 'system' to 'user' since Gemini doesn't support 'system'
    const apiMessages = messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: apiMessages,
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.7
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error response:', errorData);
      throw new Error(`Gemini API error: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();

    const responseText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Sorry, I couldn't generate a response.";
    return responseText;
  } catch (error) {
    console.error('Gemini API error:', error);
    return "I'm sorry, I couldn't connect to the Gemini service. Please try again later.";
  }
};


export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Conversation | null> => {
  // Fetch current conversation
  const convo = storage.getConversation(conversationId);

  let updatedConvo: Conversation | undefined;

  if (!convo || !convo.messages || convo.messages.length === 0) {
    // New conversation—first send the system therapist prompt
    updatedConvo = storage.addMessageToConversation(conversationId, {
      role: 'system',
      content: THERAPIST_SYSTEM_PROMPT,
    });

    // Immediately add the user's initial message
    updatedConvo = storage.addMessageToConversation(conversationId, {
      role: 'user',
      content,
    });
  } else {
    // Existing conversation, just add the new user message
    updatedConvo = storage.addMessageToConversation(conversationId, {
      role: 'user',
      content,
    });
  }

  if (!updatedConvo) return null;

  try {
    // Get real AI response from Gemini
    const aiResponse = await fetchGeminiResponse(updatedConvo.messages);

    // Add AI response to conversation history
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: aiResponse,
    });
  } catch (error) {
    console.error('Error getting Gemini response:', error);
    // Fallback error message
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    });
  }
};

export default {
  fetchGeminiResponse,
  sendMessage,
};