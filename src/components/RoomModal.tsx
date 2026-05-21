import React, { useState, useEffect } from 'react';
import { X, Home, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { type Room } from '../api/boarding';
import { useBranchContext } from '../context/BranchContext';
import { getBranches } from '../api/branches';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Room>) => Promise<void>;
  room?: Room;
}

const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, onSubmit, room }) => {
  const { t } = useTranslation();
  const { selectedBranchId } = useBranchContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidUuid = (id?: string) => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const activeBranchId = isValidUuid(selectedBranchId) ? selectedBranchId : '';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    branchId: activeBranchId
  });

  const { data: paginatedBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(1, 100),
    enabled: isOpen && !activeBranchId
  });

  const branches = paginatedBranches?.data || [];

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        description: room.description || '',
        branchId: room.branchId
      });
    } else {
      setFormData({
        name: '',
        description: '',
        branchId: activeBranchId
      });
    }
  }, [room, isOpen, activeBranchId]);

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
      console.error('Failed to submit room:', error);
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
            {room ? t('boarding.modal_edit_room') : t('boarding.modal_add_room')}
          </h2>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!activeBranchId && !room && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  <span style={{color: '#ef4444'}}>*</span> Chi nhánh
                </label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '0.75rem', 
                    border: '1px solid var(--border)', 
                    outline: 'none',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> {t('boarding.room_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <Home size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Isolation Ward"
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {t('boarding.room_desc')}
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Description..."
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
              {room ? t('common.btn_save') : t('common.btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomModal;
