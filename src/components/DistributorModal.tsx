import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Distributor } from '../api/distributors';

interface DistributorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Distributor>) => Promise<void>;
  distributor?: Distributor;
}

const DistributorModal: React.FC<DistributorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  distributor
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    description: ''
  });

  useEffect(() => {
    if (distributor) {
      setFormData({
        name: distributor.name || '',
        phone: distributor.phone || '',
        email: distributor.email || '',
        address: distributor.address || '',
        description: distributor.description || ''
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        description: ''
      });
    }
    setError('');
  }, [distributor, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    // Clean data: convert empty strings to undefined for optional fields
    const dataToSubmit = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value === '' ? undefined : value])
    );

    try {
      await onSubmit(dataToSubmit);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit distributor:', err);
      setError(err.response?.data?.message || 'Failed to save distributor. Please check your input.');
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
            {distributor ? t('distributors.modal_edit') : t('distributors.modal_add')}
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
          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--danger)', 
              padding: '0.75rem', 
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Distributor Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('distributors.label_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Supplier Name..."
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
                {t('distributors.label_phone')}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
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

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('distributors.label_email')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@supplier.com"
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
                {t('distributors.label_address')}
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Industrial St..."
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

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('distributors.label_description')}
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Supplier description, payment terms, etc."
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
              {t('distributors.btn_cancel')}
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
              {distributor ? t('distributors.btn_save') : t('distributors.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributorModal;
