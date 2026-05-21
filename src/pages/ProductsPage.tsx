import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Trash2, Box, Layers, Tag, Ruler } from 'lucide-react';
import { 
  getProducts, deleteProduct, type Product,
  createProduct, updateProduct,
  getCategories, deleteCategory,
  getUnits, deleteUnit,
  getItemGroups, deleteItemGroup,
  getInventorySummary
} from '../api/inventory';
import ProductModal from '../components/ProductModal';
import { useBranchContext } from '../context/BranchContext';

const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'units' | 'groups'>('products');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  // Fetch Data
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

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
      queryClient.invalidateQueries({ queryKey: [activeTab === 'groups' ? 'itemGroups' : activeTab] });
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
      ? 'Bạn là Admin, hành động này sẽ XÓA VĨNH VIỄN sản phẩm. Bạn có chắc chắn?' 
      : 'Sản phẩm sẽ được chuyển vào danh sách lưu trữ (Xóa mềm). Bạn có chắc chắn?';
      
    if (window.confirm(message)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm)) ||
    (p.productCode && p.productCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', backgroundColor: '#f8fafc', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>Quản lý sản phẩm</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Danh mục sản phẩm, đơn vị tính và phân loại</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => { setEditingProduct(undefined); setIsProductModalOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Plus size={20} />
          Thêm sản phẩm
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <TabItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Box size={18} />} label="Sản phẩm" />
        <TabItem active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={18} />} label="Danh mục" />
        <TabItem active={activeTab === 'units'} onClick={() => setActiveTab('units')} icon={<Ruler size={18} />} label="Đơn vị tính" />
        <TabItem active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} icon={<Tag size={18} />} label="Nhóm hàng" />
      </div>

      {/* Search & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem',
              borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem' }}>STT</th>
              {activeTab === 'products' ? (
                <>
                  <th style={{ padding: '1rem' }}>Mã/Barcode</th>
                  <th style={{ padding: '1rem' }}>Tên sản phẩm</th>
                  <th style={{ padding: '1rem' }}>Danh mục</th>
                  <th style={{ padding: '1rem' }}>Đơn vị</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Tồn kho</th>
                  <th style={{ padding: '1rem' }}>Nhà sản xuất</th>
                </>
              ) : (
                <>
                  <th style={{ padding: '1rem' }}>Tên</th>
                  <th style={{ padding: '1rem' }}>Mô tả</th>
                </>
              )}
              <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loadingProducts ? (
              <tr>
                <td colSpan={activeTab === 'products' ? 8 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : activeTab === 'products' ? (
              filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Không tìm thấy sản phẩm nào.
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
                          Dịch vụ
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
                  Không có dữ liệu.
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
