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
    priceType: 'base' as 'base' | 'packaging'
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
                    padding: '1rem', borderBottom: '1px solid #f1f5f9', 
                    backgroundColor: selectedProductId === p.id ? '#f0fdf4' : 'transparent',
                    transition: 'background-color 0.2s',
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedProductId === p.id ? '1rem' : 0 }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã: {p.productCode || '--'} | Vạch: {p.barcode || '--'}</div>
                      </div>
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          if (selectedProductId === p.id) {
                            onSelect(p, {
                              ...details,
                              quantityPieces: totalPieces,
                              conversionFactor: 1, 
                              quantityBoxes: 0 
                            });
                            setSelectedProductId(null);
                          } else {
                            setSelectedProductId(p.id);
                            const defaultPrice = p.basePrice || 0;
                            setDetails({
                              baseUnitId: p.unitId || '',
                              unitQuantities: {},
                              unitCostPrice: defaultPrice,
                              costPrice: 0,
                              expiryDate: '',
                              priceType: 'base'
                            });
                          }
                        }}
                        style={{ 
                          padding: '0.4rem 1rem', fontSize: '0.875rem', 
                          backgroundColor: selectedProductId === p.id ? '#10b981' : '#f1f5f9',
                          color: selectedProductId === p.id ? 'white' : '#1e293b',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {selectedProductId === p.id ? 'Xác nhận Thêm' : 'Chọn'}
                      </button>
                    </div>

                    {selectedProductId === p.id && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #dcfce7' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Đơn vị lẻ gốc</label>
                            <select 
                              className="form-control" 
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                              value={details.baseUnitId}
                              onChange={(e) => setDetails({...details, baseUnitId: e.target.value})}
                            >
                              {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                          <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569' }}>Số lượng nhập theo đơn vị</label>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                            {/* Always show base unit */}
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{units.find((u: any) => u.id === p.unitId)?.name} (Lẻ)</label>
                              <input 
                                type="number" 
                                className="form-control" 
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                                value={details.unitQuantities[p.unitId || ''] || ''}
                                placeholder="0"
                                onChange={(e) => handleQuantityChange(p.unitId || '', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            {/* Show all conversion units */}
                            {p.units?.map((pu: any) => (
                              <div key={pu.unitId}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{pu.unit?.name}</label>
                                <input 
                                  type="number" 
                                  className="form-control" 
                                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                                  value={details.unitQuantities[pu.unitId] || ''}
                                  placeholder="0"
                                  onChange={(e) => handleQuantityChange(pu.unitId, parseFloat(e.target.value) || 0)}
                                />
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>x{pu.conversionFactor}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Hạn dùng</label>
                          <input 
                            type="date" className="form-control" style={{ padding: '0.4rem', border: '1px solid #ef4444', width: '100%', borderRadius: '0.4rem' }}
                            value={details.expiryDate}
                            onChange={(e) => setDetails({...details, expiryDate: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Giá nhập (1 {baseUnitName})</label>
                          <input 
                            type="text" className="form-control" style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid #10b981', backgroundColor: '#f0fdf4', outline: 'none', fontWeight: '600', color: '#065f46' }}
                            value={formatNumber(details.unitCostPrice)}
                            onChange={(e) => handleUnitCostPriceChange(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Thành tiền (Tổng cộng)</label>
                          <div style={{ display: 'flex' }}>
                            <input 
                              type="text" className="form-control" style={{ flex: 1, padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0', outline: 'none' }}
                              value={formatNumber(details.costPrice)}
                              onChange={(e) => handleTotalCostChange(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>
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
