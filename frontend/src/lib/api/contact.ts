import { fetchAPI } from './config';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  consent: boolean;
}

interface ContactResponse {
  success: boolean;
  message: string;
  id?: string;
}

export async function submitContactForm(data: ContactFormData): Promise<ContactResponse> {
  return fetchAPI<ContactResponse>('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
