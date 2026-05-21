import client from './client';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  module: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export const getRoles = async () => {
  const response = await client.get<Role[]>('/roles');
  return response.data;
};

export const getPermissions = async () => {
  const response = await client.get<Record<string, Permission[]>>('/roles/permissions');
  return response.data;
};

export const createRole = async (data: { name: string; description?: string; permissionIds: string[] }) => {
  const response = await client.post<Role>('/roles', data);
  return response.data;
};

export const updateRole = async (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) => {
  const response = await client.patch<Role>(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string) => {
  await client.delete(`/roles/${id}`);
};

export const assignUserBranchRole = async (branchId: string, userId: string, roleId: string) => {
  const response = await client.post(`/branches/${branchId}/users/${userId}/role`, { roleId });
  return response.data;
};

export const removeUserFromBranch = async (branchId: string, userId: string) => {
  await client.delete(`/branches/${branchId}/users/${userId}`);
};
