import client from './client';
import type { Distributor } from './distributors';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface ItemGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Classification {
  id: string;
  name: string;
  description?: string;
}

export interface Unit {
  id: string;
  name: string;
  description?: string;
}

export interface ProductUnit {
  id?: string;
  unitId: string;
  unit?: Unit;
  conversionFactor: number;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  productCode?: string;
  isService?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  manufacturer?: string;
  categoryId?: string;
  category?: Category;
  itemGroupId?: string;
  itemGroup?: ItemGroup;
  classificationId?: string;
  classification?: Classification;
  unitId?: string;
  unit?: Unit;
  units: ProductUnit[];
  usage?: string;
  basePrice?: number;
  branchPrices?: { id: string; branchId: string; price: number }[];
}

export interface InventoryBatch {
  id: string;
  productId: string;
  product?: Product;
  branchId: string;
  distributorId?: string;
  distributor?: Distributor;
  importedQuantity: number;
  currentQuantity: number;
  costPrice: number;
  importDate?: string;
  expiryDate?: string;
  invoiceName?: string;
  isGift?: boolean;
  taxAmount?: number;
  discountAmount?: number;
  shippingFee?: number;
  personnelName?: string;
  unitId?: string;
  packagingUnitId?: string;
  conversionFactor?: number;
}

export interface InventorySummary {
  product: Product;
  totalImported: number;
  totalStock: number;
  averageCost: number;
}

export interface ImportOrderItem {
  productId: string;
  importedQuantity: number;
  costPrice?: number;
  expiryDate?: string;
  isGift?: boolean;
}

export interface ImportOrder {
  id: string;
  code: string;
  branchId: string;
  distributorId?: string;
  distributor?: { id: string; name: string };
  invoiceName?: string;
  personnelName?: string;
  importDate?: string;
  note?: string;
  taxAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  createdById?: string;
  createdBy?: { id: string; fullName: string };
  batches: InventoryBatch[];
  createdAt: string;
  updatedAt: string;
}

// Product APIs
export const getProducts = async (context?: any): Promise<Product[]> => {
  // React Query passes a context object; extract isService if provided
  const isService = typeof context === 'object' && typeof context.isService === 'boolean' ? context.isService : undefined;
  const url = isService !== undefined ? `/products?isService=${isService}` : '/products';
  const response = await client.get<any>(url);
  return response.data?.data || response.data || [];
};

export const getProductsPaginated = async (page = 1, limit = 10, isService?: boolean, search?: string) => {
  const query = new URLSearchParams();
  query.append('page', String(page));
  query.append('limit', String(limit));
  if (isService !== undefined) {
    query.append('isService', String(isService));
  }
  if (search) {
    query.append('search', search);
  }
  const url = `/products?${query.toString()}`;
  const response = await client.get<any>(url);
  return response.data || { data: [], meta: { total: 0, page, limit, totalPages: 1 } };
};

// Category APIs
export const getCategories = async () => {
  const response = await client.get<any>('/categories');
  return response.data?.data || response.data || [];
};

