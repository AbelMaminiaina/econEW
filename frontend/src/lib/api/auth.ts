import { fetchAPI } from './config';

export interface RegisterCompanyData {
  companyName: string;
  legalName?: string;
  taxId: string;
  contactEmail: string;
  contactPhone?: string;
  user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

interface RegisterCompanyResponse {
  success: boolean;
  message: string;
  companyId: string;
}

export async function registerCompany(data: RegisterCompanyData): Promise<RegisterCompanyResponse> {
  return fetchAPI<RegisterCompanyResponse>('/auth/register-company', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface RegisterCustomerData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function registerCustomer(data: RegisterCustomerData): Promise<{ success: boolean; message: string; userId: string }> {
  return fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
