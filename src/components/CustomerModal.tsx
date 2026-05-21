import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Customer } from '../api/customers';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Customer>) => Promise<void>;
  customer?: Customer;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customer
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    customerType: 'Khách lẻ'
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        fullName: customer.fullName || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
        customerType: customer.customerType || 'Khách lẻ'
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        customerType: 'Khách lẻ'
      });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {customer ? t('customers.modal_edit') : t('customers.modal_add')}
          </h2>
          <button onClick={onClose} style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            color: '#64748b',
            backgroundColor: 'transparent'
          }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> {t('customers.label_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> {t('customers.label_phone')}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="0123456789"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Customer Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Phân loại khách
              </label>
              <div>
                <select
                  name="customerType"
                  value={formData.customerType}
                  onChange={handleChange as any}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="Khách lẻ">Khách lẻ</option>
                  <option value="Khách sỉ">Khách sỉ</option>
                  <option value="Khách VIP">Khách VIP</option>
                  <option value="Đại lý">Đại lý</option>
                  <option value="Đối tác">Đối tác</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('customers.label_email')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('customers.label_address')}
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('customers.label_notes')}
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                fontWeight: '600',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {t('customers.btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {customer ? t('customers.btn_save') : t('customers.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
