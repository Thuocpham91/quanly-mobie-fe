import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../api/client';

interface BoardingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cageName: string;
  petName?: string;
  ownerName?: string;
  onConfirm: (services: any[], expectedCheckout?: string, notesText?: string) => void;
}

const BoardingEntryModal: React.FC<BoardingEntryModalProps> = ({ isOpen, onClose, cageName, petName, ownerName, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'time'>('time');
  const [sameDay, setSameDay] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNotesText('');
    }
  }, [isOpen]);

  // Fetch products list for service search
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['productsForServiceSearch'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data?.data || response.data || [];
    },
    enabled: isOpen
  });

  // Filter top 5 product suggestions matching search
  const filteredProductsForService = useMemo(() => {
    if (!serviceSearch) return [];
    const clean = serviceSearch.toLowerCase();
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(clean) || 
      (p.productCode || '').toLowerCase().includes(clean)
    ).slice(0, 5);
  }, [products, serviceSearch]);

  const handleSelectServiceProduct = (prod: any) => {
    const existingIdx = services.findIndex(s => s.productId === prod.id);
    if (existingIdx > -1) {
      const updated = [...services];
      updated[existingIdx] = {
        ...updated[existingIdx],
        qty: updated[existingIdx].qty + 1
      };
      setServices(updated);
    } else {
      setServices([
        ...services,
        {
          productId: prod.id,
          name: prod.name,
          price: Number(prod.basePrice) || 0,
          qty: 1
        }
      ]);
    }
    setServiceSearch('');
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(services, sameDay ? new Date().toISOString().slice(0,10) + 'T23:59' : checkoutDate, notesText);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', width: '100%', maxWidth: '450px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', position: 'relative', paddingRight: '2rem' }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1, padding: '1rem', border: 'none', backgroundColor: activeTab === 'info' ? '#f3f4f6' : 'white',
              color: activeTab === 'info' ? '#374151' : '#9ca3af', fontWeight: '500', cursor: 'pointer',
              outline: 'none'
            }}
          >
            Thông tin chuồng: {cageName}
          </button>
          <button
            onClick={() => setActiveTab('time')}
            style={{
              flex: 1, padding: '1rem', border: 'none', backgroundColor: activeTab === 'time' ? 'white' : '#f3f4f6',
              color: activeTab === 'time' ? '#10b981' : '#9ca3af', fontWeight: '600', cursor: 'pointer',
              outline: 'none', borderTop: activeTab === 'time' ? '3px solid #10b981' : '3px solid transparent'
            }}
          >
            Thời gian lưu
          </button>
          <button onClick={onClose} style={{
            position: 'absolute', right: '0.5rem', top: '0.5rem', padding: '0.5rem',
            border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem', minHeight: '300px' }}>
          {activeTab === 'info' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Thú cưng</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>{petName || '--'}</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Khách hàng</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>{ownerName || '--'}</div>
              </div>
              {!petName && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', fontStyle: 'italic', marginTop: '1rem' }}>
                  * Vui lòng đóng cửa sổ này, tìm và chọn thú cưng ở ô tìm kiếm trước khi tiếp tục.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Service Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '1rem', fontWeight: '500', color: '#10b981', marginBottom: '0.5rem' }}>
                  Dịch vụ:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Tìm kiếm dịch vụ..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 1rem',
                        border: '1px solid #e5e7eb', borderRadius: '4px', outline: 'none', color: '#374151'
                      }}
                    />
                    {/* Suggestions list */}
                    {filteredProductsForService.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%', left: 0, right: 0,
                        backgroundColor: 'white', border: '1px solid #cbd5e1',
                        borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 100, maxHeight: '200px', overflowY: 'auto'
                      }}>
                        {filteredProductsForService.map(prod => (
                          <div 
                            key={prod.id}
                            onClick={() => handleSelectServiceProduct(prod)}
                            style={{
                              padding: '0.5rem 1rem', borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer', transition: 'background-color 0.2s',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>{prod.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(prod.basePrice || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (serviceSearch.trim()) {
                        setServices([...services, { productId: Date.now().toString(), name: serviceSearch, price: 0, qty: 1 }]);
                        setServiceSearch('');
                      }
                    }}
                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '0 1rem', cursor: 'pointer' }}>
                    Thêm
                  </button>
                </div>
                {/* Selected Services */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {services.map((svc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>{svc.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.price)} x {svc.qty}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            const updated = [...services];
                            updated[idx].qty = Math.max(1, updated[idx].qty - 1);
                            setServices(updated);
                          }}
                          style={{ border: 'none', backgroundColor: '#e2e8f0', width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                        <span style={{ fontSize: '0.875rem' }}>{svc.qty}</span>
                        <button 
                          onClick={() => {
                            const updated = [...services];
                            updated[idx].qty = updated[idx].qty + 1;
                            setServices(updated);
                          }}
                          style={{ border: 'none', backgroundColor: '#e2e8f0', width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button onClick={() => setServices(services.filter((_, i) => i !== idx))} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: '0.5rem' }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Check-out Date */}
              <div>
                <label style={{ display: 'block', fontSize: '1rem', fontWeight: '500', color: '#10b981', marginBottom: '0.5rem' }}>
                  Dự kiến xuất chuồng:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                    disabled={sameDay}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      border: '1px solid #e5e7eb', borderRadius: '4px', outline: 'none', color: '#374151',
                      backgroundColor: sameDay ? '#f9fafb' : 'white'
                    }}
                  />
                </div>
              </div>

              {/* Boarding Notes (HTML) */}
              <div>
                <label style={{ display: 'block', fontSize: '1rem', fontWeight: '500', color: '#10b981', marginBottom: '0.5rem' }}>
                  Ghi chú nội trú (Hỗ trợ HTML):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <ReactQuill 
                      theme="snow" 
                      value={notesText} 
                      onChange={setNotesText}
                      placeholder="Nhập triệu chứng, dặn dò uống thuốc..."
                      modules={{
                        toolbar: [
                          ['bold', 'italic', 'underline'],
                          [{ 'color': [] }],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['clean']
                        ]
                      }}
                      style={{
                        height: '130px',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          {activeTab === 'time' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sameDay}
                onChange={(e) => setSameDay(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span>Lưu trong ngày</span>
            </label>
          ) : <div />}
          
          <button 
            onClick={handleConfirm}
            disabled={!petName}
            style={{
            padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none',
            background: petName ? 'linear-gradient(to right, #34d399, #14b8a6)' : '#d1d5db', color: 'white',
            fontWeight: '600', cursor: petName ? 'pointer' : 'not-allowed', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Xác nhận
          </button>
        </div>

      </div>
    </div>
  );
};

export default BoardingEntryModal;
