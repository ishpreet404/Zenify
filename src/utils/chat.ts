import { ChatMessage, Conversation } from '../types';
import storage from './storage';

// Fetches a response from OpenAI's API (NOT for production)
export const fetchOpenAIResponse = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const apiKey ="apikey" // Replace with your real (secret!) key

    // Prepend a system message to control the assistant's behavior
    const apiMessages = [
      { role: 'system', content: "You are Zenify, your AI companion for mental wellness." },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: apiMessages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "I'm sorry, I couldn't connect to the AI service. Please try again later.";
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
    // Get real AI response from OpenAI
    const aiResponse = await fetchOpenAIResponse(updatedConvo.messages);

    // Add AI response to conversation history
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: aiResponse,
    });
  } catch (error) {
    console.error('Error getting AI response:', error);

    // Fallback error message
    return storage.addMessageToConversation(conversationId, {
      role: 'assistant',
      content: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    });
  }
};

export default {
  fetchOpenAIResponse,
  sendMessage,
};