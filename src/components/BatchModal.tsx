import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { type InventoryBatch, type Product, getUnits } from '../api/inventory';
import { type Distributor } from '../api/distributors';
import { useBranchContext } from '../context/BranchContext';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<InventoryBatch>) => Promise<void>;
  batch?: InventoryBatch;
  products: Product[];
  distributors: Distributor[];
}

const BatchModal: React.FC<BatchModalProps> = ({ isOpen, onClose, onSubmit, batch, products, distributors }) => {
  const { t } = useTranslation();
  const { selectedBranchId } = useBranchContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: units = [] } = useQuery({ 
    queryKey: ['units'], 
    queryFn: getUnits,
    enabled: isOpen
  });
  
  // Local state for UI
  const [productSearch, setProductSearch] = useState('');
  const [inputBoxes, setInputBoxes] = useState<number>(0);
  const [inputPieces, setInputPieces] = useState<number>(0);
  const [inputPrice, setInputPrice] = useState<number>(0);
  const [priceType, setPriceType] = useState<'base' | 'packaging'>('base');

  const [formData, setFormData] = useState({
    productId: '',
    distributorId: '',
    branchId: selectedBranchId || '',
    unitId: '',
    importedQuantity: 0,
    currentQuantity: 0,
    costPrice: 0,
    importDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    invoiceName: '',
    packagingUnitId: '',
    conversionFactor: 1
  });

  useEffect(() => {
    if (batch) {
      setFormData({
        productId: batch.productId,
        distributorId: batch.distributorId || '',
        branchId: batch.branchId,
        unitId: batch.unitId || '',
        importedQuantity: batch.importedQuantity,
        currentQuantity: batch.currentQuantity,
        costPrice: batch.costPrice,
        importDate: batch.importDate ? new Date(batch.importDate).toISOString().split('T')[0] : '',
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '',
        invoiceName: batch.invoiceName || '',
        packagingUnitId: batch.packagingUnitId || '',
        conversionFactor: batch.conversionFactor || 1
      });
      if (batch) {
        const factor = batch.conversionFactor || 1;
        setInputBoxes(Math.floor(batch.importedQuantity / factor));
        setInputPieces(batch.importedQuantity % factor);
      } else {
        setInputBoxes(0);
        setInputPieces(0);
      }
      setInputPrice(batch.costPrice);
      setPriceType('base');
    } else {
      setFormData({
        productId: '',
        distributorId: distributors.length > 0 ? distributors[0].id : '',
        branchId: selectedBranchId || '',
        unitId: '',
        importedQuantity: 0,
        currentQuantity: 0,
        costPrice: 0,
        importDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        invoiceName: '',
        packagingUnitId: '',
        conversionFactor: 1
      });
      setProductSearch('');
      setInputBoxes(0);
      setInputPieces(0);
      setInputPrice(0);
      setPriceType('base');
    }
  }, [batch, isOpen, products, distributors, selectedBranchId]);



  // Sync calculation
  useEffect(() => {
    if (!batch) {
      let totalQty = inputPieces;
      let finalUnitPrice = inputPrice;
      const factor = formData.conversionFactor || 1;

      if (factor > 1) {
        totalQty += inputBoxes * factor;
        if (priceType === 'packaging') {
          finalUnitPrice = inputPrice / factor;
        }
      }

      setFormData(prev => ({
        ...prev,
        importedQuantity: totalQty,
        currentQuantity: totalQty,
        costPrice: Math.round(finalUnitPrice)
      }));
    }
  }, [inputBoxes, inputPieces, inputPrice, priceType, formData.conversionFactor, batch]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    (p.barcode && p.barcode.includes(productSearch)) ||
    (p.productCode && p.productCode.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? Number(value) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit batch:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {batch ? t('inventory.modal_edit_batch') : t('inventory.modal_add_batch')}
          </h2>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Product Select with Search */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Tìm & Chọn sản phẩm
              </label>
              {!batch && (
                <input 
                  type="text" 
                  placeholder="Gõ tên hoặc mã vạch để tìm nhanh..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '0.5rem', outline: 'none', backgroundColor: '#f8fafc', fontSize: '0.875rem' }}
                />
              )}
              <select name="productId" value={formData.productId} onChange={handleChange} required disabled={!!batch}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: batch ? '#f3f4f6' : 'white' }}>
                <option value="">-- Click vào đây để chọn sản phẩm --</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.barcode ? `[${p.barcode}]` : ''} ({p.unit?.name})
                  </option>
                ))}
              </select>
              {!batch && productSearch && filteredProducts.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>Không tìm thấy sản phẩm nào phù hợp</div>
              )}
            </div>

            {/* Distributor Select */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Nhà cung cấp
              </label>
              <select name="distributorId" value={formData.distributorId} onChange={handleChange} required
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }}>
                <option value="">-- Chọn nhà cung cấp --</option>
                {distributors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Base Unit Selection */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Đơn vị lẻ cơ bản
              </label>
              <select name="unitId" value={formData.unitId} onChange={handleChange} required
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'white' }}>
                <option value="">-- Chọn đơn vị lẻ --</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Packaging Unit Selection */}
            <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Thiết lập quy cách nhập (Nếu có)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>ĐVT quy đổi (Thùng/Hộp...)</label>
                  <select name="packagingUnitId" value={formData.packagingUnitId} onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}>
                    <option value="">-- Không quy đổi --</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>1 {units.find((u: any) => u.id === formData.packagingUnitId)?.name || 'đơn vị'} = ? {units.find((u: any) => u.id === formData.unitId)?.name || 'đơn vị lẻ'}</label>
                  <input type="number" name="conversionFactor" value={formData.conversionFactor} onChange={handleChange} min={1}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
              </div>
            </div>

            {/* Quantity: Boxes + Pieces */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Số lượng nhập
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {formData.packagingUnitId && (
                  <div style={{ flex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      <input type="number" value={inputBoxes} onChange={(e) => setInputBoxes(Number(e.target.value))} required min={0}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#64748b' }}>{units.find((u: any) => u.id === formData.packagingUnitId)?.name}</span>
                    </div>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={inputPieces} onChange={(e) => setInputPieces(Number(e.target.value))} required min={0}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#64748b' }}>{units.find((u: any) => u.id === formData.unitId)?.name || 'Lẻ'}</span>
                  </div>
                </div>
              </div>
              {formData.conversionFactor > 1 && (inputBoxes > 0 || inputPieces > 0) && (
                <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '600', marginTop: '0.5rem' }}>
                  Tổng cộng: { (inputBoxes * formData.conversionFactor) + inputPieces } {units.find((u: any) => u.id === formData.unitId)?.name || 'đơn vị'}
                </div>
              )}
            </div>

            {/* Price */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                  <span style={{color: '#ef4444'}}>*</span> Giá nhập
                </label>
                {formData.packagingUnitId && (
                  <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '0.5rem' }}>
                    <button type="button" onClick={() => setPriceType('base')} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', backgroundColor: priceType === 'base' ? 'white' : 'transparent', fontWeight: priceType === 'base' ? '600' : '400' }}>/{units.find((u: any) => u.id === formData.unitId)?.name || 'Lẻ'}</button>
                    <button type="button" onClick={() => setPriceType('packaging')} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', backgroundColor: priceType === 'packaging' ? 'white' : 'transparent', fontWeight: priceType === 'packaging' ? '600' : '400' }}>/{units.find((u: any) => u.id === formData.packagingUnitId)?.name}</button>
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.875rem' }}>₫</div>
                <input type="number" value={inputPrice} onChange={(e) => setInputPrice(Number(e.target.value))} required min={0} step={1000}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
              </div>
              {priceType === 'packaging' && formData.conversionFactor > 1 && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  ~ {Math.round(inputPrice / formData.conversionFactor).toLocaleString()} ₫/{units.find((u: any) => u.id === formData.unitId)?.name || 'lẻ'}
                </div>
              )}
            </div>

            {/* Expiry Date & Import Date side by side */}
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Hạn sử dụng</label>
                <div style={{ position: 'relative' }}>
                  <CalendarIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }} />
                  <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid #ef4444', outline: 'none', backgroundColor: '#fff5f5' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Ngày nhập</label>
                <div style={{ position: 'relative' }}>
                  <CalendarIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="date" name="importDate" value={formData.importDate} onChange={handleChange}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>
              {t('common.btn_cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '0.75rem 1.5rem', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {batch ? t('common.btn_save') : t('common.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchModal;
