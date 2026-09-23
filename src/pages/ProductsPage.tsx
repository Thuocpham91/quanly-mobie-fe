import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Trash2, Box, Layers, Tag, Ruler, SlidersHorizontal, FileSpreadsheet, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { type PaginatedResponse } from '../api/client';
import { 
  getProductsPaginated, deleteProduct, type Product,
  createProduct, updateProduct, importProductsExcel,
  getCategories, deleteCategory,
  getUnits, deleteUnit,
  getItemGroups, deleteItemGroup,
  getInventorySummary
} from '../api/inventory';
import Pagination from '../components/Pagination';
import ProductModal from '../components/ProductModal';
import SearchDrawer from '../components/SearchDrawer';
import { useBranchContext } from '../context/BranchContext';

const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'units' | 'groups'>('products');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Debounce search: đợi 350ms sau khi người dùng ngừng gõ mới gọi API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search Drawer state & filters
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: { rowNum: number; name: string; productCode: string; reason: string }[] } | null>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const response = await importProductsExcel(file, selectedBranchId || undefined);
      const failed = (response.failed || []).map((item: any) => ({
        rowNum: item.rowNum ?? 0,
        name: item.name || item.productName || 'N/A',
        productCode: item.productCode || item.barcode || 'N/A',
        reason: item.reason || 'Không xác định',
      }));

      setImportResults({ success: response.success ?? 0, failed });
      if ((response.success ?? 0) > 0) {
        alert(`Import thành công ${response.success} sản phẩm`);
      }
      if (failed.length > 0) {
        alert(`Có ${failed.length} dòng không import được. Vui lòng kiểm tra lại file Excel.`);
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['importOrders'] });
      queryClient.invalidateQueries({ queryKey: ['productImportHistory'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi import sản phẩm';
      alert(Array.isArray(errMsg) ? errMsg.join('; ') : errMsg);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleDownloadImportErrors = () => {
    if (!importResults || importResults.failed.length === 0) return;

    const exportData = importResults.failed.map((row, idx) => ({
      STT: idx + 1,
      DONG: row.rowNum,
      TEN_SAN_PHAM: row.name,
      MA_SP: row.productCode,
      LY_DO: row.reason,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.writeFile(wb, `product_import_errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Fetch Data — tìm kiếm được thực hiện hoàn toàn qua API, không lọc phía frontend
  const { data: paginatedProducts, isLoading: loadingProducts } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', page, limit, debouncedSearch],
    queryFn: () => getProductsPaginated(page, limit, undefined, debouncedSearch || undefined),
  });
  const products = paginatedProducts?.data || [];
  const productsMeta = paginatedProducts?.meta;

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: getUnits });
  const { data: groups = [] } = useQuery({ queryKey: ['itemGroups'], queryFn: getItemGroups });
  const { selectedBranchId } = useBranchContext();
 
  const { data: inventorySummary = [] } = useQuery({
    queryKey: ['inventorySummary', selectedBranchId],
    queryFn: () => {
      const branchId = (!selectedBranchId || selectedBranchId === 'undefined' || selectedBranchId === 'null') ? undefined : selectedBranchId;
      return getInventorySummary(branchId);
    },
  });

  const stockMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    inventorySummary.forEach((item: any) => {
      map[item.product.id] = item.totalStock;
    });
    return map;
  }, [inventorySummary]);
 
  // Mutations
  const productMutation = useMutation({
    mutationFn: (data: Partial<Product>) => {
      if (editingProduct) return updateProduct(editingProduct.id, data);
      return createProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsProductModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (activeTab === 'products') return deleteProduct(id);
      if (activeTab === 'categories') return deleteCategory(id);
      if (activeTab === 'units') return deleteUnit(id);
      if (activeTab === 'groups') return deleteItemGroup(id);
      return Promise.reject();
    },
    onSuccess: () => {
      if (activeTab === 'products') {
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        queryClient.invalidateQueries({ queryKey: [activeTab === 'groups' ? 'itemGroups' : activeTab] });
      }
    }
  });

  const handleEdit = (item: any) => {
    if (activeTab === 'products') {
      setEditingProduct(item);
      setIsProductModalOpen(true);
    }
    // TODO: Add modals for other entities if needed
  };

  const handleDelete = (id: string) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';
    const message = isAdmin 
      ? t('products.delete_confirm_admin') 
      : t('products.delete_confirm_user');
      
    if (window.confirm(message)) {
      deleteMutation.mutate(id);
    }
  };

  const activeFilterCount = (selectedCategory ? 1 : 0) + (selectedUnit ? 1 : 0) + (selectedGroup ? 1 : 0) + (stockFilter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedUnit('');
    setSelectedGroup('');
    setStockFilter('all');
  };

  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory || p.category?.id === selectedCategory;
    const matchesUnit = !selectedUnit || p.unitId === selectedUnit || p.unit?.id === selectedUnit;
    const matchesGroup = !selectedGroup || p.groupId === selectedGroup || p.group?.id === selectedGroup;

    const currentStock = stockMap[p.id] || 0;
    const matchesStock =
      stockFilter === 'all' ? true :
      stockFilter === 'in_stock' ? currentStock > 0 :
      stockFilter === 'out_of_stock' ? currentStock <= 0 : true;

    return matchesCategory && matchesUnit && matchesGroup && matchesStock;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.25rem 0.5rem', backgroundColor: '#f8fafc', gap: '0.75rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>{t('products.title')}</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>{t('products.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('products.search_placeholder')} 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsSearchDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s',
            }}
          >
            <SlidersHorizontal size={16} style={{ color: '#6366f1' }} />
            <span>Menu tìm kiếm</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '0.05rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            onChange={handleImportExcel}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <FileSpreadsheet size={16} />
            {isImporting ? 'Đang import...' : 'Import Excel'}
          </button>

          {importResults && importResults.failed.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadImportErrors}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
            >
              <FileSpreadsheet size={16} />
              Tải lỗi ({importResults.failed.length})
            </button>
          )}

          <button 
            className="btn-primary" 
            onClick={() => { setEditingProduct(undefined); setIsProductModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <Plus size={16} />
            {t('products.add_new')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <TabItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Box size={18} />} label={t('products.tab_products')} />
        <TabItem active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={18} />} label={t('products.tab_categories')} />
        <TabItem active={activeTab === 'units'} onClick={() => setActiveTab('units')} icon={<Ruler size={18} />} label={t('products.tab_units')} />
        <TabItem active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} icon={<Tag size={18} />} label={t('products.tab_groups')} />
      </div>

      {/* Content Table */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem' }}>{t('products.table_stt')}</th>
              {activeTab === 'products' ? (
                <>
                  <th style={{ padding: '1rem' }}>Mã SP</th>
                  <th style={{ padding: '1rem' }}>Tên</th>
                  <th style={{ padding: '1rem' }}>Danh mục</th>
                  <th style={{ padding: '1rem' }}>Đơn vị</th>
                  <th style={{ padding: '1rem' }}>Nhà SX</th>
                  <th style={{ padding: '1rem' }}>Giá gốc</th>
                  <th style={{ padding: '1rem' }}>Giá nhập</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>SL</th>
                  <th style={{ padding: '1rem' }}>Tổng tiền</th>
                  <th style={{ padding: '1rem' }}>Còn trả NCC</th>
                  <th style={{ padding: '1rem' }}>Tiền trả NCC</th>
                  <th style={{ padding: '1rem' }}>Ghi chú</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('products.table_stock')}</th>
                </>
              ) : (
                <>
                  <th style={{ padding: '1rem' }}>{t('products.table_name')}</th>
                  <th style={{ padding: '1rem' }}>{t('products.table_description')}</th>
                </>
              )}
              <th style={{ padding: '1rem', textAlign: 'center' }}>{t('products.table_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingProducts ? (
              <tr>
                <td colSpan={activeTab === 'products' ? 14 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  {t('products.loading')}
                </td>
              </tr>
            ) : activeTab === 'products' ? (
              filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    {t('products.no_products')}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p: any, idx: number) => {
                  const basePrice = Number(p.basePrice ?? p.importPrice ?? 0);
                  const importPrice = Number(p.importPrice ?? p.basePrice ?? 0);
                  const quantity = Number(p.quantity ?? 0);
                  const totalAmount = Number(p.totalAmount ?? (quantity * importPrice));
                  const canTraNcc = Number(p.canTraNcc ?? 0);
                  const tienTraNcc = Number(p.tienTraNcc ?? 0);
                  const fullProductName = p.name || '--';
                  const displayProductName = fullProductName.length > 10 ? `${fullProductName.slice(0, 10)}...` : fullProductName;

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.productCode || '--'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.barcode || ''}</div>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          fontWeight: '500',
                          minWidth: '220px',
                          maxWidth: '260px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={fullProductName}
                      >
                        <span
                          onClick={() => navigate(`/admin/products/${p.id}`)}
                          style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle', color: '#2563eb', cursor: 'pointer' }}
                        >
                          {displayProductName}
                        </span>
                        {p.isService && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '4px', verticalAlign: 'middle' }}>
                            {t('products.service_badge')}
                          </span>
                        )}
                        {p.hasImei && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#ede9fe', color: '#6d28d9', borderRadius: '4px', fontWeight: 600, verticalAlign: 'middle' }}>
                            IMEI
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{p.category?.name || '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{p.unit?.name || '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{p.manufacturer || '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{basePrice ? basePrice.toLocaleString('vi-VN') : '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{importPrice ? importPrice.toLocaleString('vi-VN') : '--'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>{quantity}</td>
                      <td style={{ padding: '1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{totalAmount ? totalAmount.toLocaleString('vi-VN') : '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{canTraNcc ? canTraNcc.toLocaleString('vi-VN') : '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{tienTraNcc ? tienTraNcc.toLocaleString('vi-VN') : '--'}</td>
                      <td style={{ padding: '1rem', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.note || ''}>{p.note || '--'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          fontWeight: '700', 
                          color: (stockMap[p.id] || 0) > 0 ? '#10b981' : '#ef4444',
                          backgroundColor: (stockMap[p.id] || 0) > 0 ? '#ecfdf5' : '#fef2f2',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.875rem'
                        }}>
                          {stockMap[p.id] || 0}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                          <button onClick={() => navigate(`/admin/products/${p.id}`)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }} title="Xem chi tiết"><Eye size={16} /></button>
                          <button onClick={() => handleEdit(p)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
            ) : (activeTab === 'categories' ? categories : activeTab === 'units' ? units : groups).length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  {t('products.no_data')}
                </td>
              </tr>
            ) : (
              (activeTab === 'categories' ? categories : activeTab === 'units' ? units : groups).map((item: any, idx: number) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{item.description || '--'}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                      <button onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && !loadingProducts ? null : null}

      {productsMeta && productsMeta.totalPages > 1 && (
        <Pagination
          currentPage={productsMeta.page}
          totalPages={productsMeta.totalPages}
          totalItems={productsMeta.total}
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      )}

      {isProductModalOpen && (
        <ProductModal 
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={editingProduct}
          key={editingProduct?.id || 'new'}
          onSubmit={async (data) => {
            await productMutation.mutateAsync(data);
          }}
        />
      )}

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Tìm kiếm sản phẩm"
        subtitle="Lọc sản phẩm theo danh mục, đơn vị và tồn kho"
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        onApply={() => setIsSearchDrawerOpen(false)}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Từ khóa tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tên, mã SP, mã vạch..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Danh mục sản phẩm
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả danh mục --</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Đơn vị tính
          </label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả đơn vị --</option>
            {units.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Nhóm hàng
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả nhóm hàng --</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Tình trạng tồn kho
          </label>
          <select
            value={stockFilter}
            onChange={(e: any) => setStockFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="all">Tất cả</option>
            <option value="in_stock">Còn hàng trong kho (&gt; 0)</option>
            <option value="out_of_stock">Hết hàng (0)</option>
          </select>
        </div>
      </SearchDrawer>
    </div>
  );
};

const TabItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <div 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1rem',
      cursor: 'pointer',
      color: active ? '#10b981' : '#64748b',
      borderBottom: active ? '2px solid #10b981' : '2px solid transparent',
      fontWeight: active ? '600' : '400',
      transition: 'all 0.2s'
    }}
  >
    {icon}
    <span>{label}</span>
  </div>
);

export default ProductsPage;
