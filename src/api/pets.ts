import client, { type PaginatedResponse } from './client';

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  gender: 'male' | 'female' | 'unknown';
  dateOfBirth?: string;
  weight?: number;
  notes?: string;
  ownerId?: string;
  owner: {
    id: string;
    fullName: string;
    phone: string;
  };
  branchId?: string;
}

export const getPets = async (branchId?: string, page: number = 1, limit: number = 10) => {
  let url = `/pets?page=${page}&limit=${limit}`;
  if (branchId) url += `&branchId=${branchId}`;
  const response = await client.get<PaginatedResponse<Pet>>(url);
  return response.data;
};

export const getPetsByOwner = async (ownerId: string) => {
  const response = await client.get<Pet[]>(`/pets/owner/${ownerId}`);
  return response.data;
};

export const createPet = async (data: Partial<Pet> & { ownerId: string }) => {
  const response = await client.post<Pet>('/pets', data);
  return response.data;
};

export const updatePet = async (id: string, data: Partial<Pet>) => {
  const response = await client.patch<Pet>(`/pets/${id}`, data);
  return response.data;
};

export const deletePet = async (id: string) => {
  await client.delete(`/pets/${id}`);
};

export default {
  getPets,
  getPetsByOwner,
  createPet,
  updatePet,
  deletePet,
};
