import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2, 
  Eye, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle, 
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  SlidersHorizontal
} from 'lucide-react';
import { getCustomers, searchCustomers, createCustomer, updateCustomer, deleteCustomer, importCustomersExcel, type Customer } from '../api/customers';
import { type PaginatedResponse } from '../api/client';
import { useBranchContext } from '../context/BranchContext';
import Pagination from '../components/Pagination';
import CustomerModal from '../components/CustomerModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import SearchDrawer from '../components/SearchDrawer';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

interface ExcelRow {
  rowNum: number;
  fullName: string;
  phone: string;
  phoneRaw: string;
  address: string;
  email: string;
  customerType: string;
  notes: string;
  isValid: boolean;
  warning: string;
}

const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { selectedBranchId } = useBranchContext();

  // Right Search Drawer state
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');

  const activeFilterCount = (searchTerm ? 1 : 0) + (customerTypeFilter ? 1 : 0) + (addressFilter ? 1 : 0) + (phoneFilter ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm('');
    setCustomerTypeFilter('');
    setAddressFilter('');
    setPhoneFilter('');
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | undefined>();

  // Excel Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<ExcelRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: { rowNum: number; name: string; phone: string; reason: string }[];
  } | null>(null);

  const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', selectedBranchId, page, searchTerm],
    queryFn: async () => {
      if (searchTerm) {
        return searchCustomers(searchTerm, selectedBranchId, page, 10);
      }
      return getCustomers(selectedBranchId, page, 10);
    },
  });

  const rawCustomers = paginatedData?.data || [];
  const customers = rawCustomers.filter((c: Customer) => {
    const matchesType = !customerTypeFilter || c.customerType === customerTypeFilter;
    const matchesAddress = !addressFilter || (c.address && c.address.toLowerCase().includes(addressFilter.toLowerCase()));
    const matchesPhone = !phoneFilter || (c.phone && c.phone.includes(phoneFilter)) || (c.email && c.email.toLowerCase().includes(phoneFilter.toLowerCase()));
    return matchesType && matchesAddress && matchesPhone;
  });
  const meta = paginatedData?.meta;

  // Reset page when search term or branch changes
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedBranchId]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => {
      const payload: any = { ...data };
      if (selectedBranchId) payload.branchId = selectedBranchId;
      return createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const handleSubmit = async (data: Partial<Customer>) => {
    if (selectedCustomer) {
      await updateMutation.mutateAsync({ id: selectedCustomer.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(undefined);
    setIsModalOpen(true);
  };

  const handleViewDetails = (customer: Customer) => {
    setDetailCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('customers.delete_confirm'))) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete customer:', error);
      }
    }
  };

  // Excel upload and server-side import handler
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportModalOpen(true);
    setIsImporting(true);
    setImportResults(null);
    setPreviewRows([]);

    try {
      const response = await importCustomersExcel(file);
      const success = response.success;
      const failed = response.failed.map(f => ({
        rowNum: f.rowNum,
        name: f.fullName || 'N/A',
        phone: f.phone || 'N/A',
        reason: f.reason
      }));

      setImportResults({ success, failed });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi tệp Excel lên server.';
      alert(Array.isArray(errMsg) ? errMsg.join('; ') : errMsg);
      setIsImportModalOpen(false);
    } finally {
      setIsImporting(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      e.target.value = '';
    }
  };

  const totalValid = previewRows.filter(r => r.isValid).length;
  const totalInvalid = previewRows.length - totalValid;

  return (
    <div style={{ paddingTop: '0.25rem' }}>
      {/* Header section with buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>{t('customers.title')}</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>{t('customers.subtitle')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".xlsx, .xls" 
            onChange={handleImportExcel} 
            style={{ display: 'none' }} 
          />

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('customers.search_placeholder')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            onClick={() => setIsSearchDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <SlidersHorizontal size={16} color="#6366f1" />
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

          <button 
            onClick={() => fileInputRef.current?.click()} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            <FileSpreadsheet size={16} color="#10b981" />
            Nhập từ Excel
          </button>

          <button className="btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}>
            <Plus size={16} />
            {t('customers.add_new')}
          </button>
        </div>
      </div>

      {/* Main Customers table card */}
      <div className="card" style={{ padding: '0' }}>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Mã KH</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('customers.table_name')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('customers.table_contact')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Ngày mua gần nhất</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Người tạo</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Tổng bán</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Nợ cần thu hiện tại</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Tổng bán trừ trả hàng</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>{t('customers.table_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{t('customers.fetching')}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{t('customers.no_customers')}</td>
                </tr>
              ) : customers.map((customer: any) => (
                <tr key={customer.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  {/* Mã KH */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>
                    {customer.code || 'N/A'}
                  </td>
                  {/* Tên */}
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div 
                        onClick={() => handleViewDetails(customer)}
                        style={{ fontWeight: '650', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {customer.fullName}
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.25rem',
                        backgroundColor: customer.customerType === 'Khách VIP' ? '#fef3c7' : 
                                         customer.customerType === 'Khách sỉ' ? '#dcfce7' : 
                                         customer.customerType === 'Đại lý' ? '#e0f2fe' : 
                                         customer.customerType === 'Đối tác' ? '#f3e8ff' : '#f1f5f9',
                        color: customer.customerType === 'Khách VIP' ? '#d97706' : 
                                customer.customerType === 'Khách sỉ' ? '#166534' : 
                                customer.customerType === 'Đại lý' ? '#0369a1' : 
                                customer.customerType === 'Đối tác' ? '#6b21a8' : '#475569'
                      }}>
                        {customer.customerType || 'Khách lẻ'}
                      </span>
                    </div>
                  </td>
                  {/* Liên hệ */}
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <Phone size={14} color="#64748b" />
                        {customer.phone || 'N/A'}
                      </div>
                      {customer.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                          <MapPin size={14} />
                          {customer.address}
                        </div>
                      )}
                    </div>
                  </td>
                  {/* Ngày mua gần nhất */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#475569' }}>
                    {customer.lastPurchaseDate 
                      ? new Date(customer.lastPurchaseDate).toLocaleDateString('vi-VN') 
                      : (customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('vi-VN') : 'Chưa có đơn')}
                  </td>
                  {/* Người tạo */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    {customer.creator || 'N/A'}
                  </td>
                  {/* Tổng bán */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', textAlign: 'right' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(customer.totalSales || 0))}
                  </td>
                  {/* Nợ cần thu */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', color: Number(customer.currentDebt || 0) > 0 ? '#ef4444' : '#1e293b', textAlign: 'right' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(customer.currentDebt || 0))}
                  </td>
                  {/* Tổng bán trừ trả */}
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#059669', textAlign: 'right' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(customer.totalSalesMinusReturns || 0))}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => handleViewDetails(customer)} title="Xem chi tiết" style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#6366f1', cursor: 'pointer', border: 'none' }}>
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(customer)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', border: 'none' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(customer.id)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', border: 'none' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
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

      {/* Customer Modals */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
        onSubmit={handleSubmit}
      />

      {detailCustomer && (
        <CustomerDetailsModal
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setDetailCustomer(undefined); }}
          customer={detailCustomer}
        />
      )}

      {/* EXCEL IMPORT PREVIEW & REPORT MODAL */}
      {isImportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
            maxWidth: '850px',
            maxHeight: '90vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet size={20} color="#10b981" />
                  Xem trước dữ liệu nhập từ Excel
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Kiểm tra tính hợp lệ trước khi đẩy dữ liệu vào hệ thống.
                </p>
              </div>
              <button 
                onClick={() => !isImporting && setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: isImporting ? 'not-allowed' : 'pointer', color: '#94a3b8' }}
                disabled={isImporting}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              
              {/* Progress and status indicators */}
              {!importResults && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  backgroundColor: '#f1f5f9',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  <span style={{ color: '#334155' }}>Dòng tìm thấy: {previewRows.length}</span>
                  <span style={{ color: '#059669' }}>Hợp lệ để tải lên: {totalValid}</span>
                  {totalInvalid > 0 && <span style={{ color: '#ef4444' }}>Cảnh báo/Lỗi: {totalInvalid}</span>}
                </div>
              )}

              {/* Progress bar inside the import modal */}
              {isImporting && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Loader2 size={16} className="animate-spin" color="#6366f1" />
                      Đang gửi và xử lý dữ liệu import trên máy chủ...
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#6366f1',
                    }} />
                  </div>
                </div>
              )}

              {/* Final Import Results Summary */}
              {importResults && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  color: '#166534'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '0.95rem' }}>
                    <CheckCircle2 size={20} color="#166534" />
                    Quá trình Import tệp Excel đã hoàn tất!
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    Thành công: <strong>{importResults.success}</strong> khách hàng đã được đưa vào hệ thống.
                    {importResults.failed.length > 0 && (
                      <span style={{ color: '#b91c1c', marginLeft: '0.5rem' }}>
                        Thất bại: <strong>{importResults.failed.length}</strong> dòng (Xem chi tiết lỗi phía dưới).
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Rows Table or Failure report list */}
              {importResults && importResults.failed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '750', color: '#b91c1c' }}>
                    Danh sách các dòng tải lên thất bại:
                  </div>
                  <div style={{ border: '1px solid #fca5a5', borderRadius: '0.5rem', overflow: 'hidden', maxHeight: '250px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                      <thead style={{ backgroundColor: '#fee2e2', borderBottom: '1px solid #fca5a5' }}>
                        <tr>
                          <th style={{ padding: '0.5rem 1rem', width: '80px', color: '#991b1b' }}>Dòng Excel</th>
                          <th style={{ padding: '0.5rem 1rem', color: '#991b1b' }}>Họ tên</th>
                          <th style={{ padding: '0.5rem 1rem', color: '#991b1b' }}>Số điện thoại</th>
                          <th style={{ padding: '0.5rem 1rem', color: '#991b1b' }}>Nguyên nhân lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.failed.map((f, idx) => (
                          <tr key={idx} style={{ borderBottom: idx === importResults.failed.length - 1 ? 'none' : '1px solid #fee2e2' }}>
                            <td style={{ padding: '0.5rem 1rem', fontWeight: '700', color: '#991b1b' }}>{f.rowNum}</td>
                            <td style={{ padding: '0.5rem 1rem', color: '#1e293b' }}>{f.name}</td>
                            <td style={{ padding: '0.5rem 1rem', color: '#1e293b' }}>{f.phone}</td>
                            <td style={{ padding: '0.5rem 1rem', color: '#b91c1c', fontWeight: '600' }}>{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

            </div>

            {/* Footer */}
            <div style={{
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: isImporting ? 'not-allowed' : 'pointer'
                }}
              >
                {importResults ? 'Đóng' : 'Hủy bỏ'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Tìm kiếm khách hàng"
        subtitle="Lọc thông tin khách hàng theo từ khóa, địa chỉ, loại khách"
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
            placeholder="Tên, mã KH, SĐT, Email..."
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
            Loại khách hàng
          </label>
          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
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
            <option value="">-- Tất cả loại khách --</option>
            <option value="Khách lẻ">Khách lẻ</option>
            <option value="Cá nhân">Cá nhân</option>
            <option value="Doanh nghiệp">Doanh nghiệp</option>
            <option value="Đại lý">Đại lý</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Số điện thoại / Email
          </label>
          <input
            type="text"
            placeholder="Tìm theo SĐT hoặc Email..."
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
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
            Địa chỉ
          </label>
          <input
            type="text"
            placeholder="Nhập địa chỉ..."
            value={addressFilter}
            onChange={(e) => setAddressFilter(e.target.value)}
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

export default CustomersPage;
