import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Filter, CheckCircle, XCircle } from 'lucide-react';
import { getStocktakes, StocktakeStatus, approveStocktake } from '../api/stocktakes';
import { useBranchContext } from '../context/BranchContext';

const StocktakeListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: stocktakes = [], isLoading } = useQuery({
    queryKey: ['stocktakes', selectedBranchId],
    queryFn: () => getStocktakes(selectedBranchId!),
    enabled: !!selectedBranchId,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'CANCELLED' }) =>
      approveStocktake(id, status),
    onSuccess: (_, variables) => {
      const actionText = variables.status === StocktakeStatus.COMPLETED ? 'Duyệt' : 'Hủy';
      alert(`${actionText} phiếu kiểm kho thành công!`);
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      alert(`Thao tác thất bại: ${err?.response?.data?.message || err?.message || 'Không rõ lỗi'}`);
    }
  });

  const handleApprove = (id: string, status: 'COMPLETED' | 'CANCELLED') => {
    const actionText = status === StocktakeStatus.COMPLETED ? 'duyệt' : 'hủy';
    if (window.confirm(`Bạn có chắc muốn ${actionText} phiếu kiểm kho này?`)) {
      approveMutation.mutate({ id, status });
    }
  };

  const filteredStocktakes = stocktakes.filter(st => {
    const matchesSearch = st.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || st.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: StocktakeStatus) => {
    switch (status) {
      case StocktakeStatus.PENDING:
        return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fef3c7', color: '#d97706' }}>Chờ duyệt</span>;
      case StocktakeStatus.COMPLETED:
        return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#d1fae5', color: '#059669' }}>Đã hoàn thành</span>;
      case StocktakeStatus.CANCELLED:
        return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#fee2e2', color: '#dc2626' }}>Đã hủy</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b', margin: '0 0 0.25rem 0' }}>Kiểm kho</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Quản lý các phiếu kiểm kê và điều chỉnh kho</p>
        </div>
        <button 
          onClick={() => navigate('/admin/inventory/stocktakes/new')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
            backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem',
            fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
          }}
        >
          <Plus size={18} /> Tạo phiếu kiểm kho
        </button>
      </div>

      {/* Main Content */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        
        {/* Filters */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm theo mã phiếu..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem',
                borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
            <Filter size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value={StocktakeStatus.PENDING}>Chờ duyệt</option>
              <option value={StocktakeStatus.COMPLETED}>Đã hoàn thành</option>
              <option value={StocktakeStatus.CANCELLED}>Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Mã phiếu</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Ngày tạo</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Người tạo</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Ghi chú</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
              ) : filteredStocktakes.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Không có phiếu kiểm kho nào.</td></tr>
              ) : (
                filteredStocktakes.map(st => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>{st.code}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{new Date(st.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{st.createdBy?.fullName || '---'}</td>
                    <td style={{ padding: '1rem' }}>{getStatusBadge(st.status)}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{st.note || '---'}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => navigate(`/admin/inventory/stocktakes/${st.id}`)}
                        style={{ padding: '0.4rem 0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                      >
                        <Eye size={14} /> Chi tiết
                      </button>
                      {st.status === StocktakeStatus.PENDING && (
                        <>
                          <button 
                            onClick={() => handleApprove(st.id, StocktakeStatus.COMPLETED)}
                            disabled={approveMutation.isPending}
                            style={{ padding: '0.4rem 0.75rem', backgroundColor: '#d1fae5', color: '#059669', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                          >
                            <CheckCircle size={14} /> Duyệt
                          </button>
                          <button 
                            onClick={() => handleApprove(st.id, StocktakeStatus.CANCELLED)}
                            disabled={approveMutation.isPending}
                            style={{ padding: '0.4rem 0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                          >
                            <XCircle size={14} /> Hủy
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StocktakeListPage;
