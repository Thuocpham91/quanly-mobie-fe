import client from './client';

export interface Distributor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  description?: string;
}

export const getDistributors = async () => {
  const response = await client.get<any>('/distributors');
  return response.data?.data || response.data || [];
};

export const createDistributor = async (data: Partial<Distributor>) => {
  const response = await client.post<Distributor>('/distributors', data);
  return response.data;
};

export const updateDistributor = async (id: string, data: Partial<Distributor>) => {
  const response = await client.patch<Distributor>(`/distributors/${id}`, data);
  return response.data;
};

export const deleteDistributor = async (id: string) => {
  await client.delete(`/distributors/${id}`);
};

export default {
  getDistributors,
  createDistributor,
  updateDistributor,
  deleteDistributor,
};
