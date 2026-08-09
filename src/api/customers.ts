import client, { type PaginatedResponse } from './client';

export interface Customer {
  id: string;
  code?: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  customerType?: string;
  walletBalance: number;
  createdAt: string;
  lastPurchaseDate?: string;
  creator?: string;
  totalSales?: number;
  currentDebt?: number;
  totalSalesMinusReturns?: number;
}


export const getCustomers = async (branchId?: string, page: number = 1, limit: number = 10) => {
  let url = `/customers?page=${page}&limit=${limit}`;
  if (branchId) url += `&branchId=${branchId}`;
  const response = await client.get<PaginatedResponse<Customer>>(url);
  return response.data;
};

export const searchCustomers = async (q: string, branchId?: string, page: number = 1, limit: number = 10) => {
  let url = `/customers/search?q=${q}&page=${page}&limit=${limit}`;
  if (branchId) url += `&branchId=${branchId}`;
  const response = await client.get<PaginatedResponse<Customer>>(url);
  return response.data;
};

export const createCustomer = async (data: Partial<Customer>) => {
  const response = await client.post<Customer>('/customers', data);
  return response.data;
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  const response = await client.patch<Customer>(`/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id: string) => {
  await client.delete(`/customers/${id}`);
};

export const topUpWallet = async (id: string, amount: number) => {
  const response = await client.patch<Customer>(`/customers/${id}/wallet`, { amount });
  return response.data;
};

export const bulkCreateCustomers = async (customers: Partial<Customer>[]) => {
  const response = await client.post<{ success: number; failed: { fullName: string; phone: string; reason: string }[] }>('/customers/bulk', { customers });
  return response.data;
};

export const importCustomersExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post<{ success: number; failed: { rowNum: number; fullName: string; phone: string; reason: string }[] }>('/customers/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export default {
  getCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  topUpWallet,
  bulkCreateCustomers,
  importCustomersExcel,
};
