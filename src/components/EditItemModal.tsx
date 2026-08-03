import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { getUnits } from '../api/inventory';
import { useQuery } from '@tanstack/react-query';
import { formatNumber, parseNumber } from '../utils/format';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSave: (details: any) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ isOpen, onClose, item, onSave }) => {
  const [details, setDetails] = useState({
    baseUnitId: item?.baseUnitId || '',
    unitQuantities: item?.unitQuantities || {},
    expiryDate: item?.expiryDate || '',
    costPrice: item?.costPrice || 0,
    priceType: item?.priceType || 'base',
    imeisText: (item?.imeis || []).join('\n')
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: getUnits, enabled: isOpen });

  useEffect(() => {
    if (item && isOpen) {
      setDetails({
        baseUnitId: item.baseUnitId || '',
        unitQuantities: item.unitQuantities || {},
        expiryDate: item.expiryDate || '',
        costPrice: item.costPrice || 0,
        priceType: item.priceType || 'base',
        imeisText: (item.imeis || []).join('\n')
      });
    }
  }, [item, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    // Calculate total pieces
    let totalPieces = details.unitQuantities[details.baseUnitId] || 0;
    item.product.units?.forEach((pu: any) => {
      totalPieces += (details.unitQuantities[pu.unitId] || 0) * pu.conversionFactor;
    });

    const parsedImeis = details.imeisText
      ? details.imeisText.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean)
      : [];

    onSave({
      ...details,
      imeis: parsedImeis,
      quantityPieces: totalPieces,
      conversionFactor: 1, // Reset for consistency
      quantityBoxes: 0
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: isMobile ? '0' : '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: isMobile ? '0' : '1rem', width: '100%', maxWidth: '500px', height: isMobile ? '100%' : 'auto', maxHeight: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Chỉnh sửa thông tin</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{item.product.name}</p>
          </div>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1 }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Đơn vị lẻ</label>
            <select 
              className="form-control" 
              style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              value={details.baseUnitId}
              onChange={(e) => setDetails({...details, baseUnitId: e.target.value})}
            >
              {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Multiple Unit Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569' }}>Số lượng nhập theo đơn vị</label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
              {/* Base unit */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{units.find((u: any) => u.id === details.baseUnitId)?.name || 'Đơn vị'} (Lẻ)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                  value={details.unitQuantities[details.baseUnitId] || ''}
                  placeholder="0"
                  onChange={(e) => setDetails({
                    ...details, 
                    unitQuantities: { ...details.unitQuantities, [details.baseUnitId]: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              {/* Conversion units */}
              {item.product.units?.map((pu: any) => (
                <div key={pu.unitId}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{pu.unit?.name}</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1' }}
                    value={details.unitQuantities[pu.unitId] || ''}
                    placeholder="0"
                    onChange={(e) => setDetails({
                      ...details, 
                      unitQuantities: { ...details.unitQuantities, [pu.unitId]: parseFloat(e.target.value) || 0 }
                    })}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>x{pu.conversionFactor}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Hạn sử dụng</label>
            <input 
              type="date" className="form-control" 
              style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              value={details.expiryDate}
              onChange={(e) => setDetails({...details, expiryDate: e.target.value})}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>Thành tiền (Tổng cộng)</label>
            <div style={{ display: 'flex' }}>
              <input 
                type="text" className="form-control" 
                style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                value={formatNumber(details.costPrice)}
                onChange={(e) => setDetails({...details, costPrice: parseNumber(e.target.value)})}
              />
            </div>
          </div>

          {item.product?.hasImei && (
            <div className="form-group" style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0.75rem', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0369a1' }}>
                  Danh sách số Serial / IMEI máy
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: details.imeisText.split(/[\n,]+/).filter(Boolean).length === (details.unitQuantities[details.baseUnitId] || 0) ? '#059669' : '#d97706' }}>
                  Đã nhập: {details.imeisText.split(/[\n,]+/).filter(Boolean).length} / {details.unitQuantities[details.baseUnitId] || 0}
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="Nhập hoặc dán các mã IMEI/Serial (mỗi mã 1 dòng hoặc cách nhau bằng dấu phẩy)..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #7dd3fc', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                value={details.imeisText}
                onChange={(e) => setDetails({ ...details, imeisText: e.target.value })}
              />
              <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '0.25rem' }}>
                * Mỗi IMEI là 1 máy. Bạn có thể quét mã vạch hoặc dán nhiều mã cùng lúc.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
          >
            Hủy
          </button>
          <button 
            onClick={handleSave}
            style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Save size={18} />
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
