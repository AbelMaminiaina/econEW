import { fetchAPI } from './config';
import { Company } from '@/types';

interface CompaniesResponse {
  companies: (Company & { users: { id: string; email: string; firstName: string; lastName: string; role: string }[] })[];
  total: number;
}

export async function listCompanies(token: string, status?: string): Promise<CompaniesResponse> {
  const query = status ? `?status=${status}` : '';
  return fetchAPI<CompaniesResponse>(`/companies${query}`, { token });
}

export async function approveCompany(
  id: string,
  token: string
): Promise<{ success: boolean; company: Company }> {
  return fetchAPI(`/companies/${id}/approve`, {
    method: 'PATCH',
    token,
  });
}

export async function rejectCompany(
  id: string,
  reason: string | undefined,
  token: string
): Promise<{ success: boolean; company: Company }> {
  return fetchAPI(`/companies/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
    token,
  });
}
