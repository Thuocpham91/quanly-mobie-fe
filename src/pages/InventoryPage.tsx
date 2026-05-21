import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, FileDown, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  getInventoryBatches, 
  deleteInventoryBatch,
  type Product, type InventoryBatch
} from '../api/inventory';
import { useBranchContext } from '../context/BranchContext';
import * as XLSX from 'xlsx';

const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistributorId, setFilterDistributorId] = useState('');

  // Modals state (none)

  // Fetch Data
  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ['inventoryBatches', selectedBranchId],
    queryFn: () => getInventoryBatches(selectedBranchId!),
    enabled: !!selectedBranchId,
  });


  const { data: distributors = [] } = useQuery({
    queryKey: ['distributors'],
    queryFn: () => import('../api/distributors').then(m => m.getDistributors()),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: deleteInventoryBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    }
  });

  // Filtering
  const filteredBatches = batches.filter((batch: InventoryBatch) => {
    const matchesSearch = batch.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (batch.product?.barcode && batch.product.barcode.includes(searchTerm));
    const matchesDistributor = !filterDistributorId || batch.distributorId === filterDistributorId;
    return matchesSearch && matchesDistributor;
  });

  const formatQuantity = (qty: number, product?: Product) => {
    const packagingUnit = product?.units?.find(pu => pu.conversionFactor > 1);
    
    if (!product || !packagingUnit) {
      return `${qty.toLocaleString()} ${product?.unit?.name || ''}`;
    }

    const factor = packagingUnit.conversionFactor || 1;
    const boxes = Math.floor(qty / factor);
    const pieces = qty % factor;
    const packagingUnitName = packagingUnit.unit?.name || 'Đơn vị lớn';

    if (boxes === 0) return `${pieces} ${product.unit?.name || ''}`;
    if (pieces === 0) return `${boxes} ${packagingUnitName}`;
    
    return `${boxes} ${packagingUnitName} ${pieces} ${product.unit?.name || ''}`;
  };

  const handleExportExcel = () => {
    const exportData = filteredBatches.map((batch: InventoryBatch, idx: number) => ({
      'STT': idx + 1,
      'Tên sản phẩm': batch.product?.name || 'Sản phẩm đã xóa',
      'Mã vạch': batch.product?.barcode || '--',
      'Nhà cung cấp': batch.distributor?.name || '--',
      'Người nhập': batch.personnelName || '--',
      'Số lượng nhập': batch.importedQuantity,
      'Tồn kho': batch.currentQuantity,
      'Đơn vị': batch.product?.unit?.name || '--',
      'Giá nhập (đơn giá)': Number(batch.costPrice),
      'Thành tiền': batch.importedQuantity * Number(batch.costPrice),
      'Ngày nhập': batch.importDate ? new Date(batch.importDate).toLocaleDateString('vi-VN') : '--',
      'Hạn sử dụng': batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('vi-VN') : '--',
      'Số hóa đơn': batch.invoiceName || '--'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    // Set column widths
    const wscols = [
      {wch: 5}, {wch: 30}, {wch: 15}, {wch: 25}, {wch: 20}, 
      {wch: 15}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15}, 
      {wch: 15}, {wch: 15}, {wch: 20}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `bao_cao_nhap_kho_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', backgroundColor: '#f8fafc' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>Quản lý nhập kho</h1>
          <p style={{ color: '#64748b' }}>Chi tiết lô hàng và hạn dùng theo nhà cung cấp</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-secondary" 
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
          >
            <FileDown size={16} />
            {t('inventory.btn_export')}
          </button>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/admin/inventory/import')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', backgroundColor: '#3b82f6', border: 'none' }}
          >
            <Plus size={16} />
            Nhập hàng
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Search & Filter Bar */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('common.search_placeholder')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem',
                borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>

          <select 
            className="form-control"
            style={{ maxWidth: '250px' }}
            value={filterDistributorId}
            onChange={(e) => setFilterDistributorId(e.target.value)}
          >
            <option value="">-- Tất cả nhà cung cấp --</option>
            {distributors.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Data Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead style={{ backgroundColor: '#10b981', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>{t('inventory.col_index')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>{t('inventory.col_name')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Nhà cung cấp</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>Người nhập</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>{t('inventory.col_imported')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>{t('inventory.col_stock')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>{t('inventory.col_cost')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>{t('inventory.label_import_date')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem' }}>{t('inventory.label_expiry_date')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'center' }}>{t('inventory.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingBatches && <LoadingRow cols={10} text={t('inventory.fetching')} />}
              {!isLoadingBatches && filteredBatches.length === 0 && <EmptyRow cols={10} text={t('inventory.empty')} />}

              {filteredBatches.map((batch: InventoryBatch, idx: number) => (
                <tr key={batch.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#1e293b' }}>{batch.product?.name || 'Sản phẩm đã xóa'}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{batch.distributor?.name || '--'}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{batch.personnelName || '--'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>{formatQuantity(batch.importedQuantity, batch.product)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: batch.currentQuantity > 0 ? '#10b981' : '#ef4444' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span>{formatQuantity(batch.currentQuantity, batch.product)}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#94a3b8' }}>({batch.currentQuantity.toLocaleString()} {batch.product?.unit?.name})</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>{Number(batch.costPrice).toLocaleString()} ₫</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{batch.importDate ? new Date(batch.importDate).toLocaleDateString() : '--'}</td>
                  <td style={{ padding: '1rem', color: '#ef4444' }}>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '--'}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button onClick={() => navigate(`/admin/inventory/import?editId=${batch.id}`)} style={{ padding: '0.25rem', color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                      <button onClick={() => { if (window.confirm(t('inventory.delete_confirm'))) deleteBatchMutation.mutate(batch.id); }} style={{ padding: '0.25rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals (handled via navigation) */}
    </div>
  );
};

// UI Components
const LoadingRow: React.FC<{ cols: number, text: string }> = ({ cols, text }) => (
  <tr><td colSpan={cols} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{text}</td></tr>
);

const EmptyRow: React.FC<{ cols: number, text: string }> = ({ cols, text }) => (
  <tr><td colSpan={cols} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>{text}</td></tr>
);

export default InventoryPage;
