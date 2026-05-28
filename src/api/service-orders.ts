import client from './client';
import type { PaginatedResponse } from './client';

export const ServiceOrderStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ServiceOrderStatus = typeof ServiceOrderStatus[keyof typeof ServiceOrderStatus];

export interface ServiceOrder {
  id: string;
  orderCode: string;
  appointmentDate?: string;
  appointmentTime?: string;
  deadline?: string;
  address?: string;
  customerLocation?: string;
  jobDescription?: string;
  completedItems?: string;
  quotedAmount: number;
  discount: number;
  status: ServiceOrderStatus;
  branchId: string;
  customerId?: string;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceOrderPayload {
  appointmentDate?: string;
  appointmentTime?: string;
  deadline?: string;
  address?: string;
  customerLocation?: string;
  jobDescription?: string;
  completedItems?: string;
  quotedAmount?: number;
  discount?: number;
  status?: ServiceOrderStatus;
  customerId?: string;
}

export const getServiceOrders = async (
  page = 1,
  limit = 10,
  status?: string,
  search?: string,
): Promise<PaginatedResponse<ServiceOrder>> => {
  const params: any = { page, limit };
  if (status) params.status = status;
  if (search) params.search = search;
  const response = await client.get('/service-orders', { params });
  return response.data;
};

export const getServiceOrderById = async (id: string): Promise<ServiceOrder> => {
  const response = await client.get(`/service-orders/${id}`);
  return response.data;
};

export const createServiceOrder = async (data: CreateServiceOrderPayload): Promise<ServiceOrder> => {
  const response = await client.post('/service-orders', data);
  return response.data;
};

export const updateServiceOrder = async (id: string, data: Partial<CreateServiceOrderPayload>): Promise<ServiceOrder> => {
  const response = await client.patch(`/service-orders/${id}`, data);
  return response.data;
};

export const deleteServiceOrder = async (id: string): Promise<void> => {
  await client.delete(`/service-orders/${id}`);
};
