import api from './client';
import type { PaginatedResponse } from './client';
import type { Product } from './inventory';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface CreateOrderPayload {
  items: { productId: string; quantity: number; unitPrice: number }[];
  discount?: number;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CARD';
  customerId?: string;
  petId?: string;
  status?: 'DRAFT' | 'COMPLETED';
  notes?: string;
  walletCreditAmount?: number;
  createdAt?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId?: string;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    walletBalance?: number;
  };
  petId?: string;
  pet?: {
    id: string;
    name: string;
    species: string;
  };
  branchId: string;
  subTotal: number;
  discount: number;
  totalAmount: number;
  walletCreditAmount?: number;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
}

export const createOrder = async (orderData: CreateOrderPayload): Promise<Order> => {
  try {
    const response = await api.post('/orders', orderData);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message;
    const detail = Array.isArray(msg) ? msg.join('; ') : (msg || 'Unknown error');
    throw new Error(`Tạo đơn hàng thất bại: ${detail}`);
  }
};

export const getOrders = async (
  page = 1,
  limit = 10,
  petId?: string,
  customerId?: string,
  search?: string,
  status?: string,
): Promise<PaginatedResponse<Order>> => {
  const params: any = { page, limit };
  if (petId) params.petId = petId;
  if (customerId) params.customerId = customerId;
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await api.get('/orders', { params });
  const raw = response.data;
  if (raw && typeof raw.total === 'number' && !raw.meta) {
    return {
      data: raw.data || [],
      meta: {
        total: raw.total,
        page,
        limit,
        totalPages: Math.ceil(raw.total / limit),
      },
    };
  }
  return raw;
};

export const getOrderById = async (id: string): Promise<Order> => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const importOrdersExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ imported: number; errors: any[]; errorFile?: string; errorFileName?: string }>('/orders/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const importOrderDetailsExcel = async (file: File, options?: { createMissingOrders?: boolean; skipStockDeduction?: boolean }) => {
  const formData = new FormData();
  formData.append('file', file);
  const params = new URLSearchParams();
  if (options?.createMissingOrders === false) params.set('createMissingOrders', 'false');
  if (options?.skipStockDeduction === false) params.set('skipStockDeduction', 'false');
  const url = `/orders/import-details${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.post<{ imported: number; errors: any[]; errorFile?: string; errorFileName?: string }>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateOrderStatus = async (id: string, status: string): Promise<Order> => {
  const response = await api.put(`/orders/${id}/status`, { status });
  return response.data;
};

export const updateOrderDate = async (id: string, createdAt: string): Promise<Order> => {
  const response = await api.put(`/orders/${id}/date`, { createdAt });
  return response.data;
};
