import client, { type PaginatedResponse } from './client';
import { type Branch } from './branches';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  password?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  dateOfBirth?: string;
  idCard?: string;
  phone?: string;
  hireDate?: string;
  specialties?: string;
  englishProficiency?: boolean;
  userBranchRoles?: {
    id: string;
    branchId: string;
    roleId: string;
    branch?: Branch;
    role?: {
      id: string;
      name: string;
      permissions: any[];
    };
  }[];
  createdAt: string;
}

export const getUsers = async (branchId?: string, page: number = 1, limit: number = 10) => {
  let url = `/users?page=${page}&limit=${limit}`;
  if (branchId) url += `&branchId=${branchId}`;
  const response = await client.get<PaginatedResponse<User>>(url);
  return response.data;
};

export const createUser = async (data: Partial<User>) => {
  const response = await client.post<User>('/users', data);
  return response.data;
};

export const updateUser = async (id: string, data: Partial<User>) => {
  const response = await client.patch<User>(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string) => {
  await client.delete(`/users/${id}`);
};

export default {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
