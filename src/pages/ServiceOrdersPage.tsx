import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Calendar, Clock, MapPin, User, DollarSign, ExternalLink, Clipboard, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { getServiceOrders, createServiceOrder, updateServiceOrder, deleteServiceOrder, type ServiceOrder, type ServiceOrderStatus } from '../api/service-orders';
import ServiceOrderModal from '../components/ServiceOrderModal';
import Pagination from '../components/Pagination';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const ServiceOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | undefined>(undefined);

  // Fetch Service Orders
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['serviceOrders', page, statusFilter, searchTerm],
    queryFn: () => getServiceOrders(page, 10, statusFilter === 'ALL' ? undefined : statusFilter, searchTerm),
  });

  const serviceOrders = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Mutations
  const serviceOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        return updateServiceOrder(id, data);
      } else {
        return createServiceOrder(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      alert(selectedOrder ? 'Cập nhật đơn hàng thành công!' : 'Tạo đơn hàng thành công!');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServiceOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      alert('Đã xóa đơn hàng thành công!');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.message || 'Không thể xóa đơn hàng này.');
    }
  });

  const handleSubmit = async (data: any) => {
    await serviceOrderMutation.mutateAsync({ id: selectedOrder?.id, data });
  };

  const handleAdd = () => {
    setSelectedOrder(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đơn hàng dịch vụ này không?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: ServiceOrderStatus) => {
    const badges = {
      PENDING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', label: 'Chờ xử lý' },
      IN_PROGRESS: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', label: 'Đang sửa' },
      COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', label: 'Hoàn thành' },
      CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', label: 'Đã hủy' },
    };

    const badge = badges[status] || { bg: '#f1f5f9', text: '#475569', label: status };

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '2rem',
        fontSize: '0.75rem',
        fontWeight: '700',
        backgroundColor: badge.bg,
        color: badge.text,
        display: 'inline-block'
      }}>
        {badge.label}
      </span>
    );
  };

  // Summarize stats from the current page
  const stats = React.useMemo(() => {
    const list = serviceOrders;
    return {
      totalCount: meta?.total || list.length,
      pendingCount: list.filter(o => o.status === 'PENDING').length,
      completedRevenue: list.filter(o => o.status === 'COMPLETED').reduce((acc, o) => acc + (Number(o.quotedAmount) - Number(o.discount)), 0),
    };
  }, [serviceOrders, meta]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--foreground)', marginBottom: '0.25rem' }}>Đơn hàng dịch vụ</h1>
          <p style={{ color: '#64748b' }}>Quản lý đơn sửa chữa, bảo dưỡng thiết bị máy tính, điện thoại di động.</p>
        </div>
        <button onClick={handleAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <Plus size={18} />
          Tạo đơn dịch vụ
        </button>
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--primary)' }}>
            <Clipboard size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: '500' }}>Tổng số đơn hàng</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: '0.2rem 0 0' }}>{stats.totalCount}</h3>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: '500' }}>Đơn chờ xử lý</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706', margin: '0.2rem 0 0' }}>{stats.pendingCount}</h3>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: '#059669' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: '500' }}>Doanh thu hoàn thành (Trang này)</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669', margin: '0.2rem 0 0' }}>{formatCurrency(stats.completedRevenue)}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, địa chỉ, khách hàng..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Filter Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'PENDING', label: 'Chờ xử lý' },
              { value: 'IN_PROGRESS', label: 'Đang sửa' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
              { value: 'CANCELLED', label: 'Đã hủy' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '2rem',
                  border: statusFilter === tab.value ? 'none' : '1px solid var(--border)',
                  backgroundColor: statusFilter === tab.value ? 'var(--primary)' : 'white',
                  color: statusFilter === tab.value ? 'white' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Mã Đơn</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Khách hàng</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Hẹn / Deadline</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Địa chỉ / Bản đồ</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Công việc</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Giá trị</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách đơn dịch vụ...</td>
                </tr>
              ) : serviceOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy đơn hàng dịch vụ nào.</td>
                </tr>
              ) : serviceOrders.map((order) => {
                const finalAmount = Number(order.quotedAmount) - Number(order.discount);
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    
                    {/* Code */}
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                      {order.orderCode}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                          {order.customer ? order.customer.fullName : 'Khách vãng lai'}
                        </span>
                        {order.customer && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {order.customer.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date/Deadline */}
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={13} color="var(--primary)" />
                          {formatDate(order.appointmentDate)} {order.appointmentTime ? `(${order.appointmentTime})` : ''}
                        </span>
                        {order.deadline && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#e11d48' }}>
                            <Clock size={13} />
                            DL: {formatDate(order.deadline)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Address & Map Link */}
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#475569', maxWidth: '180px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={order.address}>
                          {order.address || 'N/A'}
                        </span>
                        {order.customerLocation && (
                          <a
                            href={order.customerLocation}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', fontWeight: '600' }}
                          >
                            <ExternalLink size={12} /> Bản đồ
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Job Details */}
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', maxWidth: '200px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontWeight: '600', color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={order.jobDescription}>
                          {order.jobDescription || 'N/A'}
                        </span>
                        {order.completedItems && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontStyle: 'italic' }}>
                            Đã làm: {order.completedItems}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Quoted / Discount */}
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: '750', color: '#1e293b', fontSize: '0.9rem' }}>
                          {formatCurrency(finalAmount)}
                        </span>
                        {Number(order.discount) > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>
                            Giảm: -{formatCurrency(Number(order.discount))}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEdit(order)}
                          title="Sửa đơn hàng"
                          style={{
                            padding: '0.4rem', border: 'none', borderRadius: '0.375rem',
                            cursor: 'pointer', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)'
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          title="Xóa đơn hàng"
                          style={{
                            padding: '0.4rem', border: 'none', borderRadius: '0.375rem',
                            cursor: 'pointer', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            totalItems={meta.total}
          />
        )}
      </div>

      {/* Modal */}
      <ServiceOrderModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedOrder(undefined); }}
        onSubmit={handleSubmit}
        serviceOrder={selectedOrder}
      />
    </div>
  );
};

export default ServiceOrdersPage;
