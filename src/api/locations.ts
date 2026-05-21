import client from './client';

export interface LocationItem {
  id: number;
  name: string;
  code: string;
}

export const getProvinces = async () => {
  const response = await client.get<LocationItem[]>('/locations/provinces');
  return response.data;
};

export const getDistricts = async (provinceId: number) => {
  const response = await client.get<LocationItem[]>(`/locations/provinces/${provinceId}/districts`);
  return response.data;
};

export const getWards = async (districtId: number) => {
  const response = await client.get<LocationItem[]>(`/locations/districts/${districtId}/wards`);
  return response.data;
};

export default {
  getProvinces,
  getDistricts,
  getWards,
};
