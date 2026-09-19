import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitContactForm } from './contact';
import { subscribeToNewsletter, unsubscribeFromNewsletter } from './newsletter';

function mockFetchJson(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('submitContactForm', () => {
  it('POSTs the form data to /contact', async () => {
    const fetchMock = mockFetchJson({ success: true, message: 'ok' });

    await submitContactForm({
      name: 'Jean',
      email: 'jean@example.com',
      subject: 'Question',
      message: 'Bonjour, ceci est un message de test.',
      consent: true,
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/contact');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body).email).toBe('jean@example.com');
  });
});

describe('subscribeToNewsletter', () => {
  it('POSTs the email to /newsletter', async () => {
    const fetchMock = mockFetchJson({ success: true, message: 'ok' });

    await subscribeToNewsletter('jean@example.com');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/newsletter');
    expect(JSON.parse(options.body)).toEqual({ email: 'jean@example.com' });
  });
});

describe('unsubscribeFromNewsletter', () => {
  it('DELETEs with the URL-encoded email', async () => {
    const fetchMock = mockFetchJson({ success: true, message: 'ok' });

    await unsubscribeFromNewsletter('a+b@example.com');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/newsletter/a%2Bb%40example.com');
    expect(options.method).toBe('DELETE');
  });
});
