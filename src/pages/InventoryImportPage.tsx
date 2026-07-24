import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, ArrowLeft, Trash2, Save, FileSpreadsheet, 
  Edit2, Calendar, Building2, FileText, User,
  Wallet, TicketPercent, Truck, Banknote, SlidersHorizontal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  getProducts, bulkCreateInventoryBatches, getUnits, createProduct, 
  getInventoryBatch, updateInventoryBatch, processInventoryUpload, type Product,
  createImportOrder,
} from '../api/inventory';
import { getDistributors } from '../api/distributors';
import { getUsers } from '../api/users';
import { useBranchContext } from '../context/BranchContext';
import { formatNumber, parseNumber } from '../utils/format';
import * as XLSX from 'xlsx';
import ProductModal from '../components/ProductModal';
import ProductPickerModal from '../components/ProductPickerModal';
import EditItemModal from '../components/EditItemModal';
import SearchDrawer from '../components/SearchDrawer';


interface ImportItem {
  id: string;
  product: Product;
  unitQuantities: Record<string, number>; // New multi-unit storage
  quantityPieces: number; // Total pieces (cached for UI)
  baseUnitId: string;
  costPrice: number;
  priceType: 'base' | 'packaging';
  expiryDate: string;
  isGift: boolean;
  conversionFactor?: number; // kept for legacy compat if needed
  quantityBoxes?: number; // kept for legacy compat if needed
  packagingUnitId?: string; // kept for legacy compat if needed
}

