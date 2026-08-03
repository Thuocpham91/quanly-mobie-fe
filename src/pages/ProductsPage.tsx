import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Trash2, Box, Layers, Tag, Ruler, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type PaginatedResponse } from '../api/client';
import { 
  getProductsPaginated, deleteProduct, type Product,
  createProduct, updateProduct,
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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'units' | 'groups'>('products');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Search Drawer state & filters
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  // Fetch Data
  const { data: paginatedProducts, isLoading: loadingProducts } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', page],
    queryFn: () => getProductsPaginated(page, limit),
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
        queryClient.invalidateQueries({ queryKey: ['products', page] });
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
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.productCode && p.productCode.toLowerCase().includes(q));

    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory || p.category?.id === selectedCategory;
    const matchesUnit = !selectedUnit || p.unitId === selectedUnit || p.unit?.id === selectedUnit;
    const matchesGroup = !selectedGroup || p.groupId === selectedGroup || p.group?.id === selectedGroup;

    const currentStock = stockMap[p.id] || 0;
    const matchesStock =
      stockFilter === 'all' ? true :
      stockFilter === 'in_stock' ? currentStock > 0 :
      stockFilter === 'out_of_stock' ? currentStock <= 0 : true;

    return matchesSearch && matchesCategory && matchesUnit && matchesGroup && matchesStock;
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                  <th style={{ padding: '1rem' }}>{t('products.table_barcode')}</th>
                  <th style={{ padding: '1rem' }}>{t('products.table_name')}</th>
                  <th style={{ padding: '1rem' }}>{t('products.table_category')}</th>
                  <th style={{ padding: '1rem' }}>{t('products.table_unit')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('products.table_stock')}</th>
                  <th style={{ padding: '1rem' }}>{t('products.table_manufacturer')}</th>
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
                <td colSpan={activeTab === 'products' ? 8 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  {t('products.loading')}
                </td>
              </tr>
            ) : activeTab === 'products' ? (
              filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    {t('products.no_products')}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p: any, idx: number) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.productCode || '--'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.barcode || ''}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      {p.name}
                      {p.isService && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '4px' }}>
                          {t('products.service_badge')}
                        </span>
                      )}
                      {p.hasImei && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#ede9fe', color: '#6d28d9', borderRadius: '4px', fontWeight: 600 }}>
                          IMEI
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{p.category?.name || '--'}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{p.unit?.name || '--'}</td>
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
                    <td style={{ padding: '1rem', color: '#64748b' }}>{p.manufacturer || '--'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                        <button onClick={() => handleEdit(p)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
