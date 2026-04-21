import type { Client, Product, Quote, QuoteStatus, Settlement } from '../types';
import { request } from './client';

interface ProductPayload {
  name: string;
  description?: string;
  category?: string;
  price: number;
  stock: number;
}

interface ClientPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface QuotePayload {
  clientId: string;
  notes?: string;
  discount?: number;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export function getProducts() {
  return request<Product[]>('/products');
}

export function createProduct(payload: ProductPayload) {
  return request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: string, payload: Partial<ProductPayload>) {
  return request<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: string) {
  return request<void>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export function getClients() {
  return request<Client[]>('/clients');
}

export function createClient(payload: ClientPayload) {
  return request<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateClient(id: string, payload: Partial<ClientPayload>) {
  return request<Client>(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteClient(id: string) {
  return request<void>(`/clients/${id}`, {
    method: 'DELETE',
  });
}

export function getQuotes() {
  return request<Quote[]>('/quotes');
}

export function getPendingQuotes() {
  return request<Quote[]>('/quotes/pending-settlement');
}

export function createQuote(payload: QuotePayload) {
  return request<Quote>('/quotes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateQuoteStatus(id: string, status: QuoteStatus) {
  return request<Quote>(`/quotes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteQuote(id: string) {
  return request<void>(`/quotes/${id}`, {
    method: 'DELETE',
  });
}

export function getSettlements() {
  return request<Settlement[]>('/settlements');
}

export function createSettlement(quoteId: string, notes?: string) {
  return request<Settlement>('/settlements', {
    method: 'POST',
    body: JSON.stringify({ quoteId, notes }),
  });
}

export function paySettlement(id: string) {
  return request<Settlement>(`/settlements/${id}/pay`, {
    method: 'PATCH',
  });
}

export function deleteSettlement(id: string) {
  return request<void>(`/settlements/${id}`, {
    method: 'DELETE',
  });
}