const normalizeHeader = (value: unknown) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const getNumberValue = (value: unknown) => {
  if (value === undefined || value === null) return 0;
  const text = String(value).replace(/\s+/g, '').replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const InventoryImportPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();

  const currentUser = useMemo(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, []);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role || currentUser.userRole;
    return role?.toLowerCase() === 'admin';
  }, [currentUser]);

  const { data: editingBatch, isLoading: isLoadingBatch } = useQuery({
    queryKey: ['inventoryBatch', editId],
    queryFn: () => getInventoryBatch(editId!),
    enabled: !!editId
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateInventoryBatch(editId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      navigate('/admin/inventory');
    }
  });

  useEffect(() => {
    if (editingBatch && editId) {
      setImportDate(editingBatch.importDate ? new Date(editingBatch.importDate).toISOString().split('T')[0] : '');
      setDistributorId(editingBatch.distributorId || '');
      setDistributorSearch(editingBatch.distributor?.name || '');
      setInvoiceName(editingBatch.invoiceName || '');
      setPersonnelId(editingBatch.personnelName || '');
      setTaxPercentage(editingBatch.taxAmount ? (editingBatch.taxAmount / (editingBatch.costPrice || 1)) * 100 : 0); // Simplified back-calc
      setDiscountValue(editingBatch.discountAmount || 0);
      setDiscountType('fixed');
      setShippingFee(editingBatch.shippingFee || 0);
      
      // Calculate total for the item
      // Note: In our new system costPrice is total.
      const newItem: ImportItem = {
        id: editingBatch.id,
        product: editingBatch.product!,
        unitQuantities: { [editingBatch.unitId || editingBatch.product!.unitId]: editingBatch.importedQuantity },
        quantityPieces: editingBatch.importedQuantity,
        baseUnitId: editingBatch.unitId || editingBatch.product!.unitId || '',
        costPrice: editingBatch.costPrice * editingBatch.importedQuantity, // Converting back to TOTAL if DB stores unit price
        priceType: 'base',
        expiryDate: editingBatch.expiryDate ? new Date(editingBatch.expiryDate).toISOString().split('T')[0] : '',
        isGift: editingBatch.isGift || false,
      };

      // Actually, if we just implemented "Total Price" entry, the DB costPrice should be the unit price.
      // So total = unitPrice * quantity.
      newItem.costPrice = Math.round(editingBatch.costPrice * editingBatch.importedQuantity);

      setItems([newItem]);
    }
  }, [editingBatch, editId]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [showMainInfoOnMobile, setShowMainInfoOnMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Form State
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [distributorId, setDistributorId] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [personnelId, setPersonnelId] = useState('');
  
  useEffect(() => {
    if (!personnelId && currentUser?.fullName) {
      setPersonnelId(currentUser.fullName);
    }
  }, [currentUser, personnelId]);
  const [items, setItems] = useState<ImportItem[]>([]);
  
  // Financial State
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [shippingFee, setShippingFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);

  // Search State
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const [distributorSearch, setDistributorSearch] = useState('');
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);

  // Right Search Drawer state
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [drawerProductSearch, setDrawerProductSearch] = useState('');
  const [drawerCategoryFilter, setDrawerCategoryFilter] = useState('');

  const activeFilterCount = (productSearch ? 1 : 0) + (drawerProductSearch ? 1 : 0) + (drawerCategoryFilter ? 1 : 0);

  const resetFilters = () => {
    setProductSearch('');
    setDrawerProductSearch('');
    setDrawerCategoryFilter('');
  };

  // Fetch Data
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: distributors = [] } = useQuery({ queryKey: ['distributors'], queryFn: getDistributors });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: getUnits });
  const { data: usersData } = useQuery({ 
    queryKey: ['users', selectedBranchId], 
    queryFn: () => getUsers(selectedBranchId || undefined)
  });
  const users = usersData?.data || [];

  // Mutations
  const importMutation = useMutation({
    mutationFn: createImportOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['importOrders'] });
      navigate('/admin/inventory');
    }
  });

  const productMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleAddItem(newProduct);
      setIsProductModalOpen(false);
    }
  });

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.isGift) return sum;
      return sum + item.costPrice;
    }, 0);
  }, [items]);

  const taxAmount = (subtotal * taxPercentage) / 100;
  
  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') return (subtotal * discountValue) / 100;
    return discountValue;
  }, [subtotal, discountValue, discountType]);

  const total = subtotal + taxAmount + shippingFee - discountAmount;

  // Sync amountPaid with total by default
  useEffect(() => {
    setAmountPaid(total);
  }, [total]);

  // Handlers
  const handleAddItem = (product: Product, details?: any) => {
    const baseQty = 1;
    const baseUnitId = details?.baseUnitId || product.unitId || '';
    const preFillPrice = product.basePrice || 0;
    const newItem: ImportItem = {
      id: Math.random().toString(36).substr(2, 9),
      product,
      unitQuantities: details?.unitQuantities || { [baseUnitId]: baseQty },
      quantityPieces: details?.quantityPieces || baseQty,
      baseUnitId,
      costPrice: details?.costPrice || preFillPrice * baseQty,
      priceType: details?.priceType || 'base',
      expiryDate: details?.expiryDate || '',
      isGift: false,
    };
    setItems([...items, newItem]);
    setProductSearch('');
    setShowProductResults(false);
  };

  const handleUpdateItem = (id: string, updates: Partial<ImportItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };
  const handleEditItem = (item: ImportItem) => {
    setEditingItemId(item.id);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (details: any) => {
    if (editingItemId) {
      handleUpdateItem(editingItemId, details);
      setIsEditModalOpen(false);
      setEditingItemId(null);
    }
  };
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!selectedBranchId) return alert('Please select a branch');
    if (items.length === 0) return alert('Please add at least one product');

    const orderItems = items.map(item => {
      let totalQty = item.unitQuantities[item.baseUnitId] || 0;
      item.product.units?.forEach((pu: any) => {
        totalQty += (item.unitQuantities[pu.unitId] || 0) * pu.conversionFactor;
      });

      let unitPrice = item.costPrice;
      if (item.priceType === 'packaging') {
        const defaultUnit = item.product.units?.find((u: any) => u.isDefault) || item.product.units?.[0];
        const factor = defaultUnit?.conversionFactor || 1;
        unitPrice = item.costPrice / (factor || 1);
      } else {
        unitPrice = item.costPrice / (totalQty || 1);
      }

      return {
        productId: item.product.id,
        importedQuantity: totalQty,
        costPrice: Math.round(unitPrice),
        expiryDate: item.expiryDate || undefined,
        isGift: item.isGift,
      };
    });

    if (editId) {
      // For editing single batch
      const first = orderItems[0];
      await updateMutation.mutateAsync({
        costPrice: first.costPrice,
        currentQuantity: first.importedQuantity,
      });
    } else {
      await importMutation.mutateAsync({
        branchId: selectedBranchId,
        distributorId: distributorId || undefined,
        invoiceName: invoiceName || undefined,
        personnelName: personnelId || undefined,
        importDate: importDate,
        taxAmount: taxAmount,
        discountAmount: discountAmount,
        shippingFee: shippingFee,
        totalAmount: total,
        items: orderItems,
      });
    }
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'STT': 1,
        'Mã hàng': '893000111222',
        'Tên hàng': 'Vắc xin dại',
        'Đơn vị tính': 'Chai',
        'Số lượng': 10,
        'Đơn giá': 50000,
        'Thành tiền': 500000,
        'Hạn sử dụng': '2026-12-31',
        'Hàng tặng (1: Có, 0: Không)': 0
      },
      {
        'STT': 2,
        'Mã hàng': 'SP002',
        'Tên hàng': 'Thức ăn mèo',
        'Đơn vị tính': 'Gói',
        'Số lượng': 5,
        'Đơn giá': 120000,
        'Thành tiền': 600000,
        'Hạn sử dụng': '',
        'Hàng tặng (1: Có, 0: Không)': 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, 'mau_nhap_kho.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedBranchId) {
      alert('Vui lòng chọn chi nhánh trước khi import.');
      e.target.value = '';
      return;
    }

    setIsProcessingUpload(true);
    setUploadResult(null);
    setUploadErrors([]);

    try {
    const response = await processInventoryUpload(file, selectedBranchId);
      setUploadResult(response);

      const success = response?.imported ?? response?.success ?? 0;
      const failed = response?.errors ?? response?.failed ?? [];
      const errorMessages = failed.map((item: any, index: number) => {
        const rowLabel = item.row ? `Dòng ${item.row}` : item.rowNum ? `Dòng ${item.rowNum}` : `#${index + 1}`;
        return `${rowLabel}: ${item.reason || 'Lỗi không xác định'}`;
      });
      setUploadErrors(errorMessages.slice(0, 10));

      if (success > 0) {
        alert(`Upload thành công ${success} bản ghi.`);
      }
      if (failed.length > 0) {
        const failureMsg = errorMessages.slice(0, 5).join('\n');
        alert(`Một số dòng không được xử lý:\n${failureMsg}`);
      }

      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi upload tệp.';
      alert(errMsg);
    } finally {
      setIsProcessingUpload(false);
      e.target.value = '';
    }
  };

  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    (p.barcode && p.barcode.includes(productSearch)) ||
    (p.productCode && p.productCode.toLowerCase().includes(productSearch.toLowerCase()))
  ).slice(0, 50);

  return (
    <div style={{ 
      padding: isMobile ? '0.5rem' : '0.25rem 0.5rem', 
      backgroundColor: '#f1f5f9', 
      minHeight: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.75rem' 
    }}>
      
      {isLoadingBatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ fontWeight: '600', color: '#3b82f6' }}>Đang tải dữ liệu lô hàng...</div>
        </div>
      )}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => navigate('/admin/inventory')}
            style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <ArrowLeft size={18} color="#64748b" />
          </button>
          <h1 style={{ fontSize: isMobile ? '1.15rem' : '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            {editId ? 'Chỉnh sửa lô hàng' : 'Nhập kho hàng hóa'}
          </h1>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.4rem', 
          width: isMobile ? '100%' : 'auto',
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? '0.5rem' : '0'
        }}>
          <input 
            type="file" 
            id="excel-upload" 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            onChange={handleImportExcel}
            ref={importFileRef}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsSearchDrawerOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <SlidersHorizontal size={16} style={{ color: '#6366f1' }} />
            {!isMobile && 'Menu tìm kiếm'}
            {isMobile && 'Tìm kiếm'}
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
            className="btn-secondary" 
            onClick={downloadSampleExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <FileSpreadsheet size={16} />
            {!isMobile && (t('inventory.download_sample') || 'Tải file mẫu')}
            {isMobile && 'Mẫu'}
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => importFileRef.current?.click()}
            disabled={isProcessingUpload}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.375rem', opacity: isProcessingUpload ? 0.6 : 1, cursor: isProcessingUpload ? 'not-allowed' : 'pointer' }}
          >
            <FileSpreadsheet size={16} />
            {!isMobile && (isProcessingUpload ? 'Đang upload...' : (t('inventory.import_excel') || 'Nhập excel'))}
            {isMobile && (isProcessingUpload ? 'Đang...' : 'Import')}
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            disabled={importMutation.isPending || updateMutation.isPending || items.length === 0} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none', padding: '0.45rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}
          >
            <Save size={16} />
            {(importMutation.isPending || updateMutation.isPending) ? '...' : (isMobile ? (editId ? 'Cập nhật' : 'Lưu') : (editId ? 'Cập nhật lô hàng' : 'Lưu (F10)'))}
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      {uploadErrors.length > 0 && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid #fca5a5', backgroundColor: '#fef2f2' }}>
          <div style={{ fontWeight: '700', color: '#b91c1c', marginBottom: '0.5rem' }}>Một số dòng không hợp lệ:</div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#991b1b', display: 'grid', gap: '0.35rem' }}>
            {uploadErrors.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
          </ul>
        </div>
      )}

      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          type="button"
          onClick={() => setShowMainInfoOnMobile(!showMainInfoOnMobile)}
          style={{
            width: '100%',
            padding: '0.6rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: '600',
            fontSize: '0.85rem',
            color: '#334155',
            marginBottom: showMainInfoOnMobile ? '0.5rem' : '1rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} color="#6366f1" />
            <span>Thông tin phiếu nhập {distributorSearch ? `(${distributorSearch})` : ''}</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>
            {showMainInfoOnMobile ? 'Ẩn ▲' : 'Hiện ▼'}
          </span>
        </button>
      )}

      {(!isMobile || showMainInfoOnMobile) && (
        <div className="card" style={{ padding: isMobile ? '0.75rem' : '0.75rem 1.25rem', marginBottom: '0.6rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '0.75rem' }}>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <Calendar size={14} className="text-primary" />
                Ngày nhập <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="date" 
                value={importDate} 
                onChange={(e) => setImportDate(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <Building2 size={14} className="text-primary" />
                Nhà phân phối
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Gõ tên để tìm nhà phân phối..."
                    value={distributorSearch}
                    onChange={(e) => {
                      setDistributorSearch(e.target.value);
                      setShowDistributorDropdown(true);
                      if (!e.target.value) setDistributorId('');
                    }}
                    onFocus={() => setShowDistributorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDistributorDropdown(false), 150)}
                    className="form-control"
                    style={{ width: '100%', padding: '0.4rem 1.8rem 0.4rem 0.75rem', borderRadius: '0.375rem', border: `1px solid ${distributorId ? '#10b981' : '#cbd5e1'}`, fontSize: '0.85rem', outline: 'none', backgroundColor: distributorId ? '#f0fdf4' : 'white' }}
                  />
                  {distributorId && (
                    <button
                      type="button"
                      onClick={() => { setDistributorId(''); setDistributorSearch(''); }}
                      style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1, padding: '0.1rem' }}
                      title="Xóa lựa chọn"
                    >
                      ×
                    </button>
                  )}
                  {showDistributorDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      backgroundColor: 'white', borderRadius: '0.375rem',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      marginTop: '0.25rem', border: '1px solid #e2e8f0',
                      maxHeight: '200px', overflowY: 'auto'
                    }}>
                      {distributors
                        .filter((d: any) =>
                          !distributorSearch ||
                          d.name.toLowerCase().includes(distributorSearch.toLowerCase()) ||
                          (d.phone && d.phone.includes(distributorSearch))
                        )
                        .map((d: any) => (
                          <div
                            key={d.id}
                            onMouseDown={() => {
                              setDistributorId(d.id);
                              setDistributorSearch(d.name);
                              setShowDistributorDropdown(false);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              cursor: 'pointer',
                              backgroundColor: d.id === distributorId ? '#eff6ff' : 'white',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex', flexDirection: 'column', gap: '0.1rem'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = d.id === distributorId ? '#eff6ff' : 'white')}
                          >
                            <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>{d.name}</span>
                            {d.phone && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.phone}</span>}
                          </div>
                        ))
                      }
                      {distributors.filter((d: any) =>
                        !distributorSearch ||
                        d.name.toLowerCase().includes(distributorSearch.toLowerCase()) ||
                        (d.phone && d.phone.includes(distributorSearch))
                      ).length === 0 && (
                        <div style={{ padding: '0.6rem 0.75rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Không tìm thấy</div>
                      )}
                    </div>
                  )}
                </div>
                <button className="btn-secondary" style={{ padding: '0 0.5rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Thêm nhà phân phối">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <FileText size={14} className="text-primary" />
                Số hóa đơn
              </label>
              <input 
                type="text" 
                placeholder="Nhập số hóa đơn..." 
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                <User size={14} className="text-primary" />
                Người nhập hàng
              </label>
              <select 
                value={personnelId} 
                onChange={(e) => setPersonnelId(e.target.value)}
                disabled={!isAdmin}
                className="form-control"
                style={{ 
                  width: '100%', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', appearance: 'none', 
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', 
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.9rem',
                  backgroundColor: isAdmin ? 'white' : '#f8fafc',
                  cursor: isAdmin ? 'pointer' : 'not-allowed',
                  opacity: isAdmin ? 1 : 0.8
                }}
              >
                {!personnelId && <option value="">Chọn người nhập</option>}
                {personnelId && !users.find(u => u.fullName === personnelId) && (
                  <option value={personnelId}>{personnelId}</option>
                )}
                {users.map(u => (
                  <option key={u.id} value={u.fullName}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Items Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* Item Search Area */}
        <div style={{ 
          padding: '0.6rem 0.85rem', 
          borderBottom: '1px solid #e2e8f0', 
          backgroundColor: '#f8fafc', 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: '0.75rem', 
          alignItems: isMobile ? 'stretch' : 'center' 
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '500px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={isMobile ? "Tìm hàng hóa..." : "Tìm kiếm theo tên hàng hóa, mã vạch, mã sản phẩm"} 
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductResults(true);
              }}
              onFocus={() => setShowProductResults(true)}
              style={{
                width: '100%', padding: '0.42rem 0.75rem 0.42rem 2.2rem',
                borderRadius: '0.375rem', border: '1px solid #e2e8f0', outline: 'none',
                backgroundColor: 'white',
                fontSize: '0.85rem'
              }}
            />
            {showProductResults && productSearch && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                marginTop: '0.35rem', border: '1px solid #e2e8f0',
                maxHeight: '320px', overflowY: 'auto'
              }}>
                {filteredProducts.length > 0 ? filteredProducts.map((p: Product) => (
                  <div 
                    key={p.id} 
                    onClick={() => handleAddItem(p)}
                    style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.barcode || p.productCode || 'N/A'}</div>
                    </div>
                    <div style={{ color: '#10b981', fontSize: '0.85rem' }}>{p.unit?.name}</div>
                  </div>
                )) : (
                  <div style={{ padding: '0.85rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Không tìm thấy sản phẩm</div>
                )}
              </div>
            )}
          </div>

          <button 
            className="btn-primary" 
            onClick={() => setIsPickerModalOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              padding: '0.42rem 0.95rem', backgroundColor: '#10b981', border: 'none',
              justifyContent: 'center', whiteSpace: 'nowrap', fontSize: '0.85rem', borderRadius: '0.375rem'
            }}
          >
            <Plus size={16} />
            Thêm lẻ sản phẩm
          </button>
        </div>

        {/* Items Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem' }}>
              {items.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Chưa có sản phẩm nào
                </div>
              ) : items.map((item, idx) => (
                <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{idx + 1}. {item.product.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEditItem(item)} style={{ color: '#3b82f6', background: 'none', border: 'none' }}>
                          <Edit2 size={16} />
                        </button>
                      <button onClick={() => handleRemoveItem(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Số lượng</label>
                        <div style={{ fontWeight: '500' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {item.unitQuantities[item.baseUnitId] > 0 && (
                            <span>{item.unitQuantities[item.baseUnitId]} {units.find((u: any) => u.id === item.baseUnitId)?.name} </span>
                          )}
                          {item.product.units?.map((pu: any) => (
                            item.unitQuantities[pu.unitId] > 0 && (
                              <span key={pu.unitId}>, {item.unitQuantities[pu.unitId]} {pu.unit?.name} </span>
                            )
                          ))}
                        </div>
                        </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Hạn dùng</label>
                        <div style={{ fontWeight: '500' }}>{item.expiryDate || '--'}</div>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Thành tiền</label>
                      <div style={{ fontWeight: '500' }}>{(item.isGift ? 0 : item.costPrice).toLocaleString()} ₫</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.2rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                        <input 
                          type="checkbox" 
                          checked={item.isGift} 
                          onChange={(e) => handleUpdateItem(item.id, { isGift: e.target.checked })}
                        />
                        <span>Quà tặng</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#10b981', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '44px' }}>STT</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600' }}>Tên mặt hàng</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '130px' }}>HSD</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '90px' }}>ĐVT</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '110px', textAlign: 'right' }}>SL nhập</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '160px', textAlign: 'right' }}>Đơn giá nhập (₫)</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '130px', textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '80px', textAlign: 'center' }}>Quà</th>
                  <th style={{ padding: '0.55rem 0.85rem', color: 'white', fontSize: '0.82rem', fontWeight: '600', width: '70px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ padding: '0.65rem', borderRadius: '50%', backgroundColor: '#f1f5f9' }}>
                          <Search size={24} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Chưa có sản phẩm nào. Hãy tìm kiếm sản phẩm phía trên.</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => {
                  // Tính tổng SL theo đơn vị cơ bản
                  let totalQty = item.unitQuantities[item.baseUnitId] || 0;
                  item.product.units?.forEach((pu: any) => {
                    totalQty += (item.unitQuantities[pu.unitId] || 0) * pu.conversionFactor;
                  });
                  const unitPrice = totalQty > 0 ? Math.round(item.costPrice / totalQty) : item.costPrice;
                  const lineTotal = item.isGift ? 0 : item.costPrice;

                  return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '0.6rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>{idx + 1}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.product.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.product.barcode || item.product.productCode || ''}</div>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <input
                        type="date"
                        value={item.expiryDate || ''}
                        onChange={(e) => handleUpdateItem(item.id, { expiryDate: e.target.value })}
                        style={{ padding: '0.3rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #e2e8f0', fontSize: '0.8rem', width: '125px', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                      {units.find((u: any) => u.id === item.baseUnitId)?.name || '--'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        value={item.unitQuantities[item.baseUnitId] || 0}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 0;
                          handleUpdateItem(item.id, {
                            unitQuantities: { ...item.unitQuantities, [item.baseUnitId]: qty },
                            quantityPieces: qty,
                          });
                        }}
                        className="no-spinner"
                        style={{ width: '80px', padding: '0.3rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', textAlign: 'right', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
                      <input
                        type="number"
                        min={0}
                        value={unitPrice || 0}
                        onChange={(e) => {
                          const newUnitPrice = Number(e.target.value) || 0;
                          const qty = (item.unitQuantities[item.baseUnitId] || 0);
                          handleUpdateItem(item.id, { costPrice: newUnitPrice * (qty || 1) });
                        }}
                        className="no-spinner"
                        style={{ width: '130px', padding: '0.3rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #10b981', backgroundColor: '#f0fdf4', fontSize: '0.875rem', fontWeight: '600', textAlign: 'right', outline: 'none', color: '#065f46' }}
                      />
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>
                      {item.isGift ? <span style={{ color: '#f59e0b' }}>Miễn phí</span> : `${lineTotal.toLocaleString()} ₫`}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <input type="checkbox" checked={item.isGift} onChange={(e) => handleUpdateItem(item.id, { isGift: e.target.checked })} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <button onClick={() => handleRemoveItem(item.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Footer Summary */}
      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1.5rem' : '4rem' }}>
          
          {/* Left Column: Payment & Fees */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1.5 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                <Wallet size={16} className="text-primary" />
                Hình thức thanh toán
              </label>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b' }}>
                  <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} style={{ width: '1.1rem', height: '1.1rem' }} />
                  Tiền mặt
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b' }}>
                  <input type="radio" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} style={{ width: '1.1rem', height: '1.1rem' }} />
                  Chuyển khoản
                </label>
              </div>
            </div>
 
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                  <TicketPercent size={16} className="text-primary" />
                  Giảm giá hóa đơn
                </label>
                <div style={{ display: 'flex' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '0.5rem 0 0 0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                    value={discountType === 'fixed' ? formatNumber(discountValue) : discountValue}
                    onChange={(e) => setDiscountValue(parseNumber(e.target.value))}
                  />
                  <button 
                    onClick={() => setDiscountType(discountType === 'fixed' ? 'percentage' : 'fixed')}
                    style={{ 
                      padding: '0 1rem', border: '1px solid #cbd5e1', borderLeft: 'none', 
                      backgroundColor: '#f8fafc', borderRadius: '0 0.5rem 0.5rem 0',
                      fontWeight: '700', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', transition: 'background-color 0.2s'
                    }}
                  >
                    {discountType === 'fixed' ? 'VNĐ' : '%'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                  <Truck size={16} className="text-primary" />
                  Phí vận chuyển
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="0"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  value={formatNumber(shippingFee)}
                  onChange={(e) => setShippingFee(parseNumber(e.target.value))}
                />
              </div>
            </div>
          </div>
  
          {/* Right Column: Calculations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b' }}>
              <span>Tổng tiền trước thuế:</span>
              <span style={{ fontWeight: '600', color: '#1e293b' }}>{subtotal.toLocaleString()} ₫</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Thuế VAT (%):</span>
                <input 
                  type="number" 
                  style={{ width: '50px', padding: '0.25rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.4rem', outline: 'none', fontSize: '0.85rem', textAlign: 'center' }} 
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                />
              </div>
              <span style={{ fontWeight: '600', color: '#1e293b' }}>{taxAmount.toLocaleString()} ₫</span>
            </div>

            <div style={{ margin: '0.5rem 0', borderTop: '1px dashed #cbd5e1' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>Tổng thanh toán:</span>
              <span style={{ fontWeight: '800', color: '#10b981', fontSize: '1.25rem' }}>{total.toLocaleString()} ₫</span>
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#ef4444' }}>
                <Banknote size={16} />
                Tiền thực trả (VNĐ)
              </label>
              <input 
                type="text" 
                className="form-control" 
                style={{ width: '100%', textAlign: 'right', fontWeight: '800', color: '#ef4444', fontSize: '1.25rem', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '2px solid #fee2e2', outline: 'none', backgroundColor: 'white' }}
                value={formatNumber(amountPaid)}
                onChange={(e) => setAmountPaid(parseNumber(e.target.value))}
              />
            </div>
          </div>
  
        </div>
      </div>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={async (data) => { await productMutation.mutateAsync(data); }}
      />

      <ProductPickerModal
        isOpen={isPickerModalOpen}
        onClose={() => setIsPickerModalOpen(false)}
        products={products}
        onSelect={handleAddItem}
      />

      <EditItemModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItemId(null);
        }}
        item={items.find(it => it.id === editingItemId)}
        onSave={handleSaveEdit}
      />

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Tìm kiếm nhập kho"
        subtitle="Tìm sản phẩm để nhập kho, chọn nhà cung cấp hoặc người thực hiện"
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        onApply={() => setIsSearchDrawerOpen(false)}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Tìm &amp; thêm sản phẩm vào phiếu nhập
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Nhập tên, mã SP hoặc mã vạch..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductResults(true);
              }}
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
          {productSearch.trim() && (
            <div
              style={{
                marginTop: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                backgroundColor: '#ffffff',
              }}
            >
              {products
                .filter(
                  (p: any) =>
                    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    (p.barcode && p.barcode.includes(productSearch)) ||
                    (p.productCode && p.productCode.toLowerCase().includes(productSearch.toLowerCase()))
                )
                .map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      handleAddItem(p);
                      setProductSearch('');
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.productCode || p.barcode || 'Chưa có mã'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>+ Thêm</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Nhà cung cấp
          </label>
          <select
            value={distributorId}
            onChange={(e) => {
              const selectedId = e.target.value;
              setDistributorId(selectedId);
              const found = distributors.find((d: any) => d.id === selectedId);
              if (found) setDistributorSearch(found.name);
            }}
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
            <option value="">-- Chọn nhà cung cấp --</option>
            {distributors.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.phone ? `(${d.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Người thực hiện nhập kho
          </label>
          <select
            value={personnelId}
            onChange={(e) => setPersonnelId(e.target.value)}
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
            <option value="">-- Chọn người nhập --</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.fullName}>
                {u.fullName} ({u.role || 'User'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Số hóa đơn / Chứng từ
          </label>
          <input
            type="text"
            placeholder="Nhập số hóa đơn..."
            value={invoiceName}
            onChange={(e) => setInvoiceName(e.target.value)}
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

export default InventoryImportPage;
