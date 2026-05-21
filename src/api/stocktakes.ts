import client from './client';
// cache bust 2
import type { Product } from './inventory';

export const StocktakeStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type StocktakeStatus = typeof StocktakeStatus[keyof typeof StocktakeStatus];

export interface StocktakeItem {
  id: string;
  stocktakeId: string;
  productId: string;
  product?: Product;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
}

export interface Stocktake {
  id: string;
  code: string;
  branchId: string;
  status: StocktakeStatus;
  note?: string;
  createdById?: string;
  createdBy?: { id: string; fullName: string };
  approvedById?: string;
  approvedBy?: { id: string; fullName: string };
  items: StocktakeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StocktakeItemDto {
  productId: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
}

export interface CreateStocktakeDto {
  branchId: string;
  note?: string;
  items: StocktakeItemDto[];
}

export interface UpdateStocktakeDto {
  note?: string;
  items?: StocktakeItemDto[];
}

export const getStocktakes = async (branchId?: string) => {
  const url = branchId ? `/inventory/stocktakes?branchId=${branchId}` : '/inventory/stocktakes';
  const response = await client.get<Stocktake[]>(url);
  return response.data;
};

export const getStocktake = async (id: string) => {
  const response = await client.get<Stocktake>(`/inventory/stocktakes/${id}`);
  return response.data;
};

export const createStocktake = async (data: CreateStocktakeDto) => {
  const response = await client.post<Stocktake>('/inventory/stocktakes', data);
  return response.data;
};

export const updateStocktake = async (id: string, data: UpdateStocktakeDto) => {
  const response = await client.patch<Stocktake>(`/inventory/stocktakes/${id}`, data);
  return response.data;
};

export const approveStocktake = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
  const response = await client.patch<Stocktake>(`/inventory/stocktakes/${id}/approve`, { status });
  return response.data;
};
