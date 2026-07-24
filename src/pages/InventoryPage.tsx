import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, FileDown, Trash2, FileSpreadsheet,
  ChevronRight, Package, Calendar, Building2, User, Receipt, SlidersHorizontal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '../components/Pagination';
import SearchDrawer from '../components/SearchDrawer';
import {
  getImportOrders, deleteImportOrder, processInventoryUpload,
  type ImportOrder
} from '../api/inventory';
import { useBranchContext } from '../context/BranchContext';
import * as XLSX from 'xlsx';

const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Search Drawer state
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [personnelFilter, setPersonnelFilter] = useState('');

  const activeFilterCount = (searchTerm ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (supplierFilter ? 1 : 0) + (personnelFilter ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSupplierFilter('');
    setPersonnelFilter('');
  };

  // Fetch Data
  const { data: paginatedOrders, isLoading } = useQuery({
    queryKey: ['importOrders', selectedBranchId, page, limit],
    queryFn: () => getImportOrders(selectedBranchId!, page, limit),
    enabled: !!selectedBranchId,
  });

  const orders: ImportOrder[] = paginatedOrders?.data || [];
  const meta = paginatedOrders?.meta || { total: 0, page, limit, totalPages: 1 };

  const deleteMutation = useMutation({
    mutationFn: deleteImportOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    }
  });

  const [isImportingLegacy, setIsImportingLegacy] = React.useState(false);
  const [importErrors, setImportErrors] = React.useState<any[]>([]);
  const legacyFileRef = React.useRef<HTMLInputElement | null>(null);

  const handleLegacyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedBranchId) {
      alert('Vui lòng chọn chi nhánh trước khi import.');
      e.target.value = '';
      return;
    }
    setIsImportingLegacy(true);
    setImportErrors([]);
    try {
      const res = await processInventoryUpload(file, selectedBranchId);
      const success = res?.imported ?? res?.success ?? 0;
      const errors = res?.errors ?? res?.failed ?? [];
      if (success > 0) alert(`Import thành công ${success} bản ghi`);
      if (errors.length > 0) {
        setImportErrors(errors);
      }
      queryClient.invalidateQueries({ queryKey: ['importOrders'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Có lỗi khi import');
    } finally {
      setIsImportingLegacy(false);
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredOrders.map((order: ImportOrder, idx: number) => ({
      'STT': idx + 1,
      'Mã phiếu': order.code,
      'Ngày nhập': order.importDate ? new Date(order.importDate).toLocaleDateString('vi-VN') : '--',
      'Nhà cung cấp': order.distributor?.name || '--',
      'Số hóa đơn': order.invoiceName || '--',
      'Người nhập': order.personnelName || '--',
      'Số mặt hàng': order.batches?.length || 0,
      'Tổng tiền': Number(order.totalAmount).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PhieuNhap');
    XLSX.writeFile(wb, `phieu_nhap_kho_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredOrders = orders.filter((order: ImportOrder) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.code?.toLowerCase().includes(q) ||
      order.invoiceName?.toLowerCase().includes(q) ||
      order.distributor?.name?.toLowerCase().includes(q) ||
      order.personnelName?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSupplier = !supplierFilter || order.distributor?.name?.toLowerCase().includes(supplierFilter.toLowerCase());
    const matchesPersonnel = !personnelFilter || order.personnelName?.toLowerCase().includes(personnelFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesSupplier && matchesPersonnel;
  });

  const statusColor = (status: string) => {
    if (status === 'COMPLETED') return { bg: '#dcfce7', text: '#16a34a' };
    if (status === 'CANCELLED') return { bg: '#fee2e2', text: '#dc2626' };
    return { bg: '#fef9c3', text: '#ca8a04' };
  };

  const statusLabel = (status: string) => {
    if (status === 'COMPLETED') return 'Hoàn thành';
    if (status === 'CANCELLED') return 'Đã hủy';
    return 'Nháp';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.25rem 0.5rem', backgroundColor: '#f8fafc', gap: '0.75rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Quản lý nhập kho</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>Danh sách phiếu nhập hàng hóa</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số HĐ..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
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
            className="btn-secondary"
            onClick={() => setIsSearchDrawerOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <SlidersHorizontal size={16} style={{ color: '#6366f1' }} />
            Menu tìm kiếm
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
            style={{ display: 'none' }}
            ref={legacyFileRef}
            onChange={handleLegacyFileChange}
          />
          <button
            className="btn-secondary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <FileDown size={16} />
            Xuất Excel
          </button>
          <button
            className="btn-secondary"
            onClick={() => legacyFileRef.current?.click()}
            disabled={isImportingLegacy}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <FileSpreadsheet size={16} />
            {isImportingLegacy ? 'Đang import...' : 'Import cũ'}
          </button>
          {importErrors.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => {
                const exportData = importErrors.map((err: any, idx: number) => ({
                  STT: idx + 1, DONG: err.row ?? '', PRODUCT: err.product ?? '', REASON: err.reason ?? '',
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Errors');
                XLSX.writeFile(wb, `import_errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
            >
              <FileDown size={16} />
              Tải lỗi ({importErrors.length})
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => navigate('/admin/inventory/import')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.375rem', backgroundColor: '#3b82f6', border: 'none' }}
          >
            <Plus size={16} />
            Nhập hàng
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng phiếu', value: meta.total, icon: Receipt, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Tổng mặt hàng', value: orders.reduce((s, o) => s + (o.batches?.length || 0), 0), icon: Package, color: '#10b981', bg: '#f0fdf4' },
          { label: 'Tổng tiền nhập', value: orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString() + ' ₫', icon: FileDown, color: '#f59e0b', bg: '#fffbeb' },
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={20} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>{stat.label}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ backgroundColor: '#10b981', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>STT</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Receipt size={14} /> Mã phiếu</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Ngày nhập</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Building2 size={14} /> Nhà cung cấp</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Số HĐ</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} /> Người nhập</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}><Package size={14} /> Mặt hàng</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Tổng tiền</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải...</td>
                </tr>
              )}
              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                      <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={32} color="#cbd5e1" />
                      </div>
                      <p style={{ margin: 0, fontWeight: '500' }}>Chưa có phiếu nhập kho nào</p>
                      <button
                        onClick={() => navigate('/admin/inventory/import')}
                        style={{ padding: '0.5rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
                      >
                        + Tạo phiếu nhập
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredOrders.map((order: ImportOrder, idx: number) => {
                const sc = statusColor(order.status);
                const totalItems = order.batches?.length || 0;
                return (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/admin/inventory/orders/${order.id}`)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f8fafc')}
                  >
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{(page - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '0.9rem' }}>{order.code}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                      {order.importDate ? new Date(order.importDate).toLocaleDateString('vi-VN') : '--'}
                    </td>
                    <td style={{ padding: '1rem', color: '#1e293b', fontWeight: '500', fontSize: '0.875rem' }}>
                      {order.distributor?.name || <span style={{ color: '#94a3b8' }}>--</span>}
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                      {order.invoiceName || <span style={{ color: '#94a3b8' }}>--</span>}
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                      {order.personnelName || '--'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '2rem', height: '2rem', borderRadius: '50%',
                        backgroundColor: '#eff6ff', color: '#3b82f6', fontWeight: '700', fontSize: '0.875rem'
                      }}>
                        {totalItems}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                      {Number(order.totalAmount).toLocaleString()} ₫
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '9999px',
                        backgroundColor: sc.bg, color: sc.text,
                        fontSize: '0.75rem', fontWeight: '600'
                      }}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => navigate(`/admin/inventory/orders/${order.id}`)}
                          style={{ padding: '0.35rem 0.75rem', color: '#3b82f6', background: '#eff6ff', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600' }}
                        >
                          Chi tiết <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Xóa phiếu nhập này? Các lô hàng liên quan sẽ không bị xóa.'))
                              deleteMutation.mutate(order.id);
                          }}
                          style={{ padding: '0.35rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        totalItems={meta.total}
      />

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Tìm kiếm phiếu nhập kho"
        subtitle="Lọc phiếu nhập theo mã phiếu, trạng thái, nhà cung cấp"
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
            placeholder="Mã phiếu, số HĐ, NCC, người nhập..."
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
            Trạng thái phiếu nhập
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="PENDING">Nháp / Chờ xử lý</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Nhà cung cấp
          </label>
          <input
            type="text"
            placeholder="Tên nhà cung cấp..."
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
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
            Người thực hiện
          </label>
          <input
            type="text"
            placeholder="Tên người nhập..."
            value={personnelFilter}
            onChange={(e) => setPersonnelFilter(e.target.value)}
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
      </SearchDrawer>
    </div>
  );
};

export default InventoryPage;
