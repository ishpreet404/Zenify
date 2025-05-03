import { ChatMessage, Conversation } from '../types';
import storage from '../utils/storage';

// Always use one of your supported models!
const GEMINI_MODEL = "models/gemini-2.5-pro-exp-03-25";

export const fetchGeminiResponse = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const apiKey = "AIzaSyAG4zSrJ-tt06NVMO3LxyjhPGqzYUXs7-k"; // <-- Replace with your Gemini API key

    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please provide a valid API key.');
    }

    // Compose your message array (system prompt mapped to user for Gemini)
    const apiMessages = [
      { role: 'system', content: "You are Zenify, your AI companion for mental wellness." },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    // Compose request body
    const requestBody = {
      contents: apiMessages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role, // Gemini doesn't have system role
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    };

    // Use your supported model in the endpoint
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error response:', errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Check which field the text is returned in
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return responseText || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Gemini API error:', error);
    return "I'm sorry, I couldn't connect to the Gemini service. Please try again later.";
  }
};

export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Conversation | null> => {
  // Add user message to conversation history
  const updatedConvo = storage.addMessageToConversation(conversationId, {
    role: 'user',
    content,
  });

  if (!updatedConvo) return null;

  try {
    // Get AI response from Gemini
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