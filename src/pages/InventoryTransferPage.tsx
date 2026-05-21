import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeftRight, 
  PackageMinus, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  Info,
  Trash2
} from 'lucide-react';
import api from '../api/client';
import { 
  getInventorySummary, 
  exportStock, 
  createTransfer,
  getTransfers,
  confirmTransfer,
  cancelTransfer
} from '../api/inventory';
import branchesApi from '../api/branches';
import { useBranchContext } from '../context/BranchContext';

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

interface ProductItem {
  productId: string;
  productName: string;
  productCode?: string;
  barcode?: string;
  unitName: string;
  totalStock: number;
  quantity: number;
}

const InventoryTransferPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();
  const [activeTab, setActiveTab] = useState<'transfer' | 'export' | 'pending'>('transfer');

  // Transfer Form State
  const [transferFromBranch, setTransferFromBranch] = useState(selectedBranchId || '');
  const [transferToBranch, setTransferToBranch] = useState('');
  const [transferItems, setTransferItems] = useState<ProductItem[]>([]);
  const [transferNote, setTransferNote] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [isTransferDropdownOpen, setIsTransferDropdownOpen] = useState(false);

  // Transfer status filter for pending tab
  const [transferStatusFilter, setTransferStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('PENDING');

  // Export Form State
  const [exportBranch, setExportBranch] = useState(selectedBranchId || '');
  const [exportItems, setExportItems] = useState<ProductItem[]>([]);
  const [exportNote, setExportNote] = useState('');
  const [exportSearch, setExportSearch] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Fetch branches
  const { data: paginatedBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getBranches(1, 100),
  });
  const branches = paginatedBranches?.data || [];

  // Fetch inventory summary for source branches
  const { data: transferInventory = [], isLoading: isLoadingTransferInv } = useQuery({
    queryKey: ['inventorySummary', transferFromBranch],
    queryFn: () => getInventorySummary(transferFromBranch),
    enabled: !!transferFromBranch,
  });

  const { data: exportInventory = [], isLoading: isLoadingExportInv } = useQuery({
    queryKey: ['inventorySummary', exportBranch],
    queryFn: () => getInventorySummary(exportBranch),
    enabled: !!exportBranch,
  });

  // Fetch stock logs for history table
  const { data: paginatedLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['stockHistory', 1],
    queryFn: async () => {
      const response = await api.get(`/inventory/history?page=1&limit=30`);
      return response.data;
    },
  });

  const logs = paginatedLogs?.data || [];

  // Filter logs for relevant Export / Transfer activities
  const recentTransferLogs = logs.filter((log: StockLog) => 
    log.type === 'EXPORT' || 
    log.referenceCode?.startsWith('TRSF-') || 
    log.referenceCode?.startsWith('EXP-') ||
    (log.type === 'IMPORT' && log.note?.toLowerCase().includes('chuyển kho'))
  );

  // Fetch transfers
  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery({
    queryKey: ['transfers', selectedBranchId],
    queryFn: () => getTransfers(selectedBranchId),
  });

  // Mutations
  const transferMutation = useMutation({
    mutationFn: async (data: { fromBranchId: string; toBranchId: string; note?: string; items: { productId: string; quantity: number }[] }) => {
      await createTransfer(data);
    },
    onSuccess: () => {
      alert('Yêu cầu chuyển kho đã được gửi đi và đang chờ chi nhánh nhận xác nhận!');
      // Reset form
      setTransferItems([]);
      setTransferNote('');
      setTransferSearch('');
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['stockHistory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      alert(`Chuyển kho thất bại: ${err?.response?.data?.message || err?.message || 'Không rõ lỗi'}`);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmTransfer(id),
    onSuccess: () => {
      alert('Đã xác nhận nhận hàng thành công!');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['stockHistory'] });
    },
    onError: (err: any) => {
      alert(`Xác nhận thất bại: ${err?.response?.data?.message || err?.message || 'Không rõ lỗi'}`);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelTransfer(id),
    onSuccess: () => {
      alert('Đã hủy phiếu chuyển kho thành công!');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['stockHistory'] });
    },
    onError: (err: any) => {
      alert(`Hủy phiếu thất bại: ${err?.response?.data?.message || err?.message || 'Không rõ lỗi'}`);
    }
  });

  const exportMutation = useMutation({
    mutationFn: async (data: { branchId: string; note?: string; items: { productId: string; quantity: number }[] }) => {
      for (const item of data.items) {
        await exportStock({
          branchId: data.branchId,
          productId: item.productId,
          quantity: item.quantity,
          note: data.note
        });
      }
    },
    onSuccess: () => {
      alert('Xuất hao hụt kho thành công cho tất cả sản phẩm!');
      // Reset form
      setExportItems([]);
      setExportNote('');
      setExportSearch('');
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['stockHistory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      alert(`Xuất kho thất bại: ${err?.response?.data?.message || err?.message || 'Không rõ lỗi'}`);
    }
  });

  // Autocomplete products filtering
  const filteredTransferProducts = transferInventory.filter((item: any) => 
    item.product.name.toLowerCase().includes(transferSearch.toLowerCase()) ||
    (item.product.productCode && item.product.productCode.toLowerCase().includes(transferSearch.toLowerCase())) ||
    (item.product.barcode && item.product.barcode.includes(transferSearch))
  );

  const filteredExportProducts = exportInventory.filter((item: any) => 
    item.product.name.toLowerCase().includes(exportSearch.toLowerCase()) ||
    (item.product.productCode && item.product.productCode.toLowerCase().includes(exportSearch.toLowerCase())) ||
    (item.product.barcode && item.product.barcode.includes(exportSearch))
  );

  // Helper functions for items selection
  const handleAddTransferItem = (inventoryItem: any) => {
    const existing = transferItems.find(i => i.productId === inventoryItem.product.id);
    if (existing) {
      if (existing.quantity < inventoryItem.totalStock) {
        setTransferItems(transferItems.map(i => 
          i.productId === inventoryItem.product.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ));
      } else {
        alert(`Số lượng vượt quá tồn kho hiện có (${inventoryItem.totalStock})`);
      }
    } else {
      if (inventoryItem.totalStock <= 0) {
        alert('Sản phẩm đã hết hàng tại chi nhánh nguồn.');
        return;
      }
      setTransferItems([...transferItems, {
        productId: inventoryItem.product.id,
        productName: inventoryItem.product.name,
        productCode: inventoryItem.product.productCode,
        barcode: inventoryItem.product.barcode,
        unitName: inventoryItem.product.unit?.name || 'Đơn vị',
        totalStock: inventoryItem.totalStock,
        quantity: 1
      }]);
    }
    setTransferSearch('');
    setIsTransferDropdownOpen(false);
  };

  const handleUpdateTransferItemQty = (productId: string, quantity: number) => {
    setTransferItems(transferItems.map(i => {
      if (i.productId === productId) {
        const qty = Math.max(1, Math.min(i.totalStock, quantity));
        return { ...i, quantity: qty };
      }
      return i;
    }));
  };

  const handleRemoveTransferItem = (productId: string) => {
    setTransferItems(transferItems.filter(i => i.productId !== productId));
  };

  const handleAddExportItem = (inventoryItem: any) => {
    const existing = exportItems.find(i => i.productId === inventoryItem.product.id);
    if (existing) {
      if (existing.quantity < inventoryItem.totalStock) {
        setExportItems(exportItems.map(i => 
          i.productId === inventoryItem.product.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ));
      } else {
        alert(`Số lượng vượt quá tồn kho hiện có (${inventoryItem.totalStock})`);
      }
    } else {
      if (inventoryItem.totalStock <= 0) {
        alert('Sản phẩm đã hết hàng tại chi nhánh xuất.');
        return;
      }
      setExportItems([...exportItems, {
        productId: inventoryItem.product.id,
        productName: inventoryItem.product.name,
        productCode: inventoryItem.product.productCode,
        barcode: inventoryItem.product.barcode,
        unitName: inventoryItem.product.unit?.name || 'Đơn vị',
        totalStock: inventoryItem.totalStock,
        quantity: 1
      }]);
    }
    setExportSearch('');
    setIsExportDropdownOpen(false);
  };

  const handleUpdateExportItemQty = (productId: string, quantity: number) => {
    setExportItems(exportItems.map(i => {
      if (i.productId === productId) {
        const qty = Math.max(1, Math.min(i.totalStock, quantity));
        return { ...i, quantity: qty };
      }
      return i;
    }));
  };

  const handleRemoveExportItem = (productId: string) => {
    setExportItems(exportItems.filter(i => i.productId !== productId));
  };

  // Form Handlers
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromBranch || !transferToBranch) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (transferFromBranch === transferToBranch) {
      alert('Chi nhánh đích phải khác chi nhánh nguồn.');
      return;
    }

    if (transferItems.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để chuyển kho.');
      return;
    }

    for (const item of transferItems) {
      if (item.quantity > item.totalStock) {
        alert(`Số lượng của ${item.productName} vượt quá tồn kho hiện tại.`);
        return;
      }
    }

    transferMutation.mutate({
      fromBranchId: transferFromBranch,
      toBranchId: transferToBranch,
      note: transferNote,
      items: transferItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
    });
  };

  const handleExportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportBranch) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (exportItems.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để xuất kho.');
      return;
    }

    for (const item of exportItems) {
      if (item.quantity > item.totalStock) {
        alert(`Số lượng của ${item.productName} vượt quá tồn kho hiện tại.`);
        return;
      }
    }

    exportMutation.mutate({
      branchId: exportBranch,
      note: exportNote,
      items: exportItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>Xuất & Chuyển kho</h1>
        <p style={{ color: '#64748b' }}>Thực hiện luân chuyển hàng hóa liên chi nhánh hoặc xuất hao phí, hỏng hóc.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Main Card with Tabs */}
        <div className="card" style={{ padding: 0, overflow: 'visible', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
          
          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}>
            <button 
              onClick={() => setActiveTab('transfer')}
              style={{
                flex: 1, padding: '1rem', border: 'none', background: 'transparent',
                fontSize: '1rem', fontWeight: '600', color: activeTab === 'transfer' ? '#3b82f6' : '#64748b',
                borderBottom: activeTab === 'transfer' ? '3px solid #3b82f6' : '3px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <ArrowLeftRight size={18} />
              Chuyển kho liên chi nhánh
            </button>
            <button 
              onClick={() => setActiveTab('export')}
              style={{
                flex: 1, padding: '1rem', border: 'none', background: 'transparent',
                fontSize: '1rem', fontWeight: '600', color: activeTab === 'export' ? '#ef4444' : '#64748b',
                borderBottom: activeTab === 'export' ? '3px solid #ef4444' : '3px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <PackageMinus size={18} />
              Xuất kho (Hao hụt / Hao phí)
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              style={{
                flex: 1, padding: '1rem', border: 'none', background: 'transparent',
                fontSize: '1rem', fontWeight: '600', color: activeTab === 'pending' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'pending' ? '3px solid #10b981' : '3px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <Info size={18} />
              Yêu cầu chờ nhận ({transfers.filter(t => t.status === 'PENDING' && t.toBranchId === selectedBranchId).length})
            </button>
          </div>

          <div style={{ padding: '2rem' }}>
            {activeTab === 'transfer' ? (
              /* TRANSFER FORM */
              <form onSubmit={handleTransferSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Thông tin chi nhánh</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                        Chi nhánh nguồn <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select 
                        className="form-control"
                        value={transferFromBranch}
                        onChange={(e) => {
                          setTransferFromBranch(e.target.value);
                          setTransferItems([]);
                          setTransferSearch('');
                        }}
                        required
                        style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                      >
                        <option value="">-- Chọn chi nhánh nguồn --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                        Chi nhánh đích <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select 
                        className="form-control"
                        value={transferToBranch}
                        onChange={(e) => setTransferToBranch(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                      >
                        <option value="">-- Chọn chi nhánh nhận --</option>
                        {branches.filter(b => b.id !== transferFromBranch).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Thông tin sản phẩm & Số lượng</h3>
                </div>

                {/* Product Search Selection */}
                <div className="form-group" style={{ position: 'relative', gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                    Chọn sản phẩm chuyển <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Gõ tên sản phẩm, mã vạch để tìm kiếm..."
                      value={transferSearch}
                      onChange={(e) => {
                        setTransferSearch(e.target.value);
                        setIsTransferDropdownOpen(true);
                      }}
                      onFocus={() => setIsTransferDropdownOpen(true)}
                      style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                    />
                  </div>

                  {isTransferDropdownOpen && transferFromBranch && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 100, marginTop: '0.25rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}>
                      {isLoadingTransferInv ? (
                        <div style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Đang tải danh sách kho...</div>
                      ) : filteredTransferProducts.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Không tìm thấy sản phẩm trong kho</div>
                      ) : (
                        filteredTransferProducts.map((item: any) => {
                          const isSelected = transferItems.some(i => i.productId === item.product.id);
                          return (
                            <div 
                              key={item.product.id}
                              onClick={() => handleAddTransferItem(item)}
                              style={{
                                padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isSelected ? '#eff6ff' : 'white',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#eff6ff' : 'white'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.product.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({item.product.productCode || 'Không có mã'})</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: item.totalStock > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                  Tồn: {item.totalStock} {item.product.unit?.name || 'Đơn vị'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Transfer Items Table */}
                {transferItems.length > 0 && (
                  <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Sản phẩm</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center', width: '120px' }}>Tồn nguồn</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center', width: '150px' }}>Số lượng chuyển</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', width: '100px' }}>Đơn vị</th>
                          <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferItems.map(item => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.productName}</div>
                              {item.productCode && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã: {item.productCode}</div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                              {item.totalStock}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <input 
                                type="number"
                                min="1"
                                max={item.totalStock}
                                value={item.quantity}
                                onChange={(e) => handleUpdateTransferItemQty(item.productId, parseInt(e.target.value) || 0)}
                                style={{ width: '100px', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                              {item.unitName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button 
                                type="button"
                                onClick={() => handleRemoveTransferItem(item.productId)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                    Ghi chú
                  </label>
                  <textarea 
                    placeholder="Lý do chuyển kho..."
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none', minHeight: '80px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    disabled={transferMutation.isPending || transferItems.length === 0}
                    className="btn-primary"
                    style={{ padding: '0.65rem 1.5rem', backgroundColor: '#3b82f6', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: transferItems.length === 0 ? 'not-allowed' : 'pointer', opacity: transferItems.length === 0 ? 0.6 : 1 }}
                  >
                    {transferMutation.isPending ? 'Đang thực hiện...' : 'Chuyển kho ngay'}
                  </button>
                </div>
              </form>
            ) : activeTab === 'export' ? (
              /* EXPORT FORM */
              <form onSubmit={handleExportSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                    Chi nhánh xuất <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    className="form-control"
                    value={exportBranch}
                    onChange={(e) => {
                      setExportBranch(e.target.value);
                      setExportItems([]);
                      setExportSearch('');
                    }}
                    required
                    style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                  >
                    <option value="">-- Chọn chi nhánh xuất --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Thông tin sản phẩm & Số lượng</h3>
                </div>

                {/* Product Search Selection */}
                <div className="form-group" style={{ position: 'relative', gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                    Chọn sản phẩm xuất <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Gõ tên sản phẩm, mã vạch để tìm kiếm..."
                      value={exportSearch}
                      onChange={(e) => {
                        setExportSearch(e.target.value);
                        setIsExportDropdownOpen(true);
                      }}
                      onFocus={() => setIsExportDropdownOpen(true)}
                      style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                    />
                  </div>

                  {isExportDropdownOpen && exportBranch && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 100, marginTop: '0.25rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}>
                      {isLoadingExportInv ? (
                        <div style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Đang tải danh sách kho...</div>
                      ) : filteredExportProducts.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Không tìm thấy sản phẩm trong kho</div>
                      ) : (
                        filteredExportProducts.map((item: any) => {
                          const isSelected = exportItems.some(i => i.productId === item.product.id);
                          return (
                            <div 
                              key={item.product.id}
                              onClick={() => handleAddExportItem(item)}
                              style={{
                                padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isSelected ? '#fef2f2' : 'white',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#fef2f2' : 'white'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.product.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({item.product.productCode || 'Không có mã'})</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: item.totalStock > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                  Tồn: {item.totalStock} {item.product.unit?.name || 'Đơn vị'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Export Items Table */}
                {exportItems.length > 0 && (
                  <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>Sản phẩm</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center', width: '120px' }}>Tồn hiện tại</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', textAlign: 'center', width: '150px' }}>Số lượng xuất</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem', width: '100px' }}>Đơn vị</th>
                          <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportItems.map(item => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.productName}</div>
                              {item.productCode && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã: {item.productCode}</div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                              {item.totalStock}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <input 
                                type="number"
                                min="1"
                                max={item.totalStock}
                                value={item.quantity}
                                onChange={(e) => handleUpdateExportItemQty(item.productId, parseInt(e.target.value) || 0)}
                                style={{ width: '100px', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                              {item.unitName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button 
                                type="button"
                                onClick={() => handleRemoveExportItem(item.productId)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                    Ghi chú / Lý do xuất kho
                  </label>
                  <textarea 
                    placeholder="Lý do xuất (Ví dụ: Hao phí, hỏng hóc, lỗi hạn sử dụng...)"
                    value={exportNote}
                    onChange={(e) => setExportNote(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none', minHeight: '80px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    disabled={exportMutation.isPending || exportItems.length === 0}
                    className="btn-primary"
                    style={{ padding: '0.65rem 1.5rem', backgroundColor: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: exportItems.length === 0 ? 'not-allowed' : 'pointer', opacity: exportItems.length === 0 ? 0.6 : 1 }}
                  >
                    {exportMutation.isPending ? 'Đang thực hiện...' : 'Xuất kho ngay'}
                  </button>
                </div>
              </form>
            ) : (
              /* PENDING TRANSFERS VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
                      Yêu cầu chuyển kho chờ xử lý
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Danh sách các phiếu chuyển kho liên quan đến chi nhánh hiện tại của bạn.
                    </p>
                  </div>

                  {/* Status Filters */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['PENDING', 'COMPLETED', 'CANCELLED', 'ALL'] as const).map(status => {
                      const label = status === 'PENDING' ? 'Chờ xác nhận' : status === 'COMPLETED' ? 'Đã hoàn thành' : status === 'CANCELLED' ? 'Đã hủy' : 'Tất cả';
                      const isActive = transferStatusFilter === status;
                      let activeBg = '#3b82f6';
                      if (status === 'PENDING') activeBg = '#d97706';
                      else if (status === 'COMPLETED') activeBg = '#10b981';
                      else if (status === 'CANCELLED') activeBg = '#ef4444';

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setTransferStatusFilter(status)}
                          style={{
                            padding: '0.4rem 0.8rem', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: '600',
                            border: isActive ? 'none' : '1px solid #cbd5e1',
                            backgroundColor: isActive ? activeBg : 'white',
                            color: isActive ? 'white' : '#475569',
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isLoadingTransfers ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách phiếu chuyển...</div>
                ) : transfers.filter((t: any) => transferStatusFilter === 'ALL' ? true : t.status === transferStatusFilter).length === 0 ? (
                  <div style={{
                    padding: '3rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '0.5rem',
                    backgroundColor: '#f8fafc', color: '#64748b'
                  }}>
                    Không tìm thấy phiếu chuyển nào khớp với bộ lọc hiện tại.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {transfers
                      .filter((t: any) => transferStatusFilter === 'ALL' ? true : t.status === transferStatusFilter)
                      .map((transfer: any) => {
                        const isInbound = transfer.toBranchId === selectedBranchId;
                        const isPending = transfer.status === 'PENDING';
                      
                      return (
                        <div 
                          key={transfer.id}
                          style={{
                            border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden',
                            backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {/* Card Header */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontWeight: '700', color: '#1e293b' }}>{transfer.code}</span>
                              <span style={{
                                fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: '600',
                                backgroundColor: isInbound ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: isInbound ? '#10b981' : '#3b82f6'
                              }}>
                                {isInbound ? 'Nhận hàng' : 'Gửi hàng'}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontWeight: '700',
                              backgroundColor: transfer.status === 'PENDING' ? '#fef3c7' : transfer.status === 'COMPLETED' ? '#d1fae5' : '#fee2e2',
                              color: transfer.status === 'PENDING' ? '#d97706' : transfer.status === 'COMPLETED' ? '#065f46' : '#991b1b'
                            }}>
                              {transfer.status === 'PENDING' ? 'Chờ xác nhận' : transfer.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã hủy'}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                              <div>
                                <span style={{ color: '#64748b' }}>Chi nhánh chuyển: </span>
                                <span style={{ fontWeight: '600', color: '#334155' }}>{transfer.fromBranch?.name}</span>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>Chi nhánh nhận: </span>
                                <span style={{ fontWeight: '600', color: '#334155' }}>{transfer.toBranch?.name}</span>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>Người tạo: </span>
                                <span style={{ fontWeight: '500', color: '#334155' }}>{transfer.createdBy?.fullName || 'Hệ thống'}</span>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>Thời gian: </span>
                                <span style={{ color: '#334155' }}>{new Date(transfer.createdAt).toLocaleString()}</span>
                              </div>
                            </div>

                            {transfer.note && (
                              <div style={{ fontSize: '0.875rem', backgroundColor: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '0.25rem' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Ghi chú: </span>
                                <span style={{ color: '#334155' }}>{transfer.note}</span>
                              </div>
                            )}

                            {/* Item details */}
                            <div style={{ border: '1px solid #f1f5f9', borderRadius: '0.375rem', overflow: 'hidden' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                  <tr>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#64748b' }}>Sản phẩm</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#64748b', textAlign: 'center', width: '100px' }}>Số lượng</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#64748b', width: '80px' }}>Đơn vị</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transfer.items.map((item: any) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#334155' }}>
                                        {item.product?.name}
                                        {item.product?.productCode && (
                                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({item.product.productCode})</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>
                                        {item.quantity}
                                      </td>
                                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                                        {item.product?.unit?.name || 'Đơn vị'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Action buttons */}
                            {isPending && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                                {isInbound ? (
                                  <>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Xác nhận nhận lô hàng của phiếu chuyển ${transfer.code}?`)) {
                                          confirmMutation.mutate(transfer.id);
                                        }
                                      }}
                                      disabled={confirmMutation.isPending}
                                      style={{
                                        padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none',
                                        borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                    >
                                      Xác nhận nhận hàng
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Từ chối và hoàn trả lô hàng của phiếu chuyển ${transfer.code} về chi nhánh nguồn?`)) {
                                          cancelMutation.mutate(transfer.id);
                                        }
                                      }}
                                      disabled={cancelMutation.isPending}
                                      style={{
                                        padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none',
                                        borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                    >
                                      Từ chối nhận
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Hủy phiếu chuyển kho ${transfer.code} và thu hồi hàng hóa về chi nhánh của bạn?`)) {
                                        cancelMutation.mutate(transfer.id);
                                      }
                                    }}
                                    disabled={cancelMutation.isPending}
                                    style={{
                                      padding: '0.5rem 1rem', backgroundColor: '#64748b', color: 'white', border: 'none',
                                      borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                                      transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#64748b'}
                                  >
                                    Hủy phiếu chuyển
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent logs of transfer & export */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
            Lịch sử xuất & chuyển kho gần đây
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Thời gian</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Sản phẩm</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Loại giao dịch</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>Số lượng</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Mã đối chiếu</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Người thực hiện</th>
                  <th style={{ padding: '1rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Chi tiết / Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải lịch sử...</td>
                  </tr>
                ) : recentTransferLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Chưa có giao dịch xuất / chuyển kho nào.</td>
                  </tr>
                ) : (
                  recentTransferLogs.map((log: StockLog) => {
                    const isTransfer = log.referenceCode?.startsWith('TRSF-') || log.note?.toLowerCase().includes('chuyển kho');
                    
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{log.product?.name}</div>
                          {log.product?.productCode && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                              <Tag size={12} />
                              {log.product.productCode}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {isTransfer ? (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
                              borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' 
                            }}>
                              <ArrowLeftRight size={12} />
                              Chuyển kho
                            </span>
                          ) : (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
                              borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' 
                            }}>
                              <PackageMinus size={12} />
                              Xuất hao hụt
                            </span>
                          )}
                        </td>
                        <td style={{ 
                          padding: '1rem', textAlign: 'center', fontWeight: '700', 
                          color: log.quantity > 0 ? '#10b981' : '#ef4444' 
                        }}>
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#2563eb' }}>
                          {log.referenceCode || '-'}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={14} />
                            {log.createdBy?.fullName || 'Hệ thống'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.note || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InventoryTransferPage;
