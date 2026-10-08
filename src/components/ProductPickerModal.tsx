import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { type Product, getUnits } from '../api/inventory';
import { formatNumber, parseNumber } from '../utils/format';

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelect: (product: Product, details: any) => void;
}

const ProductPickerModal: React.FC<ProductPickerModalProps> = ({ isOpen, onClose, products, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Detail States for the selected product
  const [details, setDetails] = useState({
    baseUnitId: '',
    unitQuantities: {} as Record<string, number>, // Stores quantity for each unitId
    expiryDate: '',
    unitCostPrice: 0,
    costPrice: 0,
    priceType: 'base' as 'base' | 'packaging',
    imeisText: '',
    trackImei: false,
  });

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: getUnits, enabled: isOpen });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm)) ||
    (p.productCode && p.productCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: isMobile ? '0' : '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: isMobile ? '0' : '1rem', width: '100%', maxWidth: '800px', height: isMobile ? '100%' : '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Chọn sản phẩm nhập kho</h3>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên sản phẩm, mã vạch, mã sản phẩm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', outline: 'none' }}
            />
          </div>
        </div>

        {/* Product List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {filteredProducts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.25rem' }}>
              {filteredProducts.map(p => {
                let totalPieces = details.unitQuantities[p.unitId || ''] || 0;
                p.units?.forEach((pu: any) => {
                  totalPieces += (details.unitQuantities[pu.unitId] || 0) * pu.conversionFactor;
                });

                const baseUnitName = units.find((u: any) => u.id === (details.baseUnitId || p.unitId))?.name || 'cái';

                const handleQuantityChange = (unitId: string, val: number) => {
                  const newQuantities = { ...details.unitQuantities, [unitId]: val };
                  let newTotal = newQuantities[p.unitId || ''] || 0;
                  p.units?.forEach((pu: any) => {
                    newTotal += (newQuantities[pu.unitId] || 0) * pu.conversionFactor;
                  });
                  const newCost = details.unitCostPrice > 0 ? details.unitCostPrice * newTotal : details.costPrice;
                  setDetails({
                    ...details,
                    unitQuantities: newQuantities,
                    costPrice: newCost
                  });
                };

                const handleUnitCostPriceChange = (valStr: string) => {
                  const newUnitPrice = parseNumber(valStr);
                  const newCost = newUnitPrice * totalPieces;
                  setDetails({
                    ...details,
                    unitCostPrice: newUnitPrice,
                    costPrice: newCost
                  });
                };

                const handleTotalCostChange = (valStr: string) => {
                  const newTotalCost = parseNumber(valStr);
                  const newUnitPrice = totalPieces > 0 ? Math.round(newTotalCost / totalPieces) : newTotalCost;
                  setDetails({
                    ...details,
                    unitCostPrice: newUnitPrice,
                    costPrice: newTotalCost
                  });
                };

                return (
                  <div key={p.id} style={{ 
                    borderRadius: '0.75rem',
                    marginBottom: '0.75rem',
                    transition: 'all 0.2s ease',
                  }}>
                    {/* Header item bar */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.85rem 1rem', 
                      backgroundColor: selectedProductId === p.id ? '#f0fdf4' : '#ffffff',
                      border: selectedProductId === p.id ? '1px solid #10b981' : '1px solid #e2e8f0',
                      borderRadius: selectedProductId === p.id ? '0.75rem 0.75rem 0 0' : '0.75rem',
                      boxShadow: selectedProductId === p.id ? '0 1px 3px rgba(16, 185, 129, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{p.name}</span>
                          {p.productCode ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0369a1', backgroundColor: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '0.375rem' }}>
                              Mã: {p.productCode}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '0.375rem' }}>Chưa có mã</span>
                          )}
                          {(p.hasImei || (p as any).isImei || (p as any).manageImei || (p.imeis && p.imeis.length > 0)) && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6d28d9', backgroundColor: '#ede9fe', padding: '0.15rem 0.45rem', borderRadius: '0.375rem' }}>
                              Serial/IMEI
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span>Mã vạch: <strong style={{ color: '#334155' }}>{p.barcode || '--'}</strong></span>
                          <span>Đơn vị: <strong style={{ color: '#334155' }}>{units.find((u: any) => u.id === p.unitId)?.name || '--'}</strong></span>
                          <span>Giá nhập: <strong style={{ color: '#0891b2' }}>{p.importPrice ? formatNumber(p.importPrice) + ' ₫' : '--'}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {selectedProductId === p.id && (
                          <button
                            type="button"
                            onClick={() => setSelectedProductId(null)}
                            style={{
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.82rem',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                            }}
                          >
                            Hủy
                          </button>
                        )}
                        <button 
                          type="button"
                          className="btn-primary" 
                          onClick={() => {
                            if (selectedProductId === p.id) {
                              onSelect(p, {
                                ...details,
                                trackImei: details.trackImei,
                                quantityPieces: totalPieces,
                                conversionFactor: 1, 
                                quantityBoxes: 0,
                                imeis: details.imeisText ? details.imeisText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [],
                                serialInput: details.imeisText
                              });
                              setSelectedProductId(null);
                            } else {
                              setSelectedProductId(p.id);
                              const defaultPrice = p.importPrice || p.basePrice || 0;
                              const isImeiProduct = Boolean(
                                p.hasImei ||
                                String(p.hasImei) === 'true' ||
                                (p as any).isImei ||
                                (p as any).manageImei ||
                                (p.imeis && p.imeis.length > 0)
                              );
                              setDetails({
                                baseUnitId: p.unitId || '',
                                unitQuantities: {},
                                unitCostPrice: defaultPrice,
                                costPrice: 0,
                                expiryDate: '',
                                priceType: 'base',
                                imeisText: '',
                                trackImei: isImeiProduct,
                              });
                            }
                          }}
                          style={{ 
                            padding: '0.45rem 1rem', 
                            fontSize: '0.85rem', 
                            fontWeight: 600,
                            backgroundColor: selectedProductId === p.id ? '#059669' : '#10b981',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: selectedProductId === p.id ? '0 2px 4px rgba(5, 150, 105, 0.25)' : 'none',
                          }}
                        >
                          {selectedProductId === p.id ? '✓ Xác nhận Thêm' : 'Chọn'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details form */}
                    {selectedProductId === p.id && (
                      <div style={{ 
                        padding: '1.25rem', 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #10b981',
                        borderTop: 'none',
                        borderRadius: '0 0 0.75rem 0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      }}>
                        {/* Section 1: Units and Quantities */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: '1rem',
                          padding: '1rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.5rem',
                          border: '1px solid #e2e8f0',
                        }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                              Đơn vị lẻ gốc
                            </label>
                            <select 
                              value={details.baseUnitId}
                              onChange={(e) => setDetails({...details, baseUnitId: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.4rem',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            >
                              {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                              Số lượng ({units.find((u: any) => u.id === p.unitId)?.name || 'Lẻ'})
                            </label>
                            <input 
                              type="number" 
                              min="0"
                              value={details.unitQuantities[p.unitId || ''] || ''}
                              placeholder="0"
                              onChange={(e) => handleQuantityChange(p.unitId || '', parseFloat(e.target.value) || 0)}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.4rem',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                outline: 'none',
                              }}
                            />
                          </div>

                          {p.units?.map((pu: any) => (
                            <div key={pu.unitId}>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                                {pu.unit?.name} (x{pu.conversionFactor})
                              </label>
                              <input 
                                type="number" 
                                min="0"
                                value={details.unitQuantities[pu.unitId] || ''}
                                placeholder="0"
                                onChange={(e) => handleQuantityChange(pu.unitId, parseFloat(e.target.value) || 0)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: 'white',
                                  fontSize: '0.85rem',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          ))}

                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                              Hạn dùng
                            </label>
                            <input 
                              type="date" 
                              value={details.expiryDate}
                              onChange={(e) => setDetails({...details, expiryDate: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '0.4rem',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            />
                          </div>
                        </div>

                        {/* Section 2: Price and Total */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                          gap: '1rem',
                          padding: '1rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '0.5rem',
                          border: '1px solid #e2e8f0',
                        }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                              Giá nhập (1 {baseUnitName})
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type="text" 
                                value={formatNumber(details.unitCostPrice)}
                                onChange={(e) => handleUnitCostPriceChange(e.target.value)}
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 2rem 0.5rem 0.75rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: 'white',
                                  fontSize: '0.9rem',
                                  fontWeight: 600,
                                  color: '#0284c7',
                                  outline: 'none',
                                }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>₫</span>
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                              Thành tiền (Tổng cộng)
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type="text" 
                                value={formatNumber(details.costPrice)}
                                onChange={(e) => handleTotalCostChange(e.target.value)}
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 2rem 0.5rem 0.75rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid #10b981',
                                  backgroundColor: '#ecfdf5',
                                  fontSize: '0.95rem',
                                  fontWeight: 700,
                                  color: '#059669',
                                  outline: 'none',
                                }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>₫</span>
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Serial / IMEI */}
                        {(details.trackImei || p.hasImei || String(p.hasImei) === 'true' || (p as any).isImei || (p as any).manageImei || (p.imeis && p.imeis.length > 0)) ? (
                          <div style={{ 
                            padding: '1rem', 
                            backgroundColor: '#f0f9ff', 
                            borderRadius: '0.5rem', 
                            border: '1px solid #bae6fd' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
                                Danh sách số Serial / IMEI máy
                              </label>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: details.imeisText.split(/[\n,]+/).filter(Boolean).length === totalPieces && totalPieces > 0 ? '#059669' : '#d97706',
                                backgroundColor: details.imeisText.split(/[\n,]+/).filter(Boolean).length === totalPieces && totalPieces > 0 ? '#ecfdf5' : '#fffbeb',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '0.375rem',
                                border: '1px solid currentColor',
                              }}>
                                Đã nhập: {details.imeisText.split(/[\n,]+/).filter(Boolean).length} / {totalPieces} mã
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              placeholder="Nhập hoặc dán các mã IMEI/Serial (mỗi mã 1 dòng hoặc cách nhau bằng dấu phẩy)..."
                              style={{ 
                                width: '100%', 
                                padding: '0.6rem', 
                                borderRadius: '0.4rem', 
                                border: '1px solid #7dd3fc', 
                                fontSize: '0.85rem', 
                                fontFamily: 'monospace', 
                                outline: 'none', 
                                boxSizing: 'border-box', 
                                backgroundColor: 'white',
                                resize: 'vertical',
                              }}
                              value={details.imeisText}
                              onChange={(e) => setDetails({ ...details, imeisText: e.target.value })}
                            />
                            <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '0.3rem' }}>
                              💡 Mỗi IMEI là 1 máy. Bạn có thể quét mã vạch hoặc dán nhiều mã cùng lúc.
                            </div>
                          </div>
                        ) : (
                          <div>
                            <button
                              type="button"
                              onClick={() => setDetails(prev => ({ ...prev, trackImei: true }))}
                              style={{
                                fontSize: '0.8rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px dashed #6366f1',
                                color: '#4f46e5',
                                backgroundColor: '#f5f3ff',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              + Quản lý Serial / IMEI cho sản phẩm này
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (

            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Không tìm thấy sản phẩm nào phù hợp
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPickerModal;
