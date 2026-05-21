import client, { type PaginatedResponse } from './client';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  provinceId?: number;
  districtId?: number;
  wardId?: number;
  createdAt: string;
}

export const getBranches = async (page: number = 1, limit: number = 10) => {
  const response = await client.get<PaginatedResponse<Branch>>(`/branches?page=${page}&limit=${limit}`);
  return response.data;
};

export const createBranch = async (data: Partial<Branch>) => {
  const response = await client.post<Branch>('/branches', data);
  return response.data;
};

export const updateBranch = async (id: string, data: Partial<Branch>) => {
  const response = await client.patch<Branch>(`/branches/${id}`, data);
  return response.data;
};

export const deleteBranch = async (id: string) => {
  await client.delete(`/branches/${id}`);
};

export default {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
};
