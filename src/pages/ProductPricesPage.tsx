import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Box, 
  Search, 
  Save, 
  Trash2, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import inventoryApi from '../api/inventory';
import type { Product } from '../api/inventory';
import branchesApi from '../api/branches';

const formatNumberString = (val: string) => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
};

const parseNumberString = (val: string) => {
  return parseInt(val.replace(/\D/g, ''), 10) || 0;
};

const formatFromApi = (val: any) => {
  if (val === null || val === undefined) return '';
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
};

const ProductPricesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [basePriceEdit, setBasePriceEdit] = useState<string>('');
  const [branchPriceEdits, setBranchPriceEdits] = useState<Record<string, string>>({});

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: paginatedProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['products50', searchTerm],
    queryFn: () => inventoryApi.getProductsPaginated(1, 50, undefined, searchTerm.trim() || undefined),
  });

  const products: Product[] = paginatedProducts?.data || (Array.isArray(paginatedProducts) ? paginatedProducts : []);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getBranches(1, 100),
  });

  const branches = branchesData?.data || [];

  const updateProductMutation = useMutation({
    mutationFn: (data: { id: string, basePrice: number }) => 
      inventoryApi.updateProduct(data.id, { basePrice: data.basePrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products50'] });
    }
  });

  const setBranchPriceMutation = useMutation({
    mutationFn: (data: { productId: string, branchId: string, price: number }) => 
      inventoryApi.setProductBranchPrice(data.productId, data.branchId, data.price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products50'] });
    }
  });

  const deleteBranchPriceMutation = useMutation({
    mutationFn: (data: { productId: string, branchId: string }) => 
      inventoryApi.deleteProductBranchPrice(data.productId, data.branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products50'] });
    }
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.productCode && p.productCode.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 50);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setBasePriceEdit(formatFromApi(product.basePrice));
    
    const edits: Record<string, string> = {};
    product.branchPrices?.forEach(bp => {
      edits[bp.branchId] = formatFromApi(bp.price);
    });
    setBranchPriceEdits(edits);
    
    if (isMobile) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleSaveBasePrice = () => {
    if (!selectedProduct) return;
    updateProductMutation.mutate({ 
      id: selectedProduct.id, 
      basePrice: parseNumberString(basePriceEdit) 
    });
  };

  const handleSaveBranchPrice = (branchId: string) => {
    if (!selectedProduct) return;
    const price = parseNumberString(branchPriceEdits[branchId]);
    
    setBranchPriceMutation.mutate({
      productId: selectedProduct.id,
      branchId,
      price
    });
  };

  const handleDeleteBranchPrice = (branchId: string) => {
    if (!selectedProduct) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa giá riêng của chi nhánh này không? Nó sẽ dùng lại giá mặc định.')) {
      deleteBranchPriceMutation.mutate({
        productId: selectedProduct.id,
        branchId
      });
      const newEdits = { ...branchPriceEdits };
      delete newEdits[branchId];
      setBranchPriceEdits(newEdits);
    }
  };

  const formatCurrency = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.25rem 0.5rem', backgroundColor: 'var(--background)', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <DollarSign size={20} style={{ color: 'var(--primary)' }} />
            Quản lý giá sản phẩm
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>Cài đặt giá mặc định và giá riêng cho từng chi nhánh</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', flex: 1, overflow: isMobile ? 'auto' : 'hidden' }}>
        
        {/* Product List */}
        <div className="card" style={{ flex: isMobile ? 'none' : '0 0 350px', height: isMobile ? '400px' : 'auto', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                  borderRadius: '0.375rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem'
                }}
              />
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem', textAlign: 'right' }}>
              Hiển thị tối đa 50 sản phẩm
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingProducts ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy sản phẩm nào</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {filteredProducts.map(product => {
                  const isSelected = selectedProduct?.id === product.id;
                  return (
                    <li 
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                        <h3 style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.95rem', wordBreak: 'break-word' }}>{product.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{product.productCode || 'N/A'}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)' }}>
                          {formatCurrency(product.basePrice || 0)}
                        </p>
                        {product.branchPrices && product.branchPrices.length > 0 && (
                          <span style={{ 
                            display: 'inline-block', padding: '0.1rem 0.4rem', marginTop: '0.25rem',
                            backgroundColor: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' 
                          }}>
                            {product.branchPrices.length} nhánh
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Price Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: isMobile ? 'visible' : 'auto' }}>
          {selectedProduct ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', borderRadius: 'var(--radius)', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Box size={isMobile ? 20 : 24} />
                </div>
                <div>
                  <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '700', color: 'var(--foreground)', wordBreak: 'break-word' }}>{selectedProduct.name}</h2>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>{selectedProduct.productCode} • {selectedProduct.category?.name || 'Không có danh mục'}</p>
                </div>
              </div>

              <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                {/* Default Price Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--foreground)', marginBottom: '1rem' }}>Giá mặc định</h3>
                  
                  <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: isMobile ? 'stretch' : 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '0.5rem' }}>Giá cơ bản (VNĐ)</label>
                      <input
                        type="text"
                        value={basePriceEdit}
                        onChange={(e) => setBasePriceEdit(formatNumberString(e.target.value))}
                        style={{
                          width: '100%', padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '1px solid #cbd5e1', outline: 'none'
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSaveBasePrice}
                      disabled={updateProductMutation.isPending}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', height: '40px' }}
                    >
                      <Save size={18} />
                      {updateProductMutation.isPending ? 'Đang lưu...' : 'Lưu giá gốc'}
                    </button>
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    Giá này sẽ được áp dụng cho tất cả chi nhánh không có giá tùy chỉnh.
                  </p>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

                {/* Branch Prices Section */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--foreground)', marginBottom: '1rem' }}>Giá theo chi nhánh</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {branches.map(branch => {
                      const hasCustomPrice = selectedProduct.branchPrices?.some(bp => bp.branchId === branch.id);
                      
                      return (
                        <div key={branch.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: hasCustomPrice ? '#f8fafc' : 'white' }}>
                          <div style={{ width: isMobile ? '100%' : '250px' }}>
                            <p style={{ fontWeight: '500', color: 'var(--foreground)' }}>{branch.name}</p>
                            {hasCustomPrice ? (
                              <span style={{ fontSize: '0.75rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '500', display: 'inline-block', marginTop: '0.3rem' }}>
                                Đang dùng giá riêng
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '500', display: 'inline-block', marginTop: '0.3rem' }}>
                                Đang dùng giá mặc định
                              </span>
                            )}
                          </div>
                          
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '500' }}>đ</span>
                              <input
                                type="text"
                                placeholder={hasCustomPrice ? "" : basePriceEdit}
                                value={branchPriceEdits[branch.id] || ''}
                                onChange={(e) => setBranchPriceEdits(prev => ({...prev, [branch.id]: formatNumberString(e.target.value)}))}
                                style={{
                                  width: '100%', padding: '0.5rem 1rem 0.5rem 2rem',
                                  borderRadius: 'var(--radius)', 
                                  border: hasCustomPrice ? '1px solid #86efac' : '1px solid var(--border)', 
                                  outline: 'none',
                                  backgroundColor: 'white'
                                }}
                              />
                            </div>
                            
                            <button
                              onClick={() => handleSaveBranchPrice(branch.id)}
                              disabled={setBranchPriceMutation.isPending || !branchPriceEdits[branch.id]}
                              style={{ 
                                padding: '0.5rem', color: 'var(--primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                                borderRadius: 'var(--radius)', border: 'none', cursor: branchPriceEdits[branch.id] ? 'pointer' : 'not-allowed',
                                opacity: branchPriceEdits[branch.id] ? 1 : 0.5
                              }}
                              title="Lưu giá riêng"
                            >
                              <Save size={20} />
                            </button>
                            
                            {hasCustomPrice && (
                              <button
                                onClick={() => handleDeleteBranchPrice(branch.id)}
                                disabled={deleteBranchPriceMutation.isPending}
                                style={{ 
                                  padding: '0.5rem', color: 'var(--danger)', backgroundColor: '#fee2e2', 
                                  borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer'
                                }}
                                title="Xóa giá riêng, quay về giá mặc định"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', minHeight: isMobile ? '200px' : 'auto' }}>
              <DollarSign size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '1.1rem', textAlign: 'center' }}>Chọn một sản phẩm để quản lý giá</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPricesPage;