export const createCategory = async (data: Partial<Category>) => {
  const response = await client.post<Category>('/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: Partial<Category>) => {
  const response = await client.patch<Category>(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  await client.delete(`/categories/${id}`);
};

// Item Group APIs
export const getItemGroups = async () => {
  const response = await client.get<any>('/item-groups');
  return response.data?.data || response.data || [];
};

export const createItemGroup = async (data: Partial<ItemGroup>) => {
  const response = await client.post<ItemGroup>('/item-groups', data);
  return response.data;
};

export const updateItemGroup = async (id: string, data: Partial<ItemGroup>) => {
  const response = await client.patch<ItemGroup>(`/item-groups/${id}`, data);
  return response.data;
};

export const deleteItemGroup = async (id: string) => {
  await client.delete(`/item-groups/${id}`);
};

// Classification APIs
export const getClassifications = async () => {
  const response = await client.get<any>('/classifications');
  return response.data?.data || response.data || [];
};

export const createClassification = async (data: Partial<Classification>) => {
  const response = await client.post<Classification>('/classifications', data);
  return response.data;
};

export const updateClassification = async (id: string, data: Partial<Classification>) => {
  const response = await client.patch<Classification>(`/classifications/${id}`, data);
  return response.data;
};

export const deleteClassification = async (id: string) => {
  await client.delete(`/classifications/${id}`);
};

// Unit APIs
export const getUnits = async () => {
  const response = await client.get<any>('/units');
  return response.data?.data || response.data || [];
};

export const createUnit = async (data: Partial<Unit>) => {
  const response = await client.post<Unit>('/units', data);
  return response.data;
};

export const updateUnit = async (id: string, data: Partial<Unit>) => {
  const response = await client.patch<Unit>(`/units/${id}`, data);
  return response.data;
};

export const deleteUnit = async (id: string) => {
  await client.delete(`/units/${id}`);
};

export const createProduct = async (data: Partial<Product>) => {
  const response = await client.post<Product>('/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const response = await client.patch<Product>(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  await client.delete(`/products/${id}`);
};

export const getProductPrices = async (productId: string) => {
  const response = await client.get<any>(`/products/${productId}/prices`);
  return response.data?.data || response.data || [];
};

export const setProductBranchPrice = async (productId: string, branchId: string, price: number) => {
  const response = await client.put<any>(`/products/${productId}/prices/${branchId}`, { price });
  return response.data;
};

export const deleteProductBranchPrice = async (productId: string, branchId: string) => {
  await client.delete(`/products/${productId}/prices/${branchId}`);
};

// Inventory APIs
export const getInventorySummary = async (branchId?: string) => {
  const url = branchId ? `/inventory/summary?branchId=${branchId}` : '/inventory/summary';
  const response = await client.get<any>(url);
  return response.data?.data || response.data || [];
};

export const getInventoryBatches = async (branchId?: string, page = 1, limit = 10) => {
  const query = new URLSearchParams();
  if (branchId) query.append('branchId', branchId);
  query.append('page', String(page));
  query.append('limit', String(limit));
  const url = `/inventory/batches?${query.toString()}`;
  const response = await client.get<any>(url);
  return response.data || { data: [], meta: { total: 0, page, limit, totalPages: 1 } };
};

export const getInventoryBatch = async (id: string) => {
  const response = await client.get<any>(`/inventory/batches/${id}`);
  return response.data?.data || response.data;
};

export const createInventoryBatch = async (data: Partial<InventoryBatch>) => {
  const response = await client.post<InventoryBatch>('/inventory/batches', data);
  return response.data;
};

export const updateInventoryBatch = async (id: string, data: Partial<InventoryBatch>) => {
  const response = await client.patch<InventoryBatch>(`/inventory/batches/${id}`, data);
  return response.data;
};

export const deleteInventoryBatch = async (id: string) => {
  await client.delete(`/inventory/batches/${id}`);
};

export const bulkCreateInventoryBatches = async (data: Partial<InventoryBatch>[]) => {
  const response = await client.post<InventoryBatch[]>('/inventory/batches/bulk', data);
  return response.data;
};

export const processInventoryUpload = async (file: File, branchId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  const url = branchId ? `/inventory/import-legacy?branchId=${branchId}` : '/inventory/import-legacy';
  const response = await client.post<any>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getSalesRank = async (branchId?: string): Promise<Record<string, number>> => {
  let url = '/inventory/sales-rank';
  if (branchId) url += `?branchId=${branchId}`;
  const response = await client.get<Record<string, number>>(url);
  return response.data;
};

export interface ExportStockDto {
  branchId: string;
  productId: string;
  quantity: number;
  note?: string;
}

export interface TransferStockDto {
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  quantity: number;
  note?: string;
}

export const exportStock = async (data: ExportStockDto) => {
  const response = await client.post<any>('/inventory/export', data);
  return response.data;
};

export const transferStock = async (data: TransferStockDto) => {
  const response = await client.post<any>('/inventory/transfer', data);
  return response.data;
};

export interface InventoryTransferItem {
  id: string;
  transferId: string;
  productId: string;
  product?: Product;
  quantity: number;
  costPrice: number;
  expiryDate?: string;
  invoiceName?: string;
}

export interface InventoryTransfer {
  id: string;
  code: string;
  fromBranchId: string;
  fromBranch?: { id: string; name: string };
  toBranchId: string;
  toBranch?: { id: string; name: string };
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  note?: string;
  createdById?: string;
  createdBy?: { id: string; name: string };
  confirmedById?: string;
  confirmedBy?: { id: string; name: string };
  items: InventoryTransferItem[];
  createdAt: string;
  updatedAt: string;
}

export const createTransfer = async (data: {
  fromBranchId: string;
  toBranchId: string;
  note?: string;
  items: { productId: string; quantity: number }[];
}) => {
  const response = await client.post<InventoryTransfer>('/inventory/transfers', data);
  return response.data;
};

export const getTransfers = async (branchId?: string, status?: string) => {
  let url = '/inventory/transfers';
  const params = new URLSearchParams();
  if (branchId) params.append('branchId', branchId);
  if (status) params.append('status', status);
  const queryString = params.toString();
  if (queryString) url += `?${queryString}`;
  
  const response = await client.get<InventoryTransfer[]>(url);
  return response.data;
};

export const confirmTransfer = async (id: string) => {
  const response = await client.post<InventoryTransfer>(`/inventory/transfers/${id}/confirm`);
  return response.data;
};

export const cancelTransfer = async (id: string) => {
  const response = await client.post<InventoryTransfer>(`/inventory/transfers/${id}/cancel`);
  return response.data;
};

export const uploadMultipleFiles = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await client.post<{ message: string; data: { url: string; key: string }[] }>('/files/upload-multiple', formData);
  return response.data;
};

// Import Order APIs
export const getImportOrders = async (branchId?: string, page = 1, limit = 10) => {
  const query = new URLSearchParams();
  if (branchId) query.append('branchId', branchId);
  query.append('page', String(page));
  query.append('limit', String(limit));
  const response = await client.get<any>(`/inventory/import-orders?${query.toString()}`);
  return response.data || { data: [], meta: { total: 0, page, limit, totalPages: 1 } };
};

export const getImportOrder = async (id: string): Promise<ImportOrder> => {
  const response = await client.get<any>(`/inventory/import-orders/${id}`);
  return response.data?.data || response.data;
};

export const createImportOrder = async (data: {
  branchId: string;
  distributorId?: string;
  invoiceName?: string;
  personnelName?: string;
  importDate?: string;
  note?: string;
  taxAmount?: number;
  discountAmount?: number;
  shippingFee?: number;
  totalAmount?: number;
  items: ImportOrderItem[];
}): Promise<ImportOrder> => {
  const response = await client.post<ImportOrder>('/inventory/import-orders', data);
  return response.data;
};

export const updateImportOrder = async (id: string, data: Partial<ImportOrder>): Promise<ImportOrder> => {
  const response = await client.patch<ImportOrder>(`/inventory/import-orders/${id}`, data);
  return response.data;
};

export const deleteImportOrder = async (id: string): Promise<void> => {
  await client.delete(`/inventory/import-orders/${id}`);
};

export default {
  getProducts,
  getProductsPaginated,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getItemGroups,
  createItemGroup,
  updateItemGroup,
  deleteItemGroup,
  getClassifications,
  createClassification,
  updateClassification,
  deleteClassification,
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getInventorySummary,
  getInventoryBatches,
  createInventoryBatch,
  updateInventoryBatch,
  deleteInventoryBatch,
  bulkCreateInventoryBatches,
  processInventoryUpload,
  getProductPrices,
  setProductBranchPrice,
  deleteProductBranchPrice,
  getSalesRank,
  exportStock,
  transferStock,
  createTransfer,
  getTransfers,
  confirmTransfer,
  cancelTransfer,
  uploadMultipleFiles,
  getImportOrders,
  getImportOrder,
  createImportOrder,
  updateImportOrder,
  deleteImportOrder,
};
