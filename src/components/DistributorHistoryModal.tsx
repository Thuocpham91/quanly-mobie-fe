import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Receipt, Building2, Phone, Mail, MapPin, Calendar, Package, Search, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImportOrders, type ImportOrder } from '../api/inventory';
import { type Distributor } from '../api/distributors';
import { formatDate } from '../utils/format';

interface DistributorHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributor?: Distributor;
}

const DistributorHistoryModal: React.FC<DistributorHistoryModalProps> = ({
  isOpen,
  onClose,
  distributor,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: paginatedOrders, isLoading } = useQuery({
    queryKey: ['importOrders', 'distributor', distributor?.id],
    queryFn: () => getImportOrders(undefined, 1, 500, distributor?.id),
    enabled: isOpen && !!distributor,
  });

  if (!isOpen || !distributor) return null;

  const rawOrders: ImportOrder[] = paginatedOrders?.data || [];

  // Filter orders for this distributor (handling server or client filtering)
  const distributorOrders = rawOrders.filter((order) => {
    if (!order) return false;
    const matchesDistributor =
      order.distributorId === distributor.id ||
      order.distributor?.id === distributor.id ||
      (order.distributor?.name && order.distributor.name.toLowerCase().trim() === distributor.name.toLowerCase().trim());
    return matchesDistributor;
  });

  const filteredOrders = distributorOrders.filter((order) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      order.code?.toLowerCase().includes(q) ||
      order.invoiceName?.toLowerCase().includes(q) ||
      order.personnelName?.toLowerCase().includes(q)
    );
  });

  const totalSpent = distributorOrders.reduce((sum, order) => {
    if (order.status === 'CANCELLED') return sum;
    return sum + Number(order.totalAmount || 0);
  }, 0);

  const totalItemsCount = distributorOrders.reduce((sum, order) => {
    return sum + (order.batches?.length || 0);
  }, 0);

  const statusColor = (status: string) => {
    if (status === 'COMPLETED') return { bg: '#dcfce7', text: '#16a34a', label: 'Hoàn thành' };
    if (status === 'CANCELLED') return { bg: '#fee2e2', text: '#dc2626', label: 'Đã hủy' };
    return { bg: '#fef9c3', text: '#ca8a04', label: 'Nháp' };
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          margin: 'auto',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.5rem',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                color: '#3b82f6',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Lịch sử nhập hàng — {distributor.name}
                </h2>
                {isLoading && (
                  <Loader2 size={18} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} title="Đang tải dữ liệu..." />
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: '0.8rem', color: '#64748b' }}>
                {distributor.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Phone size={12} /> {distributor.phone}
                  </span>
                )}
                {distributor.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Mail size={12} /> {distributor.email}
                  </span>
                )}
                {distributor.address && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {distributor.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.5rem',
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                }}
              >
                <Receipt size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Tổng tiền đã nhập</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#047857' }}>
                  {totalSpent.toLocaleString('vi-VN')} ₫
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.5rem',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                }}
              >
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Số đơn nhập kho</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>
                  {distributorOrders.length} đơn
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fffbeb',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                }}
              >
                <Package size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Tổng mặt hàng</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>
                  {totalItemsCount} lượt mặt hàng
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Content Table */}
        <div style={{ padding: '1rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ marginBottom: '0.85rem', position: 'relative', maxWidth: '320px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số HĐ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#10b981', color: 'white', position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600' }}>STT</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600' }}>Mã phiếu</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600' }}>Ngày nhập</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600' }}>Số HĐ</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600' }}>Người nhập</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center' }}>Số mặt hàng</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600', textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                        <Loader2 size={32} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Đang tải lịch sử nhập hàng...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      Chưa có phiếu nhập hàng nào từ nhà phân phối này
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, idx) => {
                    const sc = statusColor(order.status);
                    return (
                      <tr
                        key={order.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                        onClick={() => {
                          onClose();
                          navigate(`/admin/inventory/orders/${order.id}`);
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.85rem' }}>{idx + 1}</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '700', color: '#2563eb', fontSize: '0.85rem' }}>
                            {order.code}
                            <ExternalLink size={12} />
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569', fontSize: '0.85rem' }}>
                          {formatDate(order.importDate || order.createdAt)}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569', fontSize: '0.85rem' }}>
                          {order.invoiceName || '--'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569', fontSize: '0.85rem' }}>
                          {order.personnelName || '--'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem' }}>
                          {order.batches?.length || 0}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#1e293b', fontSize: '0.85rem' }}>
                          {Number(order.totalAmount || 0).toLocaleString('vi-VN')} ₫
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor: sc.bg,
                              color: sc.text,
                              fontSize: '0.75rem',
                              fontWeight: '600',
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justify: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              color: '#334155',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributorHistoryModal;
