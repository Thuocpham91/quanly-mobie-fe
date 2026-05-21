import client from './client';

export interface Room {
  id: string;
  name: string;
  description?: string;
  branchId: string;
  cages?: Cage[];
}

export const CageStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  CHECKOUT: 'CHECKOUT',
  OVERDUE: 'OVERDUE',
  DEPOSITED: 'DEPOSITED',
} as const;

export type CageStatus = typeof CageStatus[keyof typeof CageStatus];

export interface Cage {
  id: string;
  name: string;
  status: CageStatus;
  notes?: string;
  roomId: string;
  petId?: string;
  pet?: any;
  updatedAt?: string;
}

// Room APIs
export const getRooms = async (branchId?: string) => {
  const url = branchId ? `/rooms?branchId=${branchId}` : '/rooms';
  const response = await client.get<Room[]>(url);
  return response.data;
};

export const createRoom = async (data: Partial<Room>) => {
  const response = await client.post<Room>('/rooms', data);
  return response.data;
};

export const updateRoom = async (id: string, data: Partial<Room>) => {
  const response = await client.patch<Room>(`/rooms/${id}`, data);
  return response.data;
};

export const deleteRoom = async (id: string) => {
  await client.delete(`/rooms/${id}`);
};

// Cage APIs
export const getCages = async (roomId?: string) => {
  const url = roomId ? `/cages?roomId=${roomId}` : '/cages';
  const response = await client.get<Cage[]>(url);
  return response.data;
};

export const createCage = async (data: Partial<Cage>) => {
  const response = await client.post<Cage>('/cages', data);
  return response.data;
};

export const updateCage = async (id: string, data: Partial<Cage>) => {
  const response = await client.patch<Cage>(`/cages/${id}`, data);
  return response.data;
};

export const deleteCage = async (id: string) => {
  await client.delete(`/cages/${id}`);
};

export default {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getCages,
  createCage,
  updateCage,
  deleteCage,
};
