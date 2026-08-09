import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  Wallet, 
  FileText, 
  Loader2, 
  Tag, 
  ChevronDown, 
  Check, 
  X,
  Package,
  Calendar
} from 'lucide-react';
import { getInventorySummary, getCategories, type Product } from '../api/inventory';
import { searchCustomers, createCustomer, type Customer } from '../api/customers';
import { createOrder, type CreateOrderPayload } from '../api/orders';
import { getDashboardStatistics, type DashboardStatisticsResponse } from '../api/dashboard';
import { useBranchContext } from '../context/BranchContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

const SalesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();

  // Search, Category filter & Catalog state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [notes, setNotes] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Customer search & Selection state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Quick add customer toggler and input states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');

  // --- API QUERIES ---
  
  // Get inventory summaries for products and their stocks
  const { data: inventorySummaries = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['salesInventorySummary', selectedBranchId],
    queryFn: () => getInventorySummary(selectedBranchId),
  });

  // Get product categories
  const { data: categories = [] } = useQuery({
    queryKey: ['salesCategories'],
    queryFn: getCategories,
  });

  const { data: dashboardStats, isLoading: isLoadingTopProducts } = useQuery<DashboardStatisticsResponse | undefined>({
    queryKey: ['topProducts', selectedBranchId],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      return getDashboardStatistics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        selectedBranchId,
      );
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!selectedBranchId,
  });

  // Search customers query
  const { data: customerData } = useQuery({
    queryKey: ['salesSearchCustomers', customerSearch],
    queryFn: () => searchCustomers(customerSearch, undefined, 1, 10),
    enabled: customerSearch.trim().length > 1,
  });
  const matchedCustomers = customerData?.data || [];

  // --- MUTATIONS ---

  // Quick Create Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: (newCustomer: Partial<Customer>) => createCustomer(newCustomer),
    onSuccess: (data) => {
      setSelectedCustomer(data);
      setCustomerSearch('');
      setIsQuickAddOpen(false);
      setQuickName('');
      setQuickPhone('');
      setQuickAddress('');
      alert('Đã thêm nhanh khách hàng mới thành công!');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.message || 'Không thể thêm khách hàng.');
    }
  });

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: (data) => {
      // Invalidate queries to refresh stock counts
      queryClient.invalidateQueries({ queryKey: ['salesInventorySummary'] });
      alert(`Thanh toán thành công! Mã đơn hàng: ${data.orderCode}`);
      // Clear Cart
      setCart([]);
      setDiscount(0);
      setNotes('');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPaymentMethod('CASH');
      setOrderDate(new Date().toISOString().split('T')[0]);
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.message || 'Có lỗi xảy ra khi tạo đơn hàng.');
    }
  });

  // --- HANDLERS & HELPERS ---

  const handleUpdatePrice = (productId: string, newPrice: number) => {
    const price = Math.max(0, newPrice);
    setCart(cart.map(item => item.product.id === productId ? { ...item, unitPrice: price } : item));
  };

  // Get selling price for specific branch or default to selling/base price
  const getProductPrice = (product: Product): number => {
    if (!product) return 0;
    if (product.branchPrices && selectedBranchId) {
      const bp = product.branchPrices.find(p => p.branchId === selectedBranchId);
      if (bp && bp.price !== undefined && bp.price !== null && Number(bp.price) > 0) {
        return Number(bp.price);
      }
    }
    if (product.sellingPrice && Number(product.sellingPrice) > 0) {
      return Number(product.sellingPrice);
    }
    if (product.salePrice && Number(product.salePrice) > 0) {
      return Number(product.salePrice);
    }
    if (product.price && Number(product.price) > 0) {
      return Number(product.price);
    }
    if (product.basePrice && Number(product.basePrice) > 0) {
      return Number(product.basePrice);
    }
    return 0;
  };

  const handleAddToCart = (product: Product, currentStock: number) => {
    if (currentStock <= 0) {
      alert('Sản phẩm đã hết hàng!');
      return;
    }

    const price = getProductPrice(product);
    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= currentStock) {
        alert(`Không thể mua thêm. Tồn kho tối đa: ${currentStock}`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, unitPrice: price }]);
    }
  };

  const handleUpdateQty = (productId: string, qty: number, maxStock: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }
    if (qty > maxStock) {
      alert(`Không thể vượt quá số lượng tồn kho: ${maxStock}`);
      return;
    }
    setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleQuickCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      alert('Vui lòng điền đủ Tên và Số điện thoại!');
      return;
    }
    createCustomerMutation.mutate({
      fullName: quickName.trim(),
      phone: quickPhone.trim(),
      address: quickAddress.trim(),
    });
  };

  // Cart Calculations
  const subTotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const totalAmount = Math.max(0, subTotal - discount);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    const payload: CreateOrderPayload = {
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      discount: discount,
      paymentMethod: paymentMethod,
      customerId: selectedCustomer?.id || undefined,
      notes: notes,
      status: 'COMPLETED', // Default standard sale order to completed upon checkout
      createdAt: orderDate ? new Date(orderDate).toISOString() : undefined
    };

    createOrderMutation.mutate(payload);
  };

  const topSellingProducts = dashboardStats?.topProducts ?? [];
  const topProductIndex = new Map<string, number>(
    topSellingProducts.map((product, index) => [product.id, index]),
  );

  // Filter products by search & category, sort by best-selling rank
  const filteredProducts = inventorySummaries
    .filter((item: any) => {
      const p = item.product;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm)) ||
        (p.productCode && p.productCode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategoryId === 'ALL' || p.categoryId === selectedCategoryId;
      const isRetail = !p.isService;

      return matchesSearch && matchesCategory && isRetail;
    })
    .sort((a: any, b: any) => {
      const indexA = topProductIndex.get(a.product.id) ?? Number.MAX_SAFE_INTEGER;
      const indexB = topProductIndex.get(b.product.id) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });

  // Take 20 best-selling products when no search query or category filter is set
  const displayedProducts = (searchTerm.trim() === '' && selectedCategoryId === 'ALL')
    ? filteredProducts.slice(0, 20)
    : filteredProducts;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      height: 'calc(100vh - 100px)',
      margin: '-1rem',
      backgroundColor: '#f1f5f9',
      fontFamily: '"Inter", sans-serif',
      overflow: 'hidden'
    }}>
      {/* LEFT COLUMN: CATALOG */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        overflowY: 'hidden',
        borderRight: '1px solid #e2e8f0'
      }}>
        {/* Search and Title Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>TechCare POS Bán Hàng</h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.1rem 0 0' }}>Bán phụ kiện, linh kiện, thiết bị trực tiếp từ kho chi nhánh.</p>
          </div>
          
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên sản phẩm, mã vạch..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                borderRadius: '2rem',
                border: '1px solid #cbd5e1',
                backgroundColor: 'white',
                outline: 'none',
                fontSize: '0.875rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
          </div>
        </div>

        {/* Categories Tabs Row */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          flexShrink: 0
        }}>
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '2rem',
              border: selectedCategoryId === 'ALL' ? 'none' : '1px solid #cbd5e1',
              backgroundColor: selectedCategoryId === 'ALL' ? '#6366f1' : 'white',
              color: selectedCategoryId === 'ALL' ? 'white' : '#64748b',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: selectedCategoryId === 'ALL' ? '0 4px 6px -1px rgba(99,102,241,0.2)' : 'none'
            }}
          >
            Tất cả
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '2rem',
                border: selectedCategoryId === cat.id ? 'none' : '1px solid #cbd5e1',
                backgroundColor: selectedCategoryId === cat.id ? '#6366f1' : 'white',
                color: selectedCategoryId === cat.id ? 'white' : '#64748b',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: selectedCategoryId === cat.id ? '0 4px 6px -1px rgba(99,102,241,0.2)' : 'none'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {isLoadingInventory ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#6366f1' }} />
              Đang tải danh sách hàng hóa...
            </div>
          ) : displayedProducts.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              Không tìm thấy sản phẩm nào.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {displayedProducts.map((item: any) => {
                const p = item.product;
                const price = getProductPrice(p);
                const stock = item.totalStock;
                const isOutOfStock = stock <= 0;
                const isTopSeller = topProductIndex.has(p.id);
                const sellerRank = isTopSeller ? topProductIndex.get(p.id)! + 1 : null;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddToCart(p, stock)}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.65 : 1,
                      transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                      position: 'relative',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        const addBtn = e.currentTarget.querySelector('.add-btn') as HTMLElement;
                        if (addBtn) {
                          addBtn.style.backgroundColor = '#6366f1';
                          addBtn.style.color = '#ffffff';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      const addBtn = e.currentTarget.querySelector('.add-btn') as HTMLElement;
                      if (addBtn) {
                        addBtn.style.backgroundColor = '#e0e7ff';
                        addBtn.style.color = '#6366f1';
                      }
                    }}
                  >
                    {/* Image / Icon container */}
                    <div style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>

                    {/* Product Metadata & Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: '0.725rem', 
                          color: '#64748b', 
                          fontWeight: '600',
                          backgroundColor: '#f1f5f9',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '0.25rem'
                        }}>
                          {p.productCode || 'Chưa có mã'}
                        </span>
                        
                        {isTopSeller && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.25rem',
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fee2e2',
                          }}>
                            🔥 Bán chạy #{sellerRank}
                          </span>
                        )}

                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '0.25rem',
                          backgroundColor: isOutOfStock ? 'rgba(239, 68, 68, 0.1)' : (stock < 5 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                          color: isOutOfStock ? '#ef4444' : (stock < 5 ? '#d97706' : '#059669')
                        }}>
                          {isOutOfStock ? 'Hết hàng' : `Tồn kho: ${stock}`}
                        </span>
                      </div>

                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: 0,
                        lineHeight: '1.25',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={p.name}>
                        {p.name}
                      </h4>
                    </div>

                    {/* Price and Add CTA */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      flexShrink: 0 
                    }}>
                      <div style={{
                        fontSize: '1.05rem',
                        fontWeight: '800',
                        color: '#6366f1',
                      }}>
                        {formatCurrency(price)}
                      </div>

                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isOutOfStock ? '#f1f5f9' : '#e0e7ff',
                        color: isOutOfStock ? '#94a3b8' : '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      className="add-btn"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: GIỎ HÀNG & THANH TOÁN */}
      <div style={{
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.03)',
        overflowY: 'hidden'
      }}>
        {/* Customer Section */}
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={15} color="#6366f1" />
              Khách hàng
            </label>
            <button
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6366f1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 0.25rem'
              }}
            >
              {isQuickAddOpen ? 'Đóng' : '+ Thêm nhanh'}
            </button>
          </div>

          {/* Quick Add Form Panel */}
          {isQuickAddOpen ? (
            <form onSubmit={handleQuickCustomerSubmit} style={{
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <input 
                type="text" 
                placeholder="Tên khách hàng *"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
              />
              <input 
                type="tel" 
                placeholder="Số điện thoại *"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
              />
              <input 
                type="text" 
                placeholder="Địa chỉ"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
              />
              <button 
                type="submit"
                disabled={createCustomerMutation.isPending}
                style={{
                  padding: '0.4rem',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  borderRadius: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                {createCustomerMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                Lưu
              </button>
            </form>
          ) : null}

          {selectedCustomer ? (
            /* Selected customer summary card */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.875rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '0.5rem'
            }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#166534' }}>{selectedCustomer.fullName}</div>
                <div style={{ fontSize: '0.75rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    <Phone size={11} /> {selectedCustomer.phone}
                  </span>
                  {selectedCustomer.walletBalance > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontWeight: '600' }}>
                      <Wallet size={11} /> {formatCurrency(selectedCustomer.walletBalance)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#ef4444'
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Search input autocomplete */
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm khách hàng (Nhập SĐT hoặc họ tên)..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
              {customerSearch.trim().length > 1 && matchedCustomers.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%', left: 0, right: 0,
                  backgroundColor: 'white',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  zIndex: 200,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  marginTop: '0.25rem'
                }}>
                  {matchedCustomers.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch('');
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{c.fullName}</span>
                        <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>({c.phone})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                        {c.walletBalance > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '500' }}>
                            Ví: {formatCurrency(c.walletBalance)}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '500' }}>
                          {c.lastPurchaseDate 
                            ? `Ngày mua: ${new Date(c.lastPurchaseDate).toLocaleDateString('vi-VN')}` 
                            : (c.createdAt ? `Ngày tạo: ${new Date(c.createdAt).toLocaleDateString('vi-VN')}` : 'Mới')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          backgroundColor: '#f8fafc'
        }}>
          {cart.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              gap: '0.5rem',
              padding: '2rem'
            }}>
              <ShoppingCart size={40} strokeWidth={1.5} />
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Giỏ hàng đang trống</span>
            </div>
          ) : (
            cart.map(item => {
              // Find max stock for item in catalog summaries
              const summary = inventorySummaries.find((s: any) => s.product.id === item.product.id);
              const maxStock = summary ? summary.totalStock : 999;
              
              return (
                <div
                  key={item.product.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.3' }}>
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>Giá bán:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '95px',
                            padding: '0.15rem 0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.25rem',
                            outline: 'none',
                            color: '#4f46e5',
                            backgroundColor: '#f8fafc'
                          }}
                          title="Click để sửa đơn giá"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>đ</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.15rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    {/* Quantity changer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.25rem',
                      overflow: 'hidden'
                    }}>
                      <button
                        onClick={() => handleUpdateQty(item.product.id, item.quantity - 1, maxStock)}
                        style={{
                          backgroundColor: '#f8fafc', border: 'none', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', cursor: 'pointer'
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(item.product.id, parseInt(e.target.value, 10) || 0, maxStock)}
                        style={{
                          width: '40px',
                          border: 'none',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          outline: 'none',
                          padding: 0
                        }}
                      />
                      <button
                        onClick={() => handleUpdateQty(item.product.id, item.quantity + 1, maxStock)}
                        style={{
                          backgroundColor: '#f8fafc', border: 'none', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', cursor: 'pointer'
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ fontWeight: '750', fontSize: '0.875rem', color: '#1e293b' }}>
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pricing Summary, Discount, Method & Checkout */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          flexShrink: 0
        }}>
          {/* Invoice Date Input */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
              <Calendar size={14} color="#6366f1" />
              Ngày hóa đơn
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              style={{
                width: '135px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            />
          </div>

          {/* Discount input */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
              <Tag size={14} color="#f59e0b" />
              Chiết khấu (VND)
            </label>
            <input
              type="number"
              min="0"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="0"
              style={{
                width: '120px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                textAlign: 'right',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
              Phương thức thanh toán
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
              {(['CASH', 'TRANSFER', 'CARD'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    padding: '0.45rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '0.375rem',
                    border: paymentMethod === method ? 'none' : '1px solid #cbd5e1',
                    backgroundColor: paymentMethod === method ? '#6366f1' : 'white',
                    color: paymentMethod === method ? 'white' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                >
                  {method === 'CASH' ? 'Tiền mặt' : method === 'TRANSFER' ? 'Chuyển khoản' : 'Thẻ'}
                </button>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <textarea
              placeholder="Ghi chú đơn hàng..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Summary values */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Tạm tính:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(subTotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ef4444' }}>
                <span>Giảm giá:</span>
                <span style={{ fontWeight: '600' }}>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.2rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#0f172a', fontWeight: '800' }}>
              <span>Tổng thanh toán:</span>
              <span style={{ color: '#6366f1', fontSize: '1.1rem' }}>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || createOrderMutation.isPending}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: '700',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: (cart.length === 0 || createOrderMutation.isPending) ? 'not-allowed' : 'pointer',
              opacity: (cart.length === 0 || createOrderMutation.isPending) ? 0.6 : 1,
              boxShadow: '0 4px 6px -1px rgba(16,185,129,0.2)',
              border: 'none'
            }}
          >
            {createOrderMutation.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <ShoppingCart size={18} />
                Thanh toán & Tạo đơn
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
