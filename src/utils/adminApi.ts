import { apiFetch } from './api';
import { FlaggedContent } from '../types';

interface CreateFlaggedEventPayload {
  conversationId?: string;
  type: 'chat' | 'journal';
  content: string;
  reason: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const body = await response.json().catch(() => ({}));
  return typeof body?.detail === 'string' ? body.detail : fallback;
};

export const createFlaggedEvent = async (payload: CreateFlaggedEventPayload): Promise<FlaggedContent> => {
  const response = await apiFetch('/api/admin/flagged', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      conversation_id: payload.conversationId,
      type: payload.type,
      content: payload.content,
      reason: payload.reason,
      risk_level: payload.riskLevel,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to create flagged event'));
  }

  return (await response.json()) as FlaggedContent;
};

export const getFlaggedEvents = async (): Promise<FlaggedContent[]> => {
  const response = await apiFetch('/api/admin/flagged', {
    method: 'GET',
    auth: true,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to load flagged events'));
  }

  return (await response.json()) as FlaggedContent[];
};

export const markFlaggedEventReviewed = async (id: string, reviewedBy?: string): Promise<FlaggedContent> => {
  const response = await apiFetch(`/api/admin/flagged/${id}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({
      reviewed: true,
      reviewed_by: reviewedBy,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to update flagged event'));
  }

  return (await response.json()) as FlaggedContent;
};
