import client, { type PaginatedResponse } from './client';
import { type Pet } from './pets';
import { type Customer } from './customers';

export const AppointmentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type AppointmentStatus = typeof AppointmentStatus[keyof typeof AppointmentStatus];


export interface Appointment {
  id: string;
  petId: string;
  pet?: Pet;
  customerId: string;
  customer?: Customer;
  branchId?: string;
  dateTime: string;
  purpose: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const getAppointments = async (branchId?: string, page: number = 1, limit: number = 10) => {
  let url = `/appointments?page=${page}&limit=${limit}`;
  if (branchId) url += `&branchId=${branchId}`;
  const response = await client.get<PaginatedResponse<Appointment>>(url);
  return response.data;
};

export const getCustomerAppointments = async (customerId: string) => {
  const response = await client.get<Appointment[]>(`/appointments/customer/${customerId}`);
  return response.data;
};

export const getPetAppointments = async (petId: string) => {
  const response = await client.get<Appointment[]>(`/appointments/pet/${petId}`);
  return response.data;
};

export const createAppointment = async (data: Partial<Appointment>) => {
  const response = await client.post<Appointment>('/appointments', data);
  return response.data;
};

export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
  const response = await client.patch<Appointment>(`/appointments/${id}`, data);
  return response.data;
};

export const deleteAppointment = async (id: string) => {
  await client.delete(`/appointments/${id}`);
};

export default {
  getAppointments,
  getCustomerAppointments,
  getPetAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
