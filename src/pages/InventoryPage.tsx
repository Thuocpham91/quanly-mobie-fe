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
import { formatDate } from '../utils/format';
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
    setPage(1);
  };

  // Fetch every API page so search and filters apply to the complete branch list.
  const { data: orders = [], isLoading } = useQuery<ImportOrder[]>({
    queryKey: ['importOrders', selectedBranchId],
    queryFn: async () => {
      const firstPage = await getImportOrders(selectedBranchId!, 1, 100);
      const allOrders: ImportOrder[] = Array.isArray(firstPage?.data) ? firstPage.data : [];
      const totalPages = Math.max(1, Number(firstPage?.meta?.totalPages || 1));

      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const nextPage = await getImportOrders(selectedBranchId!, currentPage, 100);
        const pageOrders: ImportOrder[] = Array.isArray(nextPage?.data) ? nextPage.data : [];
        if (pageOrders.length === 0) break;
        allOrders.push(...pageOrders);
      }

      return allOrders;
    },
    enabled: !!selectedBranchId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteImportOrder(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['salesInventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productBatches'] });
      queryClient.invalidateQueries({ queryKey: ['productImportHistory'] });
      queryClient.invalidateQueries({ queryKey: ['salesProductsBranchPrices'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa phiếu nhập.');
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
      'Ngày nhập': formatDate(order.importDate || order.createdAt),
      'Nhà cung cấp': order.distributor?.name || '--',
      'Số hóa đơn': order.invoiceName || '--',
      'Người nhập': order.personnelName || '--',
      'Tổng số mặt hàng': order.totalItemCount ?? order.batches?.length ?? 0,
      'Thành tiền': Number(order.totalAmount || 0).toLocaleString(),
      'Tổng tiền hàng': Number(order.totalProductAmount || 0).toLocaleString(),
      'Giảm giá phiếu': Number(order.discountAmount || 0).toLocaleString(),
      'Cần trả NCC': Number(order.debtAmount || 0).toLocaleString(),
      'Tiền đã trả NCC': Number(order.paidAmount || 0).toLocaleString(),
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
  }).sort((a, b) => {
    const dateA = Date.parse(a.importDate || a.createdAt || '');
    const dateB = Date.parse(b.importDate || b.createdAt || '');

    if (!Number.isFinite(dateA)) return Number.isFinite(dateB) ? 1 : 0;
    if (!Number.isFinite(dateB)) return -1;
    return dateB - dateA;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / limit));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredOrders.slice((currentPage - 1) * limit, currentPage * limit);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <div style={{ flex: '0 0 195px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Quản lý nhập kho</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>Danh sách phiếu nhập hàng hóa</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(112px, 1fr))', gap: '0.4rem', flex: '1 1 390px', maxWidth: '440px', minWidth: 0 }}>
          {[
            { label: 'Tổng phiếu', value: orders.length, icon: Receipt, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Tổng mặt hàng', value: orders.reduce((sum, order) => sum + (Number(order.totalItemCount) || order.batches?.length || 0), 0), icon: Package, color: '#10b981', bg: '#f0fdf4' },
            { label: 'Tổng tiền nhập', value: `${orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0).toLocaleString()} ₫`, icon: FileDown, color: '#f59e0b', bg: '#fffbeb' },
          ].map((stat) => (
            <div key={stat.label} style={{ minWidth: 0, backgroundColor: 'white', borderRadius: '0.45rem', padding: '0.4rem 0.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '1.8rem', height: '1.8rem', borderRadius: '0.35rem', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.icon size={14} color={stat.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: '0.05rem', whiteSpace: 'nowrap' }}>{stat.label}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end', flex: '0 1 auto', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '190px', flex: '0 1 190px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số HĐ..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '0.4rem 0.65rem 0.4rem 2rem',
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
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.55rem', fontSize: '0.78rem', borderRadius: '0.375rem', whiteSpace: 'nowrap' }}
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
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.55rem', fontSize: '0.78rem', borderRadius: '0.375rem', whiteSpace: 'nowrap' }}
          >
            <FileDown size={16} />
            Xuất Excel
          </button>
          <button
            className="btn-secondary"
            onClick={() => legacyFileRef.current?.click()}
            disabled={isImportingLegacy}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.55rem', fontSize: '0.78rem', borderRadius: '0.375rem', whiteSpace: 'nowrap' }}
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.55rem', fontSize: '0.78rem', borderRadius: '0.375rem', whiteSpace: 'nowrap' }}
            >
              <FileDown size={16} />
              Tải lỗi ({importErrors.length})
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => navigate('/admin/inventory/import')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.65rem', fontSize: '0.78rem', borderRadius: '0.375rem', backgroundColor: '#3b82f6', border: 'none', whiteSpace: 'nowrap' }}
          >
            <Plus size={16} />
            Nhập hàng
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1450px', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#10b981', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>STT</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Receipt size={14} /> Mã phiếu</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Building2 size={14} /> Nhà cung cấp</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Cần trả NCC</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Tiền đã trả NCC</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}><Package size={14} /> Tổng số mặt hàng</div>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Tổng tiền hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Giảm giá phiếu</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center', whiteSpace: 'nowrap', minWidth: 'max-content' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Ngày nhập</div>
                </th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: '600', fontSize: '0.875rem', width: '10ch', maxWidth: '10ch', whiteSpace: 'nowrap' }}>Người nhập</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải...</td>
                </tr>
              )}
              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: '4rem', textAlign: 'center' }}>
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

              {pageOrders.map((order: ImportOrder, idx: number) => {
                const sc = statusColor(order.status);
                const totalItems = Number(order.totalItemCount) || order.batches?.length || 0;
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
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{(currentPage - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '0.9rem' }}>{order.code}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#1e293b', fontWeight: '500', fontSize: '0.875rem' }}>
                      {order.distributor?.name || <span style={{ color: '#94a3b8' }}>--</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {Number(order.debtAmount ?? (Number(order.totalAmount || 0) - Number(order.paidAmount || 0))).toLocaleString()} ₫
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {Number(order.paidAmount || 0).toLocaleString()} ₫
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap', minWidth: 'max-content' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '2rem', height: '2rem', borderRadius: '50%',
                        backgroundColor: '#eff6ff', color: '#3b82f6', fontWeight: '700', fontSize: '0.875rem'
                      }}>
                        {totalItems}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>
                      {Number(order.totalProductAmount || 0).toLocaleString()} ₫
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>
                      {Number(order.discountAmount || 0).toLocaleString()} ₫
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
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      {formatDate(order.importDate || order.createdAt)}
                    </td>
                    <td title={order.personnelName || '--'} style={{ padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.875rem', width: '10ch', maxWidth: '10ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ width: '10ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.personnelName || '--'}</div>
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
                            if (window.confirm(`Xác nhận xóa phiếu nhập "${order.code}"?\n\nToàn bộ lô hàng và tồn kho của các sản phẩm thuộc phiếu nhập này sẽ được trừ/xóa khỏi hệ thống.`))
                              deleteMutation.mutate(order.id);
                          }}
                          style={{ padding: '0.35rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          title="Xóa phiếu nhập và trừ tồn kho"
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
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filteredOrders.length}
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
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
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
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
            onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }}
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
            onChange={(e) => { setPersonnelFilter(e.target.value); setPage(1); }}
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
