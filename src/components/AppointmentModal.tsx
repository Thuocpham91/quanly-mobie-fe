import React, { useState, useEffect } from 'react';
import { X, Calendar, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPetsByOwner } from '../api/pets';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { getBranches } from '../api/branches';
import { searchCustomers } from '../api/customers';
import { useBranchContext } from '../context/BranchContext';
import { type Appointment } from '../api/appointments';
import { getUsers } from '../api/users';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  customerId?: string; // Prefilled if opened from customer details
  appointment?: Appointment; // Prefilled if editing
  initialNotes?: string;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerId,
  appointment,
  initialNotes,
}) => {
  const { selectedBranchId } = useBranchContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Customer variables (only when customerId is not prefilled)
  const [custSearch, setCustSearch] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>(customerId || '');
  const [selectedCustName, setSelectedCustName] = useState<string>('');

  const { data: customerData } = useQuery({
    queryKey: ['searchCustomersForAppt', custSearch],
    queryFn: () => searchCustomers(custSearch, undefined, 1, 10),
    enabled: isOpen && !customerId && custSearch.length > 1,
  });

  const matchedCustomers = customerData?.data || [];

  // Query pets based on selected Customer ID
  const { data: pets } = useQuery({
    queryKey: ['petsOfOwner', selectedCustId],
    queryFn: () => getPetsByOwner(selectedCustId),
    enabled: isOpen && !!selectedCustId,
  });

  // Query branches
  const { data: branchData } = useQuery({
    queryKey: ['branchesForAppt'],
    queryFn: () => getBranches(1, 50),
    enabled: isOpen,
  });
  const branches = branchData?.data || [];

  const [formData, setFormData] = useState({
    petId: '',
    branchId: selectedBranchId || '',
    dateTime: '',
    purpose: 'Khám tổng quát',
    notes: initialNotes || '',
    userId: '',
  });

  // Query branch users
  const { data: usersData } = useQuery({
    queryKey: ['branchUsersForAppt', formData.branchId],
    queryFn: () => getUsers(formData.branchId, 1, 100),
    enabled: isOpen && !!formData.branchId,
  });
  const branchUsers = usersData?.data || [];

  useEffect(() => {
    if (appointment) {
      setFormData({
        petId: appointment.petId,
        branchId: appointment.branchId || selectedBranchId || '',
        dateTime: appointment.dateTime ? appointment.dateTime.substring(0, 16) : '',
        purpose: appointment.purpose || 'Khám tổng quát',
        notes: appointment.notes || '',
        userId: appointment.userId || '',
      });
      setSelectedCustId(appointment.customerId);
      if (appointment.customer) {
        setSelectedCustName(appointment.customer.fullName);
      }
    } else {
      setFormData({
        petId: '',
        branchId: selectedBranchId || '',
        dateTime: '',
        purpose: 'Khám tổng quát',
        notes: initialNotes || '',
        userId: '',
      });
      setSelectedCustId(customerId || '');
      setSelectedCustName('');
      setCustSearch('');
    }
  }, [appointment, isOpen, customerId, selectedBranchId, initialNotes]);

  // Set first pet when pets list is loaded
  useEffect(() => {
    if (pets && pets.length > 0 && !formData.petId) {
      setFormData(prev => ({ ...prev, petId: pets[0].id }));
    }
  }, [pets, formData.petId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId) {
      alert('Vui lòng chọn khách hàng!');
      return;
    }
    if (!formData.petId) {
      alert('Vui lòng chọn thú cưng!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        userId: formData.userId || undefined,
        customerId: selectedCustId,
        dateTime: new Date(formData.dateTime).toISOString(),
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Failed to submit appointment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={22} color="var(--primary)" />
            {appointment ? 'Cập nhật công việc' : 'Tạo công việc mới'}
          </h2>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Customer Selection (only when not prefilled) */}
          {!customerId && !appointment && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Khách hàng
              </label>
              {selectedCustId ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  borderRadius: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--primary)" />
                    <span style={{ fontWeight: '600' }}>{selectedCustName || 'Khách hàng đã chọn'}</span>
                  </div>
                  <button type="button" onClick={() => { setSelectedCustId(''); setFormData(prev => ({ ...prev, petId: '' })); }} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Thay đổi
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc số điện thoại..."
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
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedCustId(c.id);
                            setSelectedCustName(`${c.fullName} - ${c.phone}`);
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

          {/* Pet Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              <span style={{color: '#ef4444'}}>*</span> Chọn thú cưng
            </label>
            <select
              name="petId"
              value={formData.petId}
              onChange={handleChange}
              disabled={!selectedCustId}
              required
              style={{
                width: '100%', padding: '0.75rem 1rem',
                borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                backgroundColor: 'white'
              }}
            >
              {!selectedCustId ? (
                <option value="">Vui lòng chọn khách hàng trước</option>
              ) : pets && pets.length > 0 ? (
                pets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))
              ) : (
                <option value="">Khách hàng này chưa có thú cưng nào</option>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Ngày & Giờ hẹn
              </label>
              <input
                type="datetime-local"
                name="dateTime"
                value={formData.dateTime}
                onChange={handleChange}
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> Chi nhánh hẹn
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              <span style={{color: '#ef4444'}}>*</span> Lý do cuộc hẹn / Dịch vụ
            </label>
            <select
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="Khám tổng quát">Khám bệnh tổng quát</option>
              <option value="Tiêm phòng">Tiêm chủng / Vaccine</option>
              <option value="Điều trị bệnh">Điều trị bệnh ngoại trú</option>
              <option value="Phẫu thuật">Phẫu thuật / Triệt sản</option>
              <option value="Spa & Grooming">Tắm rửa / Cắt tỉa lông (Spa)</option>
              <option value="Lưu trú (Boarding)">Gửi thú cưng (Boarding)</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Nhân viên thực hiện
            </label>
            <select
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">-- Chưa giao việc --</option>
              {branchUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Ghi chú thêm
            </label>
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <ReactQuill 
                key={appointment?.id || 'new_appt'}
                theme="snow" 
                value={formData.notes} 
                onChange={(content) => setFormData(prev => ({ ...prev, notes: content }))}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{'list': 'ordered'}, {'list': 'bullet'}],
                    ['clean']
                  ],
                }}
                placeholder="Yêu cầu đặc biệt, triệu chứng bệnh lý sơ bộ..."
                style={{ height: '150px', marginBottom: '40px' }}
              />
            </div>
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
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;
