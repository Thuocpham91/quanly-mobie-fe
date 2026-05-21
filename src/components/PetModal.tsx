import React, { useState, useEffect } from 'react';
import { X, Dog, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchCustomers } from '../api/customers';
import { type Pet } from '../api/pets';

interface PetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  pet?: Pet;
  ownerId?: string; // If provided, pre-filled and hidden
}

const PetModal: React.FC<PetModalProps> = ({ isOpen, onClose, onSubmit, pet, ownerId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search customer variables
  const [custSearch, setCustSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; name: string } | null>(null);

  const { data: customerData } = useQuery({
    queryKey: ['searchCustomersForPet', custSearch],
    queryFn: () => searchCustomers(custSearch, undefined, 1, 10),
    enabled: isOpen && !ownerId && custSearch.length > 1,
  });

  const matchedCustomers = customerData?.data || [];

  const [formData, setFormData] = useState({
    name: '',
    species: 'Dog',
    breed: '',
    gender: 'unknown' as 'male' | 'female' | 'unknown',
    dateOfBirth: '',
    weight: '' as string | number,
    notes: '',
    ownerId: ownerId || '',
  });

  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name,
        species: pet.species || 'Dog',
        breed: pet.breed || '',
        gender: pet.gender || 'unknown',
        dateOfBirth: pet.dateOfBirth ? pet.dateOfBirth.split('T')[0] : '',
        weight: pet.weight || '',
        notes: pet.notes || '',
        ownerId: pet.owner?.id || '',
      });
      if (pet.owner) {
        setSelectedOwner({ id: pet.owner.id, name: pet.owner.fullName });
      }
    } else {
      setFormData({
        name: '',
        species: 'Dog',
        breed: '',
        gender: 'unknown',
        dateOfBirth: '',
        weight: '',
        notes: '',
        ownerId: ownerId || '',
      });
      setSelectedOwner(null);
      setCustSearch('');
    }
  }, [pet, isOpen, ownerId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitOwnerId = ownerId || selectedOwner?.id || formData.ownerId;
    if (!submitOwnerId) {
      alert('Vui lòng chọn chủ sở hữu cho thú cưng!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        weight: formData.weight ? Number(formData.weight) : undefined,
        ownerId: submitOwnerId,
      };
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Failed to submit pet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Dog size={22} color="var(--primary)" />
            {pet ? 'Cập nhật thú cưng' : 'Đăng ký thú cưng mới'}
          </h2>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Owner Selection (only when not pre-filled) */}
          {!ownerId && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Chủ sở hữu (Khách hàng)
              </label>
              {selectedOwner ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  borderRadius: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--primary)" />
                    <span style={{ fontWeight: '600' }}>{selectedOwner.name}</span>
                  </div>
                  {!pet && (
                    <button type="button" onClick={() => setSelectedOwner(null)} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Thay đổi
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Nhập tên hoặc số điện thoại khách hàng..."
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                      borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none'
                    }}
                  />
                  {custSearch.length > 1 && matchedCustomers.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '110%', left: 0, right: 0,
                      backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid var(--border)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto'
                    }}>
                      {matchedCustomers.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedOwner({ id: c.id, name: `${c.fullName} - ${c.phone}` });
                            setCustSearch('');
                          }}
                          style={{
                            padding: '0.75rem 1rem', cursor: 'pointer', transition: 'background-color 0.2s',
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
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Tên thú cưng
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ví dụ: LuLu"
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Loài
              </label>
              <select
                name="species"
                value={formData.species}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="Dog">Chó (Dog)</option>
                <option value="Cat">Mèo (Cat)</option>
                <option value="Bird">Chim (Bird)</option>
                <option value="Rabbit">Thỏ (Rabbit)</option>
                <option value="Hamster">Hamster</option>
                <option value="Other">Khác</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Giống loài
              </label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                placeholder="Ví dụ: Poodle, Corgi"
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Giới tính
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="unknown">Chưa rõ</option>
                <option value="male">Đực</option>
                <option value="female">Cái</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Ngày sinh
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Cân nặng (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Ví dụ: 5.5"
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Ghi chú bệnh lý / Đặc điểm
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Ghi chú về dị ứng thuốc, tiền sử bệnh hoặc dặn dò..."
              style={{
                width: '100%', padding: '0.75rem 1rem',
                borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '0.75rem', border: '1px solid var(--border)',
                borderRadius: '0.75rem', backgroundColor: 'transparent', cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ flex: 1, padding: '0.75rem', border: 'none', borderRadius: '0.75rem', color: 'white', cursor: 'pointer' }}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Lưu lại'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PetModal;
