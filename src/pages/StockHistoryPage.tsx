import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, TrendingUp, TrendingDown, Tag } from 'lucide-react';
import api from '../api/client';
import Pagination from '../components/Pagination';

interface StockLog {
  id: string;
  productId: string;
  product: {
    name: string;
    productCode?: string;
  };
  type: 'IMPORT' | 'EXPORT' | 'SALE' | 'ADJUST';
  quantity: number;
  batchId?: string;
  referenceCode?: string;
  note?: string;
  createdAt: string;
  createdBy?: {
    fullName: string;
  };
}

const StockHistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['stockHistory', page],
    queryFn: async () => {
      const response = await api.get(`/inventory/history?page=${page}&limit=10`);
      return response.data;
    },
  });

  const logs = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IMPORT':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' 
          }}>
            Nhập kho
          </span>
        );
      case 'SALE':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' 
          }}>
            Bán lẻ (POS)
          </span>
        );
      case 'EXPORT':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' 
          }}>
            Xuất kho
          </span>
        );
      case 'ADJUST':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'rgb(234, 179, 8)' 
          }}>
            Điều chỉnh
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
            borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
            backgroundColor: '#e2e8f0', color: '#64748b' 
          }}>
            {type}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Lịch sử biến động kho</h1>
        <p style={{ color: '#64748b' }}>Theo dõi lịch sử xuất, nhập, bán hàng và điều chỉnh số lượng tồn kho.</p>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Thời gian</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Sản phẩm</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Loại biến động</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>Số lượng thay đổi</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Mã đối chiếu</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Người thực hiện</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải lịch sử kho...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không có biến động kho nào được ghi nhận.</td>
                </tr>
              ) : logs.map((log: StockLog) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--foreground)' }}>
                        {log.product?.name}
                      </div>
                      {log.product?.productCode && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Tag size={12} />
                          {log.product.productCode}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {getTypeBadge(log.type)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: log.quantity > 0 ? '#22c55e' : '#ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      {log.quantity > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary)' }}>
                    {log.referenceCode || '-'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={14} />
                      {log.createdBy?.fullName || 'Hệ thống'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <Pagination 
            currentPage={meta.page} 
            totalPages={meta.totalPages} 
            onPageChange={setPage} 
            totalItems={meta.total}
          />
        )}
      </div>
    </div>
  );
};

export default StockHistoryPage;
