import React from 'react';
import { X, Box, Info, User, Phone, Edit2, LogOut } from 'lucide-react';
import { type Cage, CageStatus } from '../api/boarding';

interface CageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cage: Cage | undefined;
  onEdit?: (cage: Cage) => void;
  onCheckout?: (cage: Cage) => void;
}

const CageDetailsModal: React.FC<CageDetailsModalProps> = ({ isOpen, onClose, cage, onEdit, onCheckout }) => {
  if (!isOpen || !cage) return null;

  const getStatusColor = (status: CageStatus) => {
    switch (status) {
      case CageStatus.AVAILABLE: return '#9ca3af';
      case CageStatus.OCCUPIED: return '#10b981';
      case CageStatus.CHECKOUT: return '#eab308';
      case CageStatus.OVERDUE: return '#ef4444';
      case CageStatus.DEPOSITED: return '#3b82f6';
      case CageStatus.MAINTENANCE: return '#475569';
      default: return '#9ca3af';
    }
  };

  const getStatusText = (status: CageStatus) => {
    switch (status) {
      case CageStatus.AVAILABLE: return 'Trống';
      case CageStatus.OCCUPIED: return 'Đang ở';
      case CageStatus.MAINTENANCE: return 'Bảo trì / Đang dọn';
      case CageStatus.CHECKOUT: return 'Chuẩn bị xuất chuồng';
      case CageStatus.DEPOSITED: return 'Đã nhận cọc';
      case CageStatus.OVERDUE: return 'Lưu trú quá hạn!';
      default: return 'Trống';
    }
  };

  const hasPet = cage.pet && cage.status !== CageStatus.AVAILABLE && cage.status !== CageStatus.MAINTENANCE;

  const getNotesPreview = (rawNotes?: string) => {
    if (!rawNotes) return '';
    try {
      if (rawNotes.trim().startsWith('{')) {
        const parsed = JSON.parse(rawNotes);
        const html = parsed.text || '';
        return html.replace(/<[^>]*>/g, ''); // strip HTML tags
      }
    } catch (e) {
      // Fallback
    }
    return rawNotes;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: getStatusColor(cage.status), color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={20} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Chi tiết chuồng {cage.name}</h3>
          </div>
          <button onClick={onClose} style={{ padding: '0.25rem', borderRadius: '50%', color: 'white', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '70vh' }}>
          
          {/* Cage Status Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed #e2e8f0' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '0.25rem' }}>TRẠNG THÁI</span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: getStatusColor(cage.status) }}>
                {getStatusText(cage.status)}
              </span>
            </div>
            {getNotesPreview(cage.notes) && (
              <div style={{ textAlign: 'right', maxWidth: '60%' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '0.25rem' }}>GHI CHÚ CHUỒNG</span>
                <span style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>{getNotesPreview(cage.notes)}</span>
              </div>
            )}
          </div>

          {/* Pet & Owner Information */}
          {hasPet ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: '700' }}>
                <Info size={18} /> <span>Thông tin lưu trú</span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#0284c7', flexShrink: 0,
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.15)', overflow: 'hidden'
                }}>
                  {cage.pet?.avatarUrl ? (
                    <img src={cage.pet.avatarUrl} alt={cage.pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>🐾</span>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>{cage.pet?.name || 'Thú cưng'}</h4>
                  <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span>{cage.pet?.species || 'Khác'} {cage.pet?.breed ? `- ${cage.pet.breed}` : ''} {cage.pet?.weight ? `- ${cage.pet.weight}kg` : ''}</span>
                    <span style={{ color: '#64748b' }}>Mã: {cage.pet?.barcode || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={14} /> Chủ nuôi
                </h5>
                <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {cage.pet?.owner?.fullName || 'Khách lẻ'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={12} /> {cage.pet?.owner?.phone || 'Chưa cập nhật SĐT'}
                </div>
              </div>
              
              {/* Timing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#166534', fontWeight: '600', marginBottom: '0.2rem' }}>NGÀY NHẬP CHUỒNG</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#14532d' }}>
                    {cage.pet?.createdAt ? new Date(cage.pet.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div style={{ backgroundColor: '#fefce8', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fef08a' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#854d0e', fontWeight: '600', marginBottom: '0.2rem' }}>DỰ KIẾN XUẤT</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#713f12' }}>
                    Chưa xác định
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Box size={48} strokeWidth={1} />
              <span>Chuồng hiện đang trống hoặc bảo trì.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex',
          justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#f8fafc'
        }}>
          {onEdit && (
            <button
              onClick={() => onEdit(cage)}
              style={{
                padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                backgroundColor: 'white', color: '#475569', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
              }}
            >
              <Edit2 size={14} /> Sửa chuồng
            </button>
          )}
          {hasPet && onCheckout && (
            <button
              onClick={() => onCheckout(cage)}
              style={{
                padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none',
                backgroundColor: '#f59e0b', color: 'white', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
              }}
            >
              <LogOut size={14} /> Xuất chuồng
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default CageDetailsModal;
