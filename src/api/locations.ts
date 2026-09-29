import client from './client';

export interface LocationItem {
  id: number;
  name: string;
  code: string;
}

const normalizeLocationList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === 'object') {
    const maybeData = (payload as { data?: unknown }).data;
    if (Array.isArray(maybeData)) return maybeData as T[];
  }

  return [];
};

export const getProvinces = async () => {
  const response = await client.get('/locations/provinces');
  return normalizeLocationList<LocationItem>(response.data);
};

export const getDistricts = async (provinceId: number) => {
  const response = await client.get(`/locations/provinces/${provinceId}/districts`);
  return normalizeLocationList<LocationItem>(response.data);
};

export const getWards = async (districtId: number) => {
  const response = await client.get(`/locations/districts/${districtId}/wards`);
  return normalizeLocationList<LocationItem>(response.data);
};

export default {
  getProvinces,
  getDistricts,
  getWards,
};
