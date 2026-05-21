import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, Phone, Mail, Home, Loader2 } from 'lucide-react';
import { type Branch } from '../api/branches';
import LocationSelector from './LocationSelector';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  branch?: Branch | null;
}

const BranchModal: React.FC<BranchModalProps> = ({ isOpen, onClose, onSubmit, isLoading, branch }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
    provinceId: undefined as number | undefined,
    districtId: undefined as number | undefined,
    wardId: undefined as number | undefined
  });

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        isActive: branch.isActive,
        provinceId: branch.provinceId,
        districtId: branch.districtId,
        wardId: branch.wardId
      });
    } else {
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        isActive: true,
        provinceId: undefined,
        districtId: undefined,
        wardId: undefined
      });
    }
  }, [branch, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLocationChange = (location: any) => {
    if (location.fullAddress) {
      setFormData(prev => ({ ...prev, address: location.fullAddress }));
    } else {
      setFormData(prev => {
        // Use the value from LocationSelector if provided, otherwise keep existing
        // BUT if LocationSelector explicitly passes undefined for a level (e.g. province changed), we must clear it.
        const provinceId = 'province' in location ? location.province?.id : prev.provinceId;
        const districtId = 'district' in location ? location.district?.id : prev.districtId;
        const wardId = 'ward' in location ? location.ward?.id : prev.wardId;

        // Build address string from selected levels
        const parts = [
          location.ward?.name || (wardId === prev.wardId ? undefined : undefined), // complicated to get names back
          location.district?.name,
          location.province?.name
        ].filter(Boolean);
        
        let newAddress = prev.address;
        if (parts.length > 0) {
          const streetPart = prev.address.split(',')[0].trim();
          const hasStreet = prev.address && !prev.address.includes(parts[parts.length-1]);
          
          if (hasStreet && streetPart !== prev.address) {
            newAddress = `${streetPart}, ${parts.join(', ')}`;
          } else {
            newAddress = parts.join(', ');
          }
        }

        return {
          ...prev,
          provinceId: provinceId,
          districtId: districtId,
          wardId: wardId,
          address: newAddress
        };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {branch ? t('branches.modal_edit') : t('branches.modal_add')}
          </h2>
          <button onClick={onClose} style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            color: '#64748b',
            backgroundColor: 'transparent'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('branches.label_name')}</label>
              <div style={{ position: 'relative' }}>
                <Home size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Main Clinic"
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

            {/* Address Selection */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
              <LocationSelector 
                onLocationChange={handleLocationChange} 
                initialProvinceId={formData.provinceId}
                initialDistrictId={formData.districtId}
                initialWardId={formData.wardId}
              />
            </div>

            {/* Detailed Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('branches.label_address')}</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Detailed address..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    minHeight: '80px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('branches.label_phone')}</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0123 456 789"
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
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('branches.label_email')}</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="branch@example.com"
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
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '0.25rem',
                    accentColor: 'var(--primary)'
                  }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{t('branches.label_status')}</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              backgroundColor: 'white',
              fontWeight: '600'
            }}>
              {t('branches.btn_cancel')}
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary" style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: isLoading ? 0.7 : 1
            }}>
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {branch ? t('branches.btn_save') : t('branches.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchModal;
