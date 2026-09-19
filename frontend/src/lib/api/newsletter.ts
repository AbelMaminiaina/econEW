import { fetchAPI } from './config';

interface NewsletterResponse {
  success: boolean;
  message: string;
  alreadySubscribed?: boolean;
}

export async function subscribeToNewsletter(email: string): Promise<NewsletterResponse> {
  return fetchAPI<NewsletterResponse>('/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function unsubscribeFromNewsletter(email: string): Promise<NewsletterResponse> {
  return fetchAPI<NewsletterResponse>(`/newsletter/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
}
