import React, { useState, useEffect } from 'react';
import { X, Box, FileText, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Cage, CageStatus } from '../api/boarding';

interface CageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Cage>) => Promise<void>;
  cage?: Cage;
  roomId: string;
}

const CageModal: React.FC<CageModalProps> = ({ isOpen, onClose, onSubmit, cage, roomId }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    status: CageStatus;
    notes: string;
    roomId: string;
  }>({
    name: '',
    status: CageStatus.AVAILABLE,
    notes: '',
    roomId: roomId
  });

  useEffect(() => {
    if (cage) {
      setFormData({
        name: cage.name,
        status: cage.status,
        notes: cage.notes || '',
        roomId: cage.roomId
      });
    } else {
      setFormData({
        name: '',
        status: CageStatus.AVAILABLE,
        notes: '',
        roomId: roomId
      });
    }
  }, [cage, isOpen, roomId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      console.error('Failed to submit cage:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {cage ? t('boarding.modal_edit_cage') : t('boarding.modal_add_cage')}
          </h2>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> {t('boarding.cage_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <Box size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. A1"
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Status</label>
              <div style={{ position: 'relative' }}>
                <Info size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', appearance: 'none', backgroundColor: 'white' }}
                >
                  <option value={CageStatus.AVAILABLE}>{t('boarding.status_available', 'Trống')}</option>
                  <option value={CageStatus.OCCUPIED}>{t('boarding.status_occupied', 'Đang ở')}</option>
                  <option value={CageStatus.MAINTENANCE}>{t('boarding.status_maintenance', 'Đang bảo trì / Bẩn')}</option>
                  <option value={CageStatus.CHECKOUT}>{t('boarding.status_checkout', 'Chuẩn bị xuất chuồng')}</option>
                  <option value={CageStatus.OVERDUE}>{t('boarding.status_overdue', 'Quá hạn')}</option>
                  <option value={CageStatus.DEPOSITED}>{t('boarding.status_deposited', 'Đã cọc')}</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('boarding.cage_notes')}
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notes..."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>
              {t('common.btn_cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '0.75rem 1.5rem', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {cage ? t('common.btn_save') : t('common.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CageModal;
