import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Eye, Calendar, CreditCard, Banknote, Building, CheckCircle, XCircle, Clock, Printer, Search, X } from 'lucide-react';
import { getOrders, getOrderById, updateOrderStatus, type Order } from '../api/orders';
import { useBranchContext } from '../context/BranchContext';
import Pagination from '../components/Pagination';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const OrdersHistoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: selectedOrder, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['order', selectedOrderId],
    queryFn: () => getOrderById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['orders', selectedBranchId, page, 10],
    queryFn: () => getOrders(page, 10),
  });

  const orders = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Reset page khi đổi filter / search / branch
  React.useEffect(() => { setPage(1); }, [selectedBranchId, statusFilter, searchTerm]);

  const orderMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'CANCELLED' }) => updateOrderStatus(id, status),
    onSuccess: (data) => {
      alert(data.status === 'COMPLETED' ? 'Thanh toán đơn hàng thành công!' : 'Đã hủy đơn hàng!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrderId] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đơn hàng.');
    }
  });

  const filteredOrders = orders.filter(order => {
    const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q ||
      order.orderCode?.toLowerCase().includes(q) ||
      (order.customer as any)?.fullName?.toLowerCase().includes(q) ||
      (order.customer as any)?.phone?.includes(q) ||
      (order as any)?.createdBy?.fullName?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' 
          }}>
            <CheckCircle size={12} /> Hoàn thành
          </span>
        );
      case 'DRAFT':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' 
          }}>
            <Clock size={12} /> Đơn nháp
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' 
          }}>
            <XCircle size={12} /> Đã hủy
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: '#e2e8f0', color: '#64748b' 
          }}>
            {status}
          </span>
        );
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Banknote size={14} color="#22c55e" /> Tiền mặt</div>;
      case 'TRANSFER':
        return <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building size={14} color="#3b82f6" /> Chuyển khoản</div>;
      case 'CARD':
        return <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CreditCard size={14} color="#ec4899" /> Thẻ / POS</div>;
      default:
        return method;
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map((item, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product?.name || 'Sản phẩm/Dịch vụ'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(Number(item.unitPrice))}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
      </tr>
    `).join('');

    const customerName = order.customer ? (order.customer as any).fullName : 'Khách lẻ';
    const customerPhone = order.customer ? (order.customer as any).phone || 'N/A' : 'N/A';
    const petName = (order as any).pet ? `${(order as any).pet.name} (${(order as any).pet.species})` : 'Khách lẻ';

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn ${order.orderCode}</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #333; padding: 20px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #666; }
            .info-table { width: 100%; margin-bottom: 20px; font-size: 14px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            .items-table th { background-color: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
            .summary { float: right; width: 300px; font-size: 14px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-size: 16px; font-weight: bold; color: #000; border-top: 1px dashed #333; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PHÒNG KHÁM THÚ Y PKCARE</div>
            <div class="subtitle">Dịch vụ chăm sóc & Điều trị thú cưng tận tâm</div>
            <div class="subtitle" style="margin-top: 5px;">Mã hóa đơn: <strong>${order.orderCode}</strong></div>
          </div>

          <table class="info-table">
            <tr>
              <td style="width: 50%;"><strong>Khách hàng:</strong> ${customerName}</td>
              <td><strong>Ngày tạo:</strong> ${new Date(order.createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>Số điện thoại:</strong> ${customerPhone}</td>
              <td><strong>Thú cưng:</strong> ${petName}</td>
            </tr>
            <tr>
              <td><strong>Phương thức:</strong> ${order.paymentMethod === 'CASH' ? 'Tiền mặt' : order.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Thẻ / POS'}</td>
              <td><strong>Trạng thái:</strong> ${order.status === 'COMPLETED' ? 'Đã thanh toán' : order.status === 'DRAFT' ? 'Đơn nháp' : 'Đã hủy'}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50px;">STT</th>
                <th>Tên mặt hàng / Dịch vụ</th>
                <th style="width: 80px; text-align: center;">SL</th>
                <th style="width: 120px; text-align: right;">Đơn giá</th>
                <th style="width: 120px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Tạm tính:</span>
              <span>${formatCurrency(Number(order.subTotal))}</span>
            </div>
            ${Number(order.discount) > 0 ? `
              <div class="summary-row" style="color: red;">
                <span>Giảm giá:</span>
                <span>-${formatCurrency(Number(order.discount))}</span>
              </div>
            ` : ''}
            ${Number((order as any).walletCreditAmount) > 0 ? `
              <div class="summary-row" style="color: #8b5cf6;">
                <span>Tích lũy ví:</span>
                <span>+${formatCurrency(Number((order as any).walletCreditAmount))}</span>
              </div>
            ` : ''}
            <div class="summary-row total">
              <span>Tổng thanh toán:</span>
              <span>${formatCurrency(Number(order.totalAmount))}</span>
            </div>
          </div>

          <div style="clear: both;"></div>

          <div class="footer">
            <p>Cảm ơn quý khách đã tin tưởng dịch vụ của PKCare!</p>
            <p>Hotline: 1900 xxxx - PKCare.vn</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Lịch sử đơn hàng</h1>
          <p style={{ color: '#64748b' }}>Xem và quản lý tất cả đơn bán hàng, đơn nháp của chi nhánh.</p>
        </div>
        {/* Search bar */}
        <div style={{ position: 'relative', minWidth: '300px', flex: '0 0 auto' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Tìm mã đơn, khách hàng, SĐT..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '0.6rem 2.5rem 0.6rem 2.25rem',
              borderRadius: '0.625rem',
              border: '1.5px solid var(--border)',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setPage(1); }}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '0.1rem' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '0.25rem', overflowX: 'auto' }}>
        {(['ALL', 'COMPLETED', 'DRAFT', 'CANCELLED'] as const).map(tab => {
          const count = tab === 'ALL'
            ? orders.filter(o => !searchTerm || filteredOrders.includes(o)).length
            : orders.filter(o => o.status === tab && (filteredOrders.includes(o) || !searchTerm)).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '0.75rem 1.1rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: statusFilter === tab ? 'var(--primary)' : '#64748b',
                borderBottom: statusFilter === tab ? '2px solid var(--primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {tab === 'ALL' && 'Tất cả'}
              {tab === 'COMPLETED' && 'Hoàn thành'}
              {tab === 'DRAFT' && 'Đơn nháp'}
              {tab === 'CANCELLED' && 'Đã hủy'}
              <span style={{
                fontSize: '0.7rem', fontWeight: '700',
                padding: '0.1rem 0.4rem', borderRadius: '9999px',
                backgroundColor: statusFilter === tab ? 'rgba(99,102,241,0.12)' : '#f1f5f9',
                color: statusFilter === tab ? 'var(--primary)' : '#64748b',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Mã Đơn</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Khách hàng</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Ngày tạo</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Thanh toán</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Tổng tiền</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách đơn hàng...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy đơn hàng nào.</td>
                </tr>
              ) : filteredOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShoppingBag size={16} />
                      {order.orderCode}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {order.customer ? (order.customer as any).fullName : 'Khách lẻ'}
                      </div>
                      {order.customer && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {(order.customer as any).phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} />
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                    {getPaymentMethodIcon(order.paymentMethod)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {getStatusBadge(order.status)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700', color: 'var(--foreground)' }}>
                    {formatCurrency(Number(order.totalAmount))}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => setSelectedOrderId(order.id)}
                      style={{ 
                        padding: '0.35rem 0.75rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--primary)',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={14} /> Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination luôn hiển thị khi có data */}
        {meta && meta.totalPages >= 1 && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
              totalItems={meta.total}
            />
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Chi tiết Đơn hàng: {selectedOrder?.orderCode || '...'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOrderId(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <XCircle size={22} />
              </button>
            </div>

            {isLoadingDetail ? (
              <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b' }}>
                Đang tải chi tiết đơn hàng...
              </div>
            ) : !selectedOrder ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444' }}>
                Không tìm thấy thông tin đơn hàng này.
              </div>
            ) : (
              <>
                <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Order Info Cards Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    
                    {/* Customer & Pet Details */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                        Thông tin Khách hàng
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                          {selectedOrder.customer ? (selectedOrder.customer as any).fullName : 'Khách lẻ'}
                        </span>
                        {selectedOrder.customer && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            SĐT: {(selectedOrder.customer as any).phone}
                          </span>
                        )}
                        {(selectedOrder as any).pet && (
                          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: '#64748b' }}>Thú cưng:</span>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                              {(selectedOrder as any).pet.name} ({(selectedOrder as any).pet.species === 'Dog' ? 'Chó' : 'Mèo'})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                        Thông tin hóa đơn
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Trạng thái:</span>
                          {getStatusBadge(selectedOrder.status)}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Thanh toán:</span>
                          {getPaymentMethodIcon(selectedOrder.paymentMethod)}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Thu ngân:</span>
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>
                            {selectedOrder.createdBy ? (selectedOrder.createdBy as any).fullName : 'Hệ thống'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Thời gian:</span>
                          <span style={{ color: '#475569' }}>
                            {new Date(selectedOrder.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Items List */}
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155', marginBottom: '0.5rem', marginTop: 0 }}>
                      Chi tiết sản phẩm / Dịch vụ
                    </h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: '600' }}>
                            <th style={{ padding: '0.6rem 1rem' }}>Sản phẩm / Dịch vụ</th>
                            <th style={{ padding: '0.6rem 1rem', width: '80px', textAlign: 'center' }}>SL</th>
                            <th style={{ padding: '0.6rem 1rem', width: '120px', textAlign: 'right' }}>Đơn giá</th>
                            <th style={{ padding: '0.6rem 1rem', width: '120px', textAlign: 'right' }}>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === selectedOrder.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: '#1e293b' }}>
                                {item.product?.name || 'Sản phẩm/Dịch vụ'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                                {item.quantity}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b' }}>
                                {formatCurrency(Number(item.unitPrice))}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                                {formatCurrency(Number(item.unitPrice) * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div style={{ 
                    borderTop: '1px dashed #e2e8f0', 
                    paddingTop: '1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem', 
                    fontSize: '0.88rem', 
                    marginLeft: 'auto', 
                    width: '300px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Tạm tính:</span>
                      <span style={{ fontWeight: '500', color: '#334155' }}>
                        {formatCurrency(Number(selectedOrder.subTotal))}
                      </span>
                    </div>
                    {Number(selectedOrder.discount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                        <span>Giảm giá:</span>
                        <span>-{formatCurrency(Number(selectedOrder.discount))}</span>
                      </div>
                    )}
                    {Number(selectedOrder.walletCreditAmount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6', fontWeight: '600' }}>
                        <span>Tích lũy ví:</span>
                        <span>+{formatCurrency(Number(selectedOrder.walletCreditAmount))}</span>
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontWeight: '800', 
                      fontSize: '1.15rem', 
                      color: 'var(--primary)',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '0.5rem',
                      marginTop: '0.25rem'
                    }}>
                      <span>Tổng thanh toán:</span>
                      <span>{formatCurrency(Number(selectedOrder.totalAmount))}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Modal Actions */}
                <div style={{ 
                  padding: '1rem 1.5rem', 
                  backgroundColor: '#f8fafc', 
                  borderTop: '1px solid #e2e8f0', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  gap: '1rem' 
                }}>
                  <button
                    onClick={() => handlePrint(selectedOrder)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: '#475569',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <Printer size={16} />
                    In Hóa Đơn
                  </button>

                  {selectedOrder.status === 'DRAFT' ? (
                    <div style={{ display: 'flex', gap: '0.75rem', flex: 1, justifyContent: 'flex-end' }}>
                      <button
                        disabled={orderMutation.isPending}
                        onClick={() => orderMutation.mutate({ id: selectedOrder.id, status: 'CANCELLED' })}
                        style={{
                          padding: '0.6rem 1.25rem', border: '1px solid #ef4444', color: '#ef4444', 
                          backgroundColor: 'white', borderRadius: '0.5rem', fontWeight: '600', 
                          cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        Hủy đơn
                      </button>
                      <button
                        disabled={orderMutation.isPending}
                        onClick={() => orderMutation.mutate({ id: selectedOrder.id, status: 'COMPLETED' })}
                        style={{
                          padding: '0.6rem 1.25rem', border: 'none', color: 'white', 
                          backgroundColor: 'var(--primary)', borderRadius: '0.5rem', fontWeight: '600', 
                          cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s',
                          boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-hover, #4f46e5)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                      >
                        {orderMutation.isPending ? 'Đang xử lý...' : 'Thanh toán & Xuất kho'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedOrderId(null)}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        backgroundColor: '#64748b',
                        color: 'white',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginLeft: 'auto'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#475569'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#64748b'}
                    >
                      Đóng
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersHistoryPage;
