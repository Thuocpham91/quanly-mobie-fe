import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { getStocktake, createStocktake, approveStocktake, StocktakeStatus, type StocktakeItemDto } from '../api/stocktakes';
import { getInventorySummary, getProducts, type Product } from '../api/inventory';
import { useBranchContext } from '../context/BranchContext';

const StocktakeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();
  
  const isNew = id === 'new';

  const [note, setNote] = useState('');
  const [items, setItems] = useState<StocktakeItemDto[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Fetch data
  const { data: stocktake, isLoading: isLoadingStocktake } = useQuery({
    queryKey: ['stocktake', id],
    queryFn: () => getStocktake(id!),
    enabled: !isNew && !!id,
  });

  const { data: inventorySummary = [] } = useQuery({
    queryKey: ['inventorySummary', selectedBranchId],
    queryFn: () => getInventorySummary(selectedBranchId!),
    enabled: !!selectedBranchId,
  });

  const { data: products = [] } = useQuery<Product[]>({
  queryKey: ['products'],
  queryFn: () => getProducts(),
});

  // Pre-fill form when editing/viewing
  useEffect(() => {
    if (stocktake && !isNew) {
      setNote(stocktake.note || '');
      setItems(stocktake.items.map(i => ({
        productId: i.productId,
        systemQuantity: i.systemQuantity,
        actualQuantity: i.actualQuantity,
        difference: i.difference,
        reason: i.reason,
      })));
    }
  }, [stocktake, isNew]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createStocktake,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      navigate('/admin/inventory/stocktakes');
    }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'COMPLETED' | 'CANCELLED' }) => approveStocktake(id, status),
    onSuccess: (_, variables) => {
      const actionText = variables.status === StocktakeStatus.COMPLETED ? 'Duyệt' : 'Hủy';
      alert(`${actionText} phiếu kiểm kho thành công!`);
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      queryClient.invalidateQueries({ queryKey: ['stocktake', id] });
      queryClient.invalidateQueries({ queryKey: ['inventoryBatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      alert(`Thao tác thất bại: ${err?.response?.data?.message || err?.message || 'Không rõ lỗi'}`);
    }
  });

  // Actions
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    if (items.find(i => i.productId === selectedProductId)) {
      alert('Sản phẩm này đã có trong danh sách kiểm kho.');
      return;
    }

    const summaryItem = inventorySummary.find((s: any) => s.product.id === selectedProductId);
    const sysQty = summaryItem ? summaryItem.totalStock : 0;

    setItems([...items, {
      productId: selectedProductId,
      systemQuantity: sysQty,
      actualQuantity: sysQty,
      difference: 0,
    }]);
    setSelectedProductId('');
  };

  const handleUpdateItem = (index: number, actualQuantity: number, reason?: string) => {
    const newItems = [...items];
    const item = newItems[index];
    item.actualQuantity = actualQuantity;
    item.difference = actualQuantity - item.systemQuantity;
    if (reason !== undefined) item.reason = reason;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!selectedBranchId) return alert('Vui lòng chọn chi nhánh');
    if (items.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm để kiểm kho');

    createMutation.mutate({
      branchId: selectedBranchId,
      note,
      items
    });
  };

  const handleApprove = (status: 'COMPLETED' | 'CANCELLED') => {
    if (window.confirm(`Bạn có chắc muốn ${status === StocktakeStatus.COMPLETED ? 'duyệt' : 'hủy'} phiếu kiểm kho này?`)) {
      approveMutation.mutate({ id: id!, status });
    }
  };

  const isReadonly = !isNew && stocktake?.status !== StocktakeStatus.PENDING;

  if (!isNew && isLoadingStocktake) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin/inventory/stocktakes')} style={{ padding: '0.5rem', borderRadius: '50%', border: 'none', backgroundColor: '#e2e8f0', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              {isNew ? 'Tạo phiếu kiểm kho mới' : `Phiếu kiểm kho ${stocktake?.code}`}
            </h1>
            {!isNew && stocktake && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                Trạng thái: 
                <strong style={{ marginLeft: '0.5rem', color: stocktake.status === StocktakeStatus.COMPLETED ? '#10b981' : stocktake.status === StocktakeStatus.CANCELLED ? '#ef4444' : '#f59e0b' }}>
                  {stocktake.status}
                </strong>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isNew && (
            <button 
              onClick={handleSave}
              disabled={createMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
            >
              <Save size={16} /> {createMutation.isPending ? 'Đang lưu...' : 'Lưu & Chờ duyệt'}
            </button>
          )}
          {!isNew && stocktake?.status === StocktakeStatus.PENDING && (
            <>
              <button 
                onClick={() => handleApprove(StocktakeStatus.CANCELLED)}
                disabled={approveMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
              >
                <XCircle size={16} /> Hủy phiếu
              </button>
              <button 
                onClick={() => handleApprove(StocktakeStatus.COMPLETED)}
                disabled={approveMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
              >
                <CheckCircle size={16} /> Duyệt & Cập nhật kho
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        {/* Left Col: Items */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            Chi tiết kiểm kho
          </h2>

          {!isReadonly && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="">-- Chọn sản phẩm để kiểm kho --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} {p.barcode ? `(${p.barcode})` : ''}</option>
                ))}
              </select>
              <button 
                onClick={handleAddProduct}
                style={{ padding: '0.65rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Plus size={18} /> Thêm
              </button>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.75rem', fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>Sản phẩm</th>
                <th style={{ padding: '0.75rem', fontWeight: '600', color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>Tồn hệ thống</th>
                <th style={{ padding: '0.75rem', fontWeight: '600', color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>Thực tế</th>
                <th style={{ padding: '0.75rem', fontWeight: '600', color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>Chênh lệch</th>
                <th style={{ padding: '0.75rem', fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>Lý do</th>
                {!isReadonly && <th style={{ padding: '0.75rem', width: '40px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Chưa có sản phẩm nào.</td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const product = products.find((p: any) => p.id === item.productId);
                  return (
                    <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{product?.name || '---'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b' }}>{item.systemQuantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {isReadonly ? (
                          <span style={{ fontWeight: '600' }}>{item.actualQuantity}</span>
                        ) : (
                          <input 
                            type="number"
                            min="0"
                            value={item.actualQuantity}
                            onChange={(e) => handleUpdateItem(idx, parseInt(e.target.value) || 0)}
                            style={{ width: '80px', padding: '0.4rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '700', color: item.difference > 0 ? '#10b981' : item.difference < 0 ? '#ef4444' : '#64748b' }}>
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {isReadonly ? (
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.reason || '--'}</span>
                        ) : (
                          <input 
                            type="text"
                            placeholder="Lý do chênh lệch"
                            value={item.reason || ''}
                            onChange={(e) => handleUpdateItem(idx, item.actualQuantity, e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        )}
                      </td>
                      {!isReadonly && (
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button onClick={() => handleRemoveItem(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right Col: Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
              Thông tin chung
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                Chi nhánh kiểm kho
              </label>
              <div style={{ padding: '0.65rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: '#64748b' }}>
                {selectedBranchId ? 'Chi nhánh hiện tại' : 'Chưa chọn chi nhánh'}
              </div>
            </div>

            {!isNew && stocktake && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                    Người tạo
                  </label>
                  <div style={{ padding: '0.65rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: '#475569', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '600' }}>{stocktake.createdBy?.fullName || '---'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {new Date(stocktake.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>

                {(stocktake.status === StocktakeStatus.COMPLETED || stocktake.status === StocktakeStatus.CANCELLED) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                      {stocktake.status === StocktakeStatus.COMPLETED ? 'Người duyệt' : 'Người hủy'}
                    </label>
                    <div style={{ padding: '0.65rem 1rem', backgroundColor: stocktake.status === StocktakeStatus.COMPLETED ? '#ecfdf5' : '#fef2f2', border: `1px solid ${stocktake.status === StocktakeStatus.COMPLETED ? '#a7f3d0' : '#fecaca'}`, borderRadius: '0.5rem', color: stocktake.status === StocktakeStatus.COMPLETED ? '#065f46' : '#991b1b', fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: '600' }}>{stocktake.approvedBy?.fullName || '---'}</div>
                      <div style={{ fontSize: '0.75rem', color: stocktake.status === StocktakeStatus.COMPLETED ? '#047857' : '#b91c1c', marginTop: '0.2rem' }}>
                        {new Date(stocktake.updatedAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                Ghi chú
              </label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                readOnly={isReadonly}
                placeholder="Nhập ghi chú cho phiếu kiểm kho này..."
                style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none', minHeight: '100px', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StocktakeFormPage;
