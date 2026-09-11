import { CompanyProfile } from '../types';

const COMPANIES_STORAGE_KEY = 'stockmanagement_companies_v1';
const ACTIVE_COMPANY_STORAGE_KEY = 'stockmanagement_active_company_id_v1';

export const DEFAULT_COMPANIES: CompanyProfile[] = [
  {
    id: 'comp_primary',
    name: 'Al-Madina Trading Co.',
    code: 'AMT',
    tagline: 'Main Wholesale & Distribution',
    currency: '$',
    taxId: 'TX-984210-A',
    email: 'info@almadinatrading.com',
    phone: '+1 (555) 234-5678',
    address: 'Warehouse Hub 4, West Industrial Area',
    color: 'emerald',
    isDefault: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'comp_secondary',
    name: 'Metro Logistics & Retail',
    code: 'MLR',
    tagline: 'City Branch & Retail Outlets',
    currency: '$',
    taxId: 'TX-440912-B',
    email: 'contact@metrologistics.com',
    phone: '+1 (555) 876-5432',
    address: '142 Commercial Ave, City Center',
    color: 'blue',
    isDefault: false,
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  },
];

export function loadStoredCompanies(): CompanyProfile[] {
  if (typeof window === 'undefined') return DEFAULT_COMPANIES;
  try {
    const raw = localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (!raw) {
      saveStoredCompanies(DEFAULT_COMPANIES);
      return DEFAULT_COMPANIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_COMPANIES;
  } catch (err) {
    console.error('Error reading stored companies:', err);
    return DEFAULT_COMPANIES;
  }
}

export function saveStoredCompanies(companies: CompanyProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  } catch (err) {
    console.error('Error saving stored companies:', err);
  }
}

export function loadActiveCompanyId(): string {
  if (typeof window === 'undefined') return DEFAULT_COMPANIES[0].id;
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (raw && typeof raw === 'string') {
      return raw;
    }
    return DEFAULT_COMPANIES[0].id;
  } catch (err) {
    console.error('Error reading active company id:', err);
    return DEFAULT_COMPANIES[0].id;
  }
}

export function saveActiveCompanyId(companyId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId);
  } catch (err) {
    console.error('Error saving active company id:', err);
  }
}
