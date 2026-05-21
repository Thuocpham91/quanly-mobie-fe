import client, { type PaginatedResponse } from './client';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  customerType?: string;
  walletBalance: number;
  createdAt: string;
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

export default {
  getCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  topUpWallet,
};
