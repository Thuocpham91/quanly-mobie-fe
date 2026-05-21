import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, ArrowLeft, Trash2, Save, FileSpreadsheet, 
  Edit2, Calendar, Building2, FileText, User,
  Wallet, TicketPercent, Truck, Banknote
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  getProducts, bulkCreateInventoryBatches, getUnits, createProduct, 
  getInventoryBatch, updateInventoryBatch, type Product
} from '../api/inventory';
import { getDistributors } from '../api/distributors';
import { getUsers } from '../api/users';
import { useBranchContext } from '../context/BranchContext';
import { formatNumber, parseNumber } from '../utils/format';
import * as XLSX from 'xlsx';
import ProductModal from '../components/ProductModal';
import ProductPickerModal from '../components/ProductPickerModal';
import EditItemModal from '../components/EditItemModal';


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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);

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
    mutationFn: bulkCreateInventoryBatches,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
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
    const newItem: ImportItem = {
      id: Math.random().toString(36).substr(2, 9),
      product,
      unitQuantities: details?.unitQuantities || { [product.unitId || '']: 0 },
      quantityPieces: details?.quantityPieces || 0,
      baseUnitId: details?.baseUnitId || product.unitId || '',
      costPrice: details?.costPrice || 0,
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

    const batches = items.map(item => {
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
        branchId: selectedBranchId,
        distributorId: distributorId || undefined,
        importedQuantity: totalQty,
        costPrice: Math.round(unitPrice),
        unitId: item.baseUnitId || undefined,
        importDate: importDate,
        expiryDate: item.expiryDate || undefined,
        invoiceName: invoiceName || undefined,
        isGift: item.isGift,
        taxAmount: taxAmount / items.length, 
        discountAmount: discountAmount / items.length,
        shippingFee: shippingFee / items.length,
        personnelName: personnelId,
      };
    });

    if (editId) {
      // For editing, we only support editing one at a time via this flow for now
      await updateMutation.mutateAsync(batches[0]);
    } else {
      await importMutation.mutateAsync(batches);
    }
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Mã hàng (Barcode/Code)': '893000111222',
        'Tên mặt hàng (Tham khảo)': 'Vắc xin dại',
        'Số lượng': 10,
        'Thành tiền': 500000,
        'Hạn sử dụng (YYYY-MM-DD)': '2026-12-31',
        'Hàng tặng (1: Có, 0: Không)': 0
      },
      {
        'Mã hàng (Barcode/Code)': 'SP002',
        'Tên mặt hàng (Tham khảo)': 'Thức ăn mèo',
        'Số lượng': 5,
        'Thành tiền': 600000,
        'Hạn sử dụng (YYYY-MM-DD)': '',
        'Hàng tặng (1: Có, 0: Không)': 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, 'mau_nhap_kho.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const newItems: ImportItem[] = [];
      const missingProducts: string[] = [];

      data.forEach((row: any) => {
        const code = String(row['Mã hàng (Barcode/Code)'] || '').trim();
        const quantity = parseFloat(row['Số lượng']) || 0;
        const price = parseFloat(row['Thành tiền'] || row['Đơn giá']) || 0;
        const expiry = String(row['Hạn sử dụng (YYYY-MM-DD)'] || '').trim();
        const isGift = row['Hàng tặng (1: Có, 0: Không)'] == 1;

        const product = products.find((p: Product) => p.barcode === code || p.productCode === code);
        
        if (product) {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            product,
            unitQuantities: { [product.unitId]: quantity },
            quantityPieces: quantity,
            baseUnitId: product.unitId || '',
            costPrice: price,
            priceType: 'base',
            expiryDate: expiry,
            isGift
          });
        } else if (code) {
          missingProducts.push(code);
        }
      });

      if (missingProducts.length > 0) {
        alert(`Không tìm thấy ${missingProducts.length} sản phẩm với mã: ${missingProducts.join(', ')}. Vui lòng kiểm tra lại danh mục sản phẩm.`);
      }

      setItems([...items, ...newItems]);
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    (p.barcode && p.barcode.includes(productSearch))
  ).slice(0, 10);

  return (
    <div style={{ 
      padding: isMobile ? '1rem' : '1.5rem', 
      backgroundColor: '#f1f5f9', 
      minHeight: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: isMobile ? '1rem' : '1.5rem' 
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
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/admin/inventory')}
            style={{ padding: '0.5rem', borderRadius: '50%', border: 'none', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <ArrowLeft size={20} color="#64748b" />
          </button>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#1e293b' }}>
            {editId ? 'Chỉnh sửa lô hàng' : 'Nhập kho hàng hóa'}
          </h1>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
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
          />
          <button 
            className="btn-secondary" 
            onClick={downloadSampleExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none' }}
          >
            <FileSpreadsheet size={18} />
            {!isMobile && (t('inventory.download_sample') || 'Tải file mẫu')}
            {isMobile && 'Mẫu'}
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => document.getElementById('excel-upload')?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none' }}
          >
            <FileSpreadsheet size={18} />
            {!isMobile && (t('inventory.import_excel') || 'Nhập excel')}
            {isMobile && 'Import'}
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            disabled={importMutation.isPending || updateMutation.isPending || items.length === 0} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none' }}
          >
            <Save size={18} />
            {(importMutation.isPending || updateMutation.isPending) ? '...' : (isMobile ? (editId ? 'Cập nhật' : 'Lưu') : (editId ? 'Cập nhật lô hàng' : 'Lưu (F10)'))}
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
              <Calendar size={16} className="text-primary" />
              Ngày nhập <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="date" 
              value={importDate} 
              onChange={(e) => setImportDate(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
              <Building2 size={16} className="text-primary" />
              Nhà phân phối
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select 
                value={distributorId} 
                onChange={(e) => setDistributorId(e.target.value)}
                className="form-control"
                style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
              >
                <option value="">Chọn nhà phân phối</option>
                {distributors.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button className="btn-secondary" style={{ padding: '0 0.6rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Thêm nhà phân phối">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
              <FileText size={16} className="text-primary" />
              Số hóa đơn
            </label>
            <input 
              type="text" 
              placeholder="Nhập số hóa đơn..." 
              value={invoiceName}
              onChange={(e) => setInvoiceName(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
              <User size={16} className="text-primary" />
              Người nhập hàng
            </label>
            <select 
              value={personnelId} 
              onChange={(e) => setPersonnelId(e.target.value)}
              disabled={!isAdmin}
              className="form-control"
              style={{ 
                width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', appearance: 'none', 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', 
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem',
                backgroundColor: isAdmin ? 'white' : '#f8fafc',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.8
              }}
            >
              {!personnelId && <option value="">Chọn người nhập</option>}
              {/* Ensure current personnelId is in the list */}
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

      {/* Items Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* Item Search Area */}
        <div style={{ 
          padding: '1rem', 
          borderBottom: '1px solid #e2e8f0', 
          backgroundColor: '#f8fafc', 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1rem', 
          alignItems: isMobile ? 'stretch' : 'center' 
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '600px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
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
                width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem',
                borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none',
                backgroundColor: 'white',
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            />
            {showProductResults && productSearch && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                marginTop: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden'
              }}>
                {filteredProducts.length > 0 ? filteredProducts.map((p: Product) => (
                  <div 
                    key={p.id} 
                    onClick={() => handleAddItem(p)}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: isMobile ? '0.875rem' : '1rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.barcode || p.productCode || 'N/A'}</div>
                    </div>
                    <div style={{ color: '#10b981', fontSize: '0.875rem' }}>{p.unit?.name}</div>
                  </div>
                )) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Không tìm thấy sản phẩm</div>
                )}
              </div>
            )}
          </div>

          <button 
            className="btn-primary" 
            onClick={() => setIsPickerModalOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.6rem 1.25rem', backgroundColor: '#10b981', border: 'none',
              justifyContent: 'center', whiteSpace: 'nowrap'
            }}
          >
            <Plus size={18} />
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
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem' }}>STT</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tên mặt hàng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Hạn sử dụng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Đơn vị</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Số lượng</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Thành tiền</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Quà tặng</th>
                  <th style={{ padding: '0.75rem 1rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#f1f5f9' }}>
                          <Search size={32} />
                        </div>
                        <p>Chưa có sản phẩm nào. Hãy tìm kiếm sản phẩm phía trên.</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.product.barcode || item.product.productCode || '--'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{item.expiryDate || '--'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{units.find((u: any) => u.id === item.baseUnitId)?.name || '--'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {item.unitQuantities[item.baseUnitId] > 0 && (
                          <div>{item.unitQuantities[item.baseUnitId]} {units.find((u: any) => u.id === item.baseUnitId)?.name}</div>
                        )}
                        {item.product.units?.map((pu: any) => (
                          item.unitQuantities[pu.unitId] > 0 && (
                            <div key={pu.unitId}>{item.unitQuantities[pu.unitId]} {pu.unit?.name}</div>
                          )
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                      {(item.isGift ? 0 : item.costPrice).toLocaleString()} ₫
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <input type="checkbox" checked={item.isGift} onChange={(e) => handleUpdateItem(item.id, { isGift: e.target.checked })} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button onClick={() => handleEditItem(item)} style={{ color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: '0.5rem' }}><Edit2 size={16} /></button>
                      <button onClick={() => handleRemoveItem(item.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
};

export default InventoryImportPage;
