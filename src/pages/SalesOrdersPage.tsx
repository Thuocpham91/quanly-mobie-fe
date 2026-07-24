import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Eye, 
  X, 
  Calendar, 
  User, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Package,
  FileText,
  Clock,
  FileSpreadsheet,
  SlidersHorizontal,
  Receipt
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getOrders, updateOrderStatus, getOrderById, importOrdersExcel, importOrderDetailsExcel, type Order } from '../api/orders';
import Pagination from '../components/Pagination';
import SearchDrawer from '../components/SearchDrawer';
import { useBranchContext } from '../context/BranchContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('vi-VN');
};

const SalesOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();
  
  // Table search, status filter & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Search Drawer state
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);

  // Selected order for details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const importDetailsFileRef = useRef<HTMLInputElement | null>(null);

  const activeFilterCount = (searchTerm ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (paymentFilter !== 'ALL' ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
  };

  // --- API QUERIES ---

  // Get orders list (filters by branchId, customerId etc.)
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['salesOrders', selectedBranchId, page, limit, statusFilter, searchTerm],
    queryFn: () => getOrders(
      page,
      limit,
      undefined,
      undefined,
      searchTerm.trim() || undefined,
      statusFilter === 'ALL' ? undefined : statusFilter,
    ),
  });

  const rawOrders = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // --- DETAIL API QUERY ---
  // To get items and product details for the selected order
  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['salesOrderDetail', selectedOrder?.id],
    queryFn: () => getOrderById(selectedOrder!.id),
    enabled: !!selectedOrder?.id,
  });

  // --- MUTATIONS ---

  // Update Order Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrderDetail', updatedOrder.id] });
      // Update local selected order state
      setSelectedOrder(updatedOrder);
      alert(`Đã cập nhật trạng thái đơn hàng thành công! Trạng thái mới: ${updatedOrder.status}`);
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng.');
    }
  });

  // --- HANDLERS ---

  const handleUpdateStatus = (id: string, status: string) => {
    const statusLabels: Record<string, string> = {
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Hủy đơn',
      PENDING: 'Chờ xử lý'
    };
    if (window.confirm(`Bạn có chắc chắn muốn chuyển trạng thái đơn hàng này thành "${statusLabels[status] || status}"?`)) {
      updateStatusMutation.mutate({ id, status });
    }
  };

  // Filter orders by search term and status locally on the FE for instant reactivity
  const filteredOrders = rawOrders.filter(order => {
    // Branch filter
    if (selectedBranchId && order.branchId !== selectedBranchId) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }

    if (paymentFilter !== 'ALL' && order.paymentMethod !== paymentFilter) {
      return false;
    }

    // Search query (code, customer name, customer phone)
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      const codeMatches = order.orderCode.toLowerCase().includes(query);
      const customerNameMatches = order.customer?.fullName.toLowerCase().includes(query) || false;
      const customerPhoneMatches = order.customer?.phone.includes(query) || false;
      
      return codeMatches || customerNameMatches || customerPhoneMatches;
    }

    return true;
  });

  // Stats calculation
  const completedOrders = rawOrders.filter(o => o.status === 'COMPLETED');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      PENDING: { 
        bg: 'rgba(245, 158, 11, 0.1)', 
        text: '#d97706', 
        label: 'Chờ xử lý',
        icon: <Clock size={12} style={{ marginRight: '0.25rem' }} />
      },
      COMPLETED: { 
        bg: 'rgba(16, 185, 129, 0.1)', 
        text: '#059669', 
        label: 'Đã hoàn thành',
        icon: <CheckCircle2 size={12} style={{ marginRight: '0.25rem' }} />
      },
      CANCELLED: { 
        bg: 'rgba(239, 68, 68, 0.1)', 
        text: '#dc2626', 
        label: 'Đã hủy',
        icon: <XCircle size={12} style={{ marginRight: '0.25rem' }} />
      },
      DRAFT: { 
        bg: 'rgba(100, 116, 139, 0.1)', 
        text: '#475569', 
        label: 'Bản nháp',
        icon: <FileText size={12} style={{ marginRight: '0.25rem' }} />
      },
    };

    const badge = badges[status] || { bg: '#f1f5f9', text: '#475569', label: status, icon: null };

    return (
      <span style={{
        padding: '0.25rem 0.6rem',
        borderRadius: '2rem',
        fontSize: '0.75rem',
        fontWeight: '700',
        backgroundColor: badge.bg,
        color: badge.text,
        display: 'inline-flex',
        alignItems: 'center'
      }}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      CASH: 'Tiền mặt',
      TRANSFER: 'Chuyển khoản',
      CARD: 'Quẹt thẻ'
    };
    return methods[method] || method;
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Mã đơn': 'LEGACY-001',
        'Tên khách hàng': 'Nguyễn Văn A',
        'SĐT khách hàng': '0912345678',
        'Mã sản phẩm': '893000111222',
        'Tên sản phẩm': 'Sản phẩm A',
        'Số lượng': 2,
        'Đơn giá': 50000,
        'Hình thức thanh toán': 'Tiền mặt',
        'Trạng thái': 'COMPLETED',
        'Ghi chú': 'Đơn nhập từ hệ thống cũ'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, 'mau_import_don_hang.xlsx');
  };

  const getErrorFileDownloadUrl = (errorFile?: string, errorFileName?: string) => {
    const normalized = (errorFile || '').replace(/\\/g, '/');
    if (normalized.includes('/uploads/orders/')) {
      const match = normalized.match(/\/uploads\/orders\/.+$/);
      return match ? match[0] : `/uploads/orders/${errorFileName || ''}`;
    }
    if (normalized.startsWith('/app/uploads/')) {
      return normalized.replace('/app/uploads/', '/uploads/');
    }
    if (normalized.startsWith('/uploads/')) {
      return normalized;
    }
    return `/uploads/orders/${errorFileName || ''}`;
  };

  const handleImportOrders = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);
    setImportedCount(null);

    try {
      const response = await importOrdersExcel(file);
      setImportedCount(response.imported || 0);
      const errors = response.errors || [];
      if (errors.length > 0 && response.errorFileName) {
        const link = document.createElement('a');
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:9005';
        const relativePath = getErrorFileDownloadUrl(response.errorFile, response.errorFileName);
        link.href = new URL(relativePath, apiBaseUrl).toString();
        link.download = response.errorFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setImportErrors(errors.map((err: any) => {
        if (typeof err === 'string') return err;
        return `Dòng ${err.row || '?'}: ${err.reason || err.message || JSON.stringify(err)}`;
      }));
      if (response.imported > 0 && errors.length === 0) {
        alert(`Import thành công ${response.imported} đơn hàng!`);
      } else if (errors.length > 0) {
        alert(`Nhập file thành công ${response.imported || 0} đơn hàng, nhưng có ${errors.length} dòng bị lỗi. Tệp ghi chi tiết lỗi đã được tự động tải về.`);
      }
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Lỗi khi import đơn hàng.');
    } finally {
      setIsImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleImportOrderDetails = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);
    setImportedCount(null);

    try {
      // createMissingOrders=true, skipStockDeduction=true by default
      const response = await importOrderDetailsExcel(file);
      setImportedCount(response.imported || 0);
      const errors = response.errors || [];
      if (errors.length > 0 && response.errorFileName) {
        const link = document.createElement('a');
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:9005';
        const relativePath = getErrorFileDownloadUrl(response.errorFile, response.errorFileName);
        link.href = new URL(relativePath, apiBaseUrl).toString();
        link.download = response.errorFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setImportErrors(errors.map((err: any) => {
        if (typeof err === 'string') return err;
        return `Dòng ${err.row || '?'}: ${err.reason || err.message || JSON.stringify(err)}`;
      }));
      if (errors.length > 0) {
        alert(`Một số dòng không import được. Vui lòng kiểm tra chi tiết.`);
      }
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Lỗi khi import chi tiết đơn hàng.');
    } finally {
      setIsImporting(false);
      if (importDetailsFileRef.current) importDetailsFileRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.25rem 0.5rem', backgroundColor: '#f8fafc', gap: '0.75rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Quản lý đơn hàng</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>Danh sách đơn hàng bán lẻ và lịch sử bán hàng</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Header Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn, SĐT..." 
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
            ref={importFileRef}
            onChange={handleImportOrders}
          />
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            ref={importDetailsFileRef}
            onChange={handleImportOrderDetails}
          />

          <button
            className="btn-secondary"
            onClick={() => importFileRef.current?.click()}
            disabled={isImporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <FileSpreadsheet size={16} />
            {isImporting ? 'Đang import...' : 'Import đơn hàng'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => importDetailsFileRef.current?.click()}
            disabled={isImporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <Package size={16} />
            Import chi tiết
          </button>

          <button
            className="btn-secondary"
            onClick={downloadSampleExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <FileText size={16} />
            Mẫu import
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '0.5rem' }}>
        {[
          { label: 'Tổng đơn hàng', value: meta?.total || rawOrders.length, icon: Receipt, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Đã hoàn thành', value: completedOrders.length, icon: CheckCircle2, color: '#10b981', bg: '#f0fdf4' },
          { label: 'Tổng doanh thu', value: formatCurrency(totalRevenue), icon: DollarSign, color: '#f59e0b', bg: '#fffbeb' },
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '0.75rem 1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

      {(importedCount !== null || importErrors.length > 0) && (
        <div className="card" style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          {importedCount !== null && (
            <div style={{ color: '#0f5132', marginBottom: importErrors.length > 0 ? '0.5rem' : 0 }}>
              Đã import thành công {importedCount} đơn hàng.
            </div>
          )}
          {importErrors.length > 0 && (
            <div style={{ color: '#842029' }}>
              <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Lỗi import:</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {importErrors.slice(0, 5).map((error, idx) => (
                  <li key={`${error}-${idx}`}>{error}</li>
                ))}
                {importErrors.length > 5 && <li>...và {importErrors.length - 5} lỗi khác</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Orders Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Mã Đơn</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Thời gian</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Khách hàng</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Thanh toán</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Tổng tiền</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: '#6366f1' }} />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Không tìm thấy đơn hàng nào.
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }}>
                  
                  {/* Order Code */}
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#6366f1' }}>
                    {order.orderCode}
                  </td>
                  
                  {/* Creation Date */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  
                  {/* Customer */}
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                        {order.customer ? order.customer.fullName : 'Khách vãng lai'}
                      </span>
                      {order.customer && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                          {order.customer.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Payment Method */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </td>
                  
                  {/* Status */}
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {getStatusBadge(order.status)}
                  </td>
                  
                  {/* Total Amount */}
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '750', color: '#1e293b' }}>
                    {formatCurrency(order.totalAmount)}
                  </td>
                  
                  {/* Action buttons */}
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      title="Xem chi tiết"
                      style={{
                        padding: '0.4rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Eye size={15} />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination component */}
        {meta && meta.totalPages > 1 && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            totalItems={meta.total}
          />
        )}
      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '680px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                  Chi tiết đơn hàng: {selectedOrder.orderCode}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Thời gian tạo: {formatDate(selectedOrder.createdAt)}
                </span>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Top row: Customer & General Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Thông tin khách hàng
                  </div>
                  {selectedOrder.customer ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{selectedOrder.customer.fullName}</span>
                      <span style={{ color: '#475569' }}>SĐT: {selectedOrder.customer.phone}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>Khách vãng lai</span>
                  )}
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Thông tin giao dịch
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#475569' }}>Trạng thái: {getStatusBadge(selectedOrder.status)}</span>
                    <span style={{ color: '#475569', marginTop: '0.15rem' }}>
                      Thanh toán: <strong style={{ color: '#1e293b' }}>{getPaymentMethodLabel(selectedOrder.paymentMethod)}</strong>
                    </span>
                    {selectedOrder.createdBy && (
                      <span style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                        Tạo bởi: {selectedOrder.createdBy.fullName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                  Danh sách sản phẩm mua
                </div>
                {isLoadingDetails ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    Đang tải danh sách hàng hóa...
                  </div>
                ) : orderDetails?.items ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#64748b' }}>Sản phẩm</th>
                          <th style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#64748b', textAlign: 'center' }}>SL</th>
                          <th style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#64748b', textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#64748b', textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetails.items.map((item: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: idx === orderDetails.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: '600', color: '#1e293b' }}>
                              {item.product?.name || 'Sản phẩm đã xóa'}
                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '400', marginTop: '0.1rem' }}>
                                Code: {item.product?.productCode || 'N/A'}
                              </span>
                            </td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontWeight: '600' }}>
                              {item.quantity}
                            </td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#475569' }}>
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>Không thể lấy thông tin sản phẩm của đơn hàng này.</span>
                )}
              </div>

              {/* Note / Ghi chú */}
              {selectedOrder.notes && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#78350f' }}>
                  <strong>Ghi chú:</strong> {selectedOrder.notes}
                </div>
              )}

              {/* Financial calculations */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                alignSelf: 'flex-end',
                width: '240px',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                  <span>Tạm tính:</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{formatCurrency(selectedOrder.subTotal)}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ef4444' }}>
                    <span>Chiết khấu:</span>
                    <span style={{ fontWeight: '600' }}>-{formatCurrency(Number(selectedOrder.discount))}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#0f172a', fontWeight: '800', marginTop: '0.2rem' }}>
                  <span>Tổng tiền:</span>
                  <span style={{ color: '#6366f1' }}>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

            </div>

            {/* Modal Footer & Actions */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Order status modification controls */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'DRAFT') && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                      disabled={updateStatusMutation.isPending}
                      style={{
                        padding: '0.45rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <CheckCircle2 size={14} /> Hoàn thành đơn
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                      disabled={updateStatusMutation.isPending}
                      style={{
                        padding: '0.45rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <XCircle size={14} /> Hủy đơn
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: '0.45rem 1.25rem',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Lọc đơn hàng"
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>
              Từ khóa tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Mã đơn hàng, tên KH, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>
              Trạng thái đơn hàng
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="DRAFT">Bản nháp</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>
              Hình thức thanh toán
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="ALL">-- Tất cả hình thức --</option>
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản</option>
              <option value="CARD">Quẹt thẻ</option>
            </select>
          </div>
        </div>
      </SearchDrawer>

    </div>
  );
};

export default SalesOrdersPage;
