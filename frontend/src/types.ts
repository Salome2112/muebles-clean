export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
export type SettlementStatus = 'PENDING' | 'PAID';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    quotes: number;
  };
}

export interface QuoteItem {
  id?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Quote {
  id: string;
  code: string;
  clientId: string;
  client: Client;
  status: QuoteStatus;
  issueDate: string;
  notes?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: QuoteItem[];
  settlement?: {
    id: string;
    status: SettlementStatus;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  code: string;
  quoteId: string;
  status: SettlementStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string | null;
  paidAt?: string | null;
  quote: Quote;
  createdAt: string;
  updatedAt: string;
}
