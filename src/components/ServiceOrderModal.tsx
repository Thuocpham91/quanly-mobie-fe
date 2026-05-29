import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Link2, FileText, Clipboard, User, Minus, Plus, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchCustomers } from '../api/customers';
import { type ServiceOrder, type ServiceOrderStatus } from '../api/service-orders';

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  serviceOrder?: ServiceOrder; // If provided, edit mode
}

const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  serviceOrder,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Customer variables
  const [custSearch, setCustSearch] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>('');
  const [selectedCustName, setSelectedCustName] = useState<string>('');

  const { data: customerData } = useQuery({
    queryKey: ['searchCustomersForServiceOrder', custSearch],
    queryFn: () => searchCustomers(custSearch, undefined, 1, 10),
    enabled: isOpen && custSearch.length > 1,
  });

  const matchedCustomers = customerData?.data || [];

  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '00:00:00',
    deadline: '',
    address: '',
    customerLocation: '',
    jobDescription: '',
    completedItems: '',
    quotedAmount: 0,
    discount: 0,
    status: 'PENDING' as ServiceOrderStatus,
  });

  useEffect(() => {
    if (isOpen) {
      if (serviceOrder) {
        setFormData({
          appointmentDate: serviceOrder.appointmentDate ? serviceOrder.appointmentDate.substring(0, 10) : '',
          appointmentTime: serviceOrder.appointmentTime || '00:00:00',
          deadline: serviceOrder.deadline ? serviceOrder.deadline.substring(0, 10) : '',
          address: serviceOrder.address || '',
          customerLocation: serviceOrder.customerLocation || '',
          jobDescription: serviceOrder.jobDescription || '',
          completedItems: serviceOrder.completedItems || '',
          quotedAmount: Number(serviceOrder.quotedAmount) || 0,
          discount: Number(serviceOrder.discount) || 0,
          status: serviceOrder.status,
        });
        setSelectedCustId(serviceOrder.customerId || '');
        if (serviceOrder.customer) {
          setSelectedCustName(`${serviceOrder.customer.fullName} - ${serviceOrder.customer.phone}`);
        } else {
          setSelectedCustName('');
        }
      } else {
        const today = new Date().toISOString().substring(0, 10);
        setFormData({
          appointmentDate: today,
          appointmentTime: '00:00:00',
          deadline: today,
          address: '',
          customerLocation: '',
          jobDescription: '',
          completedItems: '',
          quotedAmount: 0,
          discount: 0,
          status: 'PENDING' as ServiceOrderStatus,
        });
        setSelectedCustId('');
        setSelectedCustName('');
        setCustSearch('');
      }
    }
  }, [serviceOrder, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quotedAmount' || name === 'discount' ? Math.max(0, Number(value)) : value
    }));
  };

  const handleAdjustNumber = (field: 'quotedAmount' | 'discount', delta: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.appointmentDate) {
      alert('Vui lòng chọn ngày hẹn!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        customerId: selectedCustId || null,
        appointmentDate: formData.appointmentDate || null,
        deadline: formData.deadline || null,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Failed to submit service order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <Clipboard size={22} color="var(--primary)" />
            {serviceOrder ? 'Cập nhật đơn hàng dịch vụ' : 'Tạo đơn hàng dịch vụ mới'}
          </h2>
          <button onClick={onClose} style={{ padding: '0.4rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Order Code (Readonly) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Mã Đơn Hàng
            </label>
            <input
              type="text"
              value={serviceOrder ? serviceOrder.orderCode : 'Hệ thống tự động sinh (VD: cb938187)'}
              disabled
              style={{
                width: '100%', padding: '0.65rem 0.875rem',
                borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                backgroundColor: '#f8fafc', color: serviceOrder ? 'var(--primary)' : '#94a3b8',
                fontWeight: serviceOrder ? '700' : '400'
              }}
            />
          </div>

          {/* Customer Search */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Khách hàng (Không bắt buộc)
            </label>
            {selectedCustId ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 0.875rem', backgroundColor: 'rgba(99, 102, 241, 0.05)',
                borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} color="var(--primary)" />
                  <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e293b' }}>{selectedCustName}</span>
                </div>
                <button type="button" onClick={() => { setSelectedCustId(''); setSelectedCustName(''); }} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                  Thay đổi
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm khách hàng theo tên hoặc số điện thoại..."
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.25rem',
                    borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                    fontSize: '0.875rem'
                  }}
                />
                {custSearch.length > 1 && matchedCustomers.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '110%', left: 0, right: 0,
                    backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto'
                  }}>
                    {matchedCustomers.map((c: any) => (
                      <div
                        key={c.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCustId(c.id);
                          setSelectedCustName(`${c.fullName} - ${c.phone}`);
                          setCustSearch('');
                        }}
                        style={{
                          padding: '0.65rem 0.875rem', cursor: 'pointer', transition: 'background-color 0.2s',
                          fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <strong>{c.fullName}</strong> - {c.phone}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                <span style={{ color: '#ef4444' }}>*</span> Ngày hẹn
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%', padding: '0.65rem 0.875rem',
                    borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                Giờ Hẹn
              </label>
              <div style={{ position: 'relative' }}>
                <Clock size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  type="time"
                  step="1"
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleChange}
                  style={{
                    width: '100%', padding: '0.65rem 0.875rem',
                    borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Deadline Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Deadline
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '0.65rem 0.875rem',
                  borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Địa chỉ
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ của khách hàng..."
                  style={{
                    width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.25rem',
                    borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedCustId) {
                    // Try to copy from customer's profile if linked
                    const found = matchedCustomers.find((c: any) => c.id === selectedCustId);
                    if (found && found.address) {
                      setFormData(prev => ({ ...prev, address: found.address || '' }));
                      return;
                    }
                  }
                  alert("Vui lòng nhập địa chỉ của khách hàng.");
                }}
                style={{
                  padding: '0 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f1f5f9', border: '1px solid var(--border)', borderRadius: '0.5rem',
                  cursor: 'pointer', color: '#475569', fontSize: '1.25rem', fontWeight: 'bold'
                }}
                title="Lấy địa chỉ từ khách hàng"
              >
                +
              </button>
            </div>
          </div>

          {/* Customer Location */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Vị trí khách hàng
            </label>
            <div style={{ position: 'relative' }}>
              <Link2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                name="customerLocation"
                value={formData.customerLocation}
                onChange={handleChange}
                placeholder="http://"
                style={{
                  width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.25rem',
                  borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Mô tả công việc
            </label>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Mô tả sự cố hoặc yêu cầu sửa chữa, lắp đặt..."
              style={{
                width: '100%', padding: '0.65rem 0.875rem',
                borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical'
              }}
            />
          </div>

          {/* Completed Items */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
              Hạng mục đã làm
            </label>
            <textarea
              name="completedItems"
              value={formData.completedItems}
              onChange={handleChange}
              rows={2}
              placeholder="Các linh kiện đã thay thế, công việc đã thực hiện..."
              style={{
                width: '100%', padding: '0.65rem 0.875rem',
                borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical'
              }}
            />
          </div>

          {/* Quoted Amount & Discount (with +/- Adjusters) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                <span style={{ color: '#ef4444' }}>*</span> Đã báo giá/ Tổng cộng
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => handleAdjustNumber('quotedAmount', -50000)}
                  style={{ border: 'none', backgroundColor: '#f8fafc', padding: '0.65rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Minus size={14} color="#64748b" />
                </button>
                <input
                  type="number"
                  name="quotedAmount"
                  value={formData.quotedAmount}
                  onChange={handleChange}
                  required
                  style={{
                    flex: 1, border: 'none', padding: '0.65rem 0.5rem', outline: 'none',
                    textAlign: 'center', fontSize: '0.875rem', fontWeight: '700', color: '#1e293b'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAdjustNumber('quotedAmount', 50000)}
                  style={{ border: 'none', backgroundColor: '#f8fafc', padding: '0.65rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Plus size={14} color="#64748b" />
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                Chiết khấu
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => handleAdjustNumber('discount', -10000)}
                  style={{ border: 'none', backgroundColor: '#f8fafc', padding: '0.65rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Minus size={14} color="#64748b" />
                </button>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  style={{
                    flex: 1, border: 'none', padding: '0.65rem 0.5rem', outline: 'none',
                    textAlign: 'center', fontSize: '0.875rem', fontWeight: '700', color: '#1e293b'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAdjustNumber('discount', 10000)}
                  style={{ border: 'none', backgroundColor: '#f8fafc', padding: '0.65rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Plus size={14} color="#64748b" />
                </button>
              </div>
            </div>
          </div>

          {/* Edit-only Status Dropdown */}
          {serviceOrder && (
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '700', color: '#475569', marginBottom: '0.35rem' }}>
                Trạng thái đơn hàng
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '0.65rem 0.875rem',
                  borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none',
                  backgroundColor: 'white', fontSize: '0.875rem', fontWeight: '600'
                }}
              >
                <option value="PENDING">Chờ xử lý (Pending)</option>
                <option value="IN_PROGRESS">Đang sửa chữa (In Progress)</option>
                <option value="COMPLETED">Đã hoàn thành (Completed)</option>
                <option value="CANCELLED">Đã hủy (Cancelled)</option>
              </select>
            </div>
          )}

          {/* Form Actions */}
          <div style={{
            display: 'flex', gap: '1rem', marginTop: '1rem',
            borderTop: '1px solid var(--border)', paddingTop: '1.25rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '0.65rem', border: '1px solid var(--border)',
                borderRadius: '0.5rem', backgroundColor: 'transparent', cursor: 'pointer',
                fontWeight: '600', color: '#64748b'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                flex: 1, padding: '0.65rem', border: 'none', borderRadius: '0.5rem',
                color: 'white', cursor: 'pointer', fontWeight: '600'
              }}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ServiceOrderModal;
