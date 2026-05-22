import React, { useState, useEffect, useMemo } from 'react';
import { FileText, X, Plus, Trash2, Edit2, Search, CalendarPlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { type Pet, updatePet } from '../api/pets';
import { createAppointment } from '../api/appointments';
import AppointmentModal from './AppointmentModal';

export interface MedicalExamRecord {
  id: string;
  date: string;
  branch: string;
  vetName: string;
  customerSymptoms: string;
  clinicalSigns: {
    temperature: string;
    weight: string;
    dewormed: string;
    bloodPressure: string;
    spo2: string;
    vaccinated: string;
    heartRate: string;
    pulse: string;
    clinicalManifestation: string;
  };
  examinationPackage: {
    inpatientTreatment: string;
    medicineSales: string;
    liquidMedicine: string;
  };
  prescriptions: Array<{
    name: string;
    qty: number;
    unit: string;
    dosage: string;
    usage: string;
    note: string;
  }>;
  services: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
    note: string;
  }>;
  summary?: {
    diagnosis: string;
    prognosis: string;
    advice: string;
    followUp: string;
    followUpReason: string;
    note: string;
  };
}

interface MedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: (Pet & { createdAt?: string }) | null;
  onUpdateSuccess?: () => void;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const MedicalRecordModal: React.FC<MedicalRecordModalProps> = ({ isOpen, onClose, pet, onUpdateSuccess }) => {
  const queryClient = useQueryClient();

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editingRecordData, setEditingRecordData] = useState<MedicalExamRecord | null>(null);

  const [activePrescriptionSearchIdx, setActivePrescriptionSearchIdx] = useState<number | null>(null);
  const [activeServiceSearchIdx, setActiveServiceSearchIdx] = useState<number | null>(null);
  const [prescriptionSearchQuery, setPrescriptionSearchQuery] = useState('');
  const [medicalServiceSearchQuery, setMedicalServiceSearchQuery] = useState('');

  const [isProductPickerModalOpen, setIsProductPickerModalOpen] = useState(false);
  const [productPickerTarget, setProductPickerTarget] = useState<'prescription' | 'service' | null>(null);
  const [productPickerSearch, setProductPickerSearch] = useState('');
  const [popupSelectedProductId, setPopupSelectedProductId] = useState<string | null>(null);
  const [popupForm, setPopupForm] = useState({ qty: 1, unit: 'Viên', dosage: '', usage: '', note: '', price: 0 });

  const [quickTaskModalData, setQuickTaskModalData] = useState<{ isOpen: boolean; initialNotes: string }>({
    isOpen: false,
    initialNotes: ''
  });

  // Parsed records from pet.notes
  const medicalRecordsList = useMemo<MedicalExamRecord[]>(() => {
    if (!pet?.notes) return [];
    try {
      const parsed = JSON.parse(pet.notes);
      if (parsed && Array.isArray(parsed.medicalRecords)) {
        return parsed.medicalRecords;
      }
    } catch (e) {
      // Return legacy text notes as a default record
      return [{
        id: 'legacy',
        date: pet.createdAt ? pet.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        branch: 'Bệnh viện thú y pet 24h- Cầu Giấy',
        vetName: 'Bs Nghi',
        customerSymptoms: 'Bệnh lý cũ',
        clinicalSigns: {
          temperature: '',
          weight: pet.weight ? String(pet.weight) : '',
          dewormed: '',
          bloodPressure: '',
          spo2: '',
          vaccinated: '',
          heartRate: '',
          pulse: '',
          clinicalManifestation: pet.notes
        },
        examinationPackage: {
          inpatientTreatment: '',
          medicineSales: '',
          liquidMedicine: ''
        },
        prescriptions: [],
        services: []
      }];
    }
    return [];
  }, [pet?.notes, pet?.createdAt, pet?.weight]);

  // Set default selected record when modal opens
  useEffect(() => {
    if (isOpen) {
      if (medicalRecordsList.length > 0) {
        if (!selectedRecordId || !medicalRecordsList.some(r => r.id === selectedRecordId)) {
          setSelectedRecordId(medicalRecordsList[0].id);
        }
      } else {
        setSelectedRecordId(null);
      }
      setIsEditingRecord(false);
      setEditingRecordData(null);
    }
  }, [isOpen, medicalRecordsList, selectedRecordId]);

  // Fetch products list for service/prescription search
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['productsForMedicalRecords'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data?.data || response.data || [];
    },
    enabled: isOpen
  });

  // Filter product suggestions for prescription row
  const filteredProductsForPrescription = useMemo(() => {
    if (activePrescriptionSearchIdx === null || !editingRecordData) return [];
    const query = (editingRecordData.prescriptions[activePrescriptionSearchIdx]?.name || '').toLowerCase();
    if (!query) return [];
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.productCode || '').toLowerCase().includes(query)
    ).slice(0, 8);
  }, [products, editingRecordData, activePrescriptionSearchIdx]);

  // Filter product suggestions for services row in edit mode
  const filteredProductsForServiceTable = useMemo(() => {
    if (activeServiceSearchIdx === null || !editingRecordData) return [];
    const query = (editingRecordData.services[activeServiceSearchIdx]?.name || '').toLowerCase();
    if (!query) return [];
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.productCode || '').toLowerCase().includes(query)
    ).slice(0, 8);
  }, [products, editingRecordData, activeServiceSearchIdx]);

  // Filter products for the top-level Prescription search bar
  const filteredProductsForPrescriptionSearch = useMemo(() => {
    if (!prescriptionSearchQuery) return [];
    const query = prescriptionSearchQuery.toLowerCase();
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.productCode || '').toLowerCase().includes(query)
    ).slice(0, 5);
  }, [products, prescriptionSearchQuery]);

  // Filter products for the top-level Services search bar in Medical Record
  const filteredProductsForMedicalServiceSearch = useMemo(() => {
    if (!medicalServiceSearchQuery) return [];
    const query = medicalServiceSearchQuery.toLowerCase();
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.productCode || '').toLowerCase().includes(query)
    ).slice(0, 5);
  }, [products, medicalServiceSearchQuery]);

  // Handler to add prescription directly from product click
  const handleAddPrescriptionFromProduct = (prod: any) => {
    if (!editingRecordData) return;
    const existingIdx = editingRecordData.prescriptions.findIndex(p => p.name === prod.name);
    if (existingIdx > -1) {
      const updated = [...editingRecordData.prescriptions];
      updated[existingIdx] = {
        ...updated[existingIdx],
        qty: updated[existingIdx].qty + 1
      };
      setEditingRecordData({
        ...editingRecordData,
        prescriptions: updated
      });
    } else {
      setEditingRecordData({
        ...editingRecordData,
        prescriptions: [
          ...editingRecordData.prescriptions,
          {
            name: prod.name,
            qty: 1,
            unit: prod.unit?.name || 'Viên',
            dosage: '',
            usage: '',
            note: ''
          }
        ]
      });
    }
    setPrescriptionSearchQuery('');
  };

  // Handler to add service directly from product click
  const handleAddMedicalServiceFromProduct = (prod: any) => {
    if (!editingRecordData) return;
    const existingIdx = editingRecordData.services.findIndex(s => s.name === prod.name);
    const price = Number(prod.basePrice) || 0;
    if (existingIdx > -1) {
      const updated = [...editingRecordData.services];
      updated[existingIdx] = {
        ...updated[existingIdx],
        qty: updated[existingIdx].qty + 1,
        total: (updated[existingIdx].qty + 1) * price
      };
      setEditingRecordData({
        ...editingRecordData,
        services: updated
      });
    } else {
      setEditingRecordData({
        ...editingRecordData,
        services: [
          ...editingRecordData.services,
          {
            name: prod.name,
            qty: 1,
            price: price,
            total: price,
            note: ''
          }
        ]
      });
    }
    setMedicalServiceSearchQuery('');
  };

  const handleSaveMedicalRecord = async () => {
    if (!pet?.id || !editingRecordData) {
      alert('Không tìm thấy thông tin hợp lệ để lưu!');
      return;
    }
    try {
      const exists = medicalRecordsList.some(r => r.id === editingRecordData.id);
      let updatedRecords: MedicalExamRecord[];
      if (exists) {
        updatedRecords = medicalRecordsList.map(r => r.id === editingRecordData.id ? editingRecordData : r);
      } else {
        updatedRecords = [editingRecordData, ...medicalRecordsList];
      }

      await updatePet(pet.id, {
        notes: JSON.stringify({ medicalRecords: updatedRecords }),
        weight: editingRecordData.clinicalSigns.weight ? Number(editingRecordData.clinicalSigns.weight) : undefined
      });

      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });

      setSelectedRecordId(editingRecordData.id);
      setIsEditingRecord(false);
      setEditingRecordData(null);
      alert('Lưu bệnh án thành công!');
      onUpdateSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi cập nhật bệnh án.');
    }
  };

  const handleDeleteMedicalRecord = async (id: string) => {
    if (!pet?.id) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bệnh án này?')) return;
    try {
      const updatedRecords = medicalRecordsList.filter(r => r.id !== id);
      await updatePet(pet.id, {
        notes: JSON.stringify({ medicalRecords: updatedRecords })
      });

      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });

      if (selectedRecordId === id) {
        setSelectedRecordId(updatedRecords.length > 0 ? updatedRecords[0].id : null);
      }
      alert('Xóa bệnh án thành công!');
      onUpdateSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xóa bệnh án.');
    }
  };

  if (!isOpen || !pet) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '95vw', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: '#f97316' }} /> Hồ sơ Bệnh án & Lịch sử khám: {pet.name}
          </h3>
          <button
            onClick={onClose}
            style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Container */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '240px', borderRight: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
            display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1rem', gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b' }}>LỊCH SỬ KHÁM BỆNH</span>
            </div>
            
            <button
              onClick={() => {
                const fresh: MedicalExamRecord = {
                  id: 'rec_' + Math.random().toString(36).substring(2, 11),
                  date: new Date().toISOString().slice(0, 10),
                  branch: 'Bệnh viện thú y pet 24h- Cầu Giấy',
                  vetName: 'Bs Nghi',
                  customerSymptoms: '',
                  clinicalSigns: {
                    temperature: '',
                    weight: pet.weight ? String(pet.weight) : '',
                    dewormed: '',
                    bloodPressure: '',
                    spo2: '',
                    vaccinated: '',
                    heartRate: '',
                    pulse: '',
                    clinicalManifestation: ''
                  },
                  examinationPackage: {
                    inpatientTreatment: '',
                    medicineSales: '',
                    liquidMedicine: ''
                  },
                  prescriptions: [],
                  services: [],
                  summary: {
                    diagnosis: '',
                    prognosis: '',
                    advice: '',
                    followUp: '',
                    followUpReason: '',
                    note: ''
                  }
                };
                setEditingRecordData(fresh);
                setIsEditingRecord(true);
              }}
              style={{
                padding: '0.5rem 1rem', border: '1px dashed #f97316', borderRadius: '6px',
                backgroundColor: '#fff7ed', color: '#ea580c', fontWeight: '600', fontSize: '0.8rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
              }}
            >
              <Plus size={14} /> Thêm bệnh án mới
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {medicalRecordsList.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                  Chưa có hồ sơ bệnh án nào.
                </div>
              ) : (
                medicalRecordsList.map((rec) => {
                  const isSelected = selectedRecordId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem', borderRadius: '8px',
                        border: isSelected ? '1px solid #f97316' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#ffedd5' : 'white',
                        cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                      onClick={() => {
                        setSelectedRecordId(rec.id);
                        setIsEditingRecord(false);
                        setEditingRecordData(null);
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: isSelected ? '#ea580c' : '#1e293b' }}>
                          {new Date(rec.date).toLocaleDateString('vi-VN')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rec.vetName || 'Chưa rõ BS'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedicalRecord(rec.id);
                        }}
                        style={{
                          border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          color: '#ef4444', display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Pane */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isEditingRecord && editingRecordData ? (
              // EDIT MODE
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                    {medicalRecordsList.some(r => r.id === editingRecordData.id) ? 'Chỉnh sửa bệnh án' : 'Tạo bệnh án mới'}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setIsEditingRecord(false);
                        setEditingRecordData(null);
                      }}
                      style={{
                        padding: '0.4rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px',
                        backgroundColor: 'white', fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveMedicalRecord}
                      style={{
                        padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px',
                        backgroundColor: '#10b981', color: 'white', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Lưu lại
                    </button>
                  </div>
                </div>

                {/* Metadata Edit */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Ngày khám:</label>
                    <input
                      type="date"
                      value={editingRecordData.date}
                      onChange={(e) => setEditingRecordData({ ...editingRecordData, date: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Chi nhánh:</label>
                    <input
                      type="text"
                      value={editingRecordData.branch}
                      onChange={(e) => setEditingRecordData({ ...editingRecordData, branch: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Bác sĩ (Người bán):</label>
                    <input
                      type="text"
                      value={editingRecordData.vetName}
                      onChange={(e) => setEditingRecordData({ ...editingRecordData, vetName: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Triệu chứng từ khách:</label>
                  <input
                    type="text"
                    value={editingRecordData.customerSymptoms}
                    onChange={(e) => setEditingRecordData({ ...editingRecordData, customerSymptoms: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Clinical Signs Edit */}
                <div>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f97316', display: 'block', marginBottom: '0.5rem', borderBottom: '1px solid #fed7aa', paddingBottom: '0.25rem' }}>TRIỆU CHỨNG LÂM SÀNG</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Nhiệt độ (°C):</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.temperature}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, temperature: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Cân nặng (kg):</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.weight}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, weight: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Tẩy giun:</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.dewormed}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, dewormed: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Huyết áp:</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.bloodPressure}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, bloodPressure: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>SpO2:</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.spo2}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, spo2: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Tiêm ngừa:</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.vaccinated}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, vaccinated: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Nhịp tim:</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.heartRate}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, heartRate: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Nhịp mạch:</label>
                      <input
                        type="text"
                        value={editingRecordData.clinicalSigns.pulse}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          clinicalSigns: { ...editingRecordData.clinicalSigns, pulse: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Biểu hiện lâm sàng:</label>
                    <textarea
                      rows={2}
                      value={editingRecordData.clinicalSigns.clinicalManifestation}
                      onChange={(e) => setEditingRecordData({
                        ...editingRecordData,
                        clinicalSigns: { ...editingRecordData.clinicalSigns, clinicalManifestation: e.target.value }
                      })}
                      style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', resize: 'vertical' }}
                      placeholder="Mô tả triệu chứng lâm sàng..."
                    />
                  </div>
                </div>

                {/* Examination Package Info Edit */}
                <div>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f97316', display: 'block', marginBottom: '0.5rem', borderBottom: '1px solid #fed7aa', paddingBottom: '0.25rem' }}>THÔNG TIN GÓI KHÁM</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Điều trị nội trú:</label>
                      <input
                        type="text"
                        value={editingRecordData.examinationPackage.inpatientTreatment}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          examinationPackage: { ...editingRecordData.examinationPackage, inpatientTreatment: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Bán thuốc điều trị:</label>
                      <input
                        type="text"
                        value={editingRecordData.examinationPackage.medicineSales}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          examinationPackage: { ...editingRecordData.examinationPackage, medicineSales: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>Thuốc chiết lọ nhỏ:</label>
                      <input
                        type="text"
                        value={editingRecordData.examinationPackage.liquidMedicine}
                        onChange={(e) => setEditingRecordData({
                          ...editingRecordData,
                          examinationPackage: { ...editingRecordData.examinationPackage, liquidMedicine: e.target.value }
                        })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Prescription Editor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #f97316', paddingBottom: '0.25rem', gap: '1rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f97316', whiteSpace: 'nowrap' }}>ĐƠN THUỐC</span>
                    
                    <div style={{ flex: 1, position: 'relative', maxWidth: '300px' }}>
                      <input
                        type="text"
                        placeholder="Tìm & thêm nhanh thuốc..."
                        value={prescriptionSearchQuery}
                        onChange={(e) => setPrescriptionSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.2rem 0.5rem 0.2rem 1.8rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                          height: '28px'
                        }}
                      />
                      <Search size={12} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      {filteredProductsForPrescriptionSearch.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          zIndex: 1000,
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}>
                          {filteredProductsForPrescriptionSearch.map(prod => (
                            <div
                              key={prod.id}
                              onClick={() => handleAddPrescriptionFromProduct(prod)}
                              style={{
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: '0.75rem',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div style={{ fontWeight: '600', color: '#334155' }}>{prod.name}</div>
                              <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                {prod.unit?.name ? `Đv: ${prod.unit.name} ` : ''}{prod.productCode ? `| Mã: ${prod.productCode}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setProductPickerTarget('prescription');
                          setIsProductPickerModalOpen(true);
                        }}
                        style={{ padding: '0.25rem 0.5rem', border: '1px solid #f97316', borderRadius: '4px', backgroundColor: 'white', color: '#f97316', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}
                      >
                        <Search size={12} style={{ display: 'inline', marginRight: '4px' }} /> Danh mục
                      </button>
                      <button
                        onClick={() => {
                          const updatedPres = [...editingRecordData.prescriptions, { name: '', qty: 1, unit: 'Viên', dosage: '', usage: '', note: '' }];
                          setEditingRecordData({ ...editingRecordData, prescriptions: updatedPres });
                        }}
                        style={{
                          padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                          backgroundColor: '#f97316', color: 'white', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        + Dòng mới
                      </button>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '25%' }}>Tên thuốc</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '10%' }}>SL</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '12%' }}>Đơn vị</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '18%' }}>Liều lượng</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '18%' }}>Cách dùng</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '12%' }}>Ghi chú</th>
                        <th style={{ padding: '0.4rem', textAlign: 'center', width: '5%' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingRecordData.prescriptions.map((pres, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.25rem', position: 'relative' }}>
                            <input
                              type="text"
                              value={pres.name}
                              onChange={(e) => {
                                const updated = [...editingRecordData.prescriptions];
                                updated[idx].name = e.target.value;
                                setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                                setActivePrescriptionSearchIdx(idx);
                              }}
                              onFocus={() => setActivePrescriptionSearchIdx(idx)}
                              onBlur={() => {
                                setTimeout(() => setActivePrescriptionSearchIdx(null), 200);
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Nhập tên thuốc..."
                            />
                            {activePrescriptionSearchIdx === idx && filteredProductsForPrescription.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                maxHeight: '150px',
                                overflowY: 'auto'
                              }}>
                                {filteredProductsForPrescription.map(prod => (
                                  <div
                                    key={prod.id}
                                    onClick={() => {
                                      const updated = [...editingRecordData.prescriptions];
                                      updated[idx].name = prod.name;
                                      if (prod.unit?.name) {
                                        updated[idx].unit = prod.unit.name;
                                      }
                                      setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                                      setActivePrescriptionSearchIdx(null);
                                    }}
                                    style={{
                                      padding: '0.35rem 0.5rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      fontSize: '0.75rem',
                                      textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <div style={{ fontWeight: '600', color: '#334155' }}>{prod.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                      {prod.unit?.name ? `Đv: ${prod.unit.name} ` : ''}{prod.productCode ? `| Mã: ${prod.productCode}` : ''}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="number"
                              value={pres.qty}
                              onChange={(e) => {
                                const updated = [...editingRecordData.prescriptions];
                                updated[idx].qty = Number(e.target.value) || 0;
                                setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="text"
                              value={pres.unit}
                              onChange={(e) => {
                                const updated = [...editingRecordData.prescriptions];
                                updated[idx].unit = e.target.value;
                                setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Viên/Lọ..."
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="text"
                              value={pres.dosage}
                              onChange={(e) => {
                                const updated = [...editingRecordData.prescriptions];
                                updated[idx].dosage = e.target.value;
                                setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Liều dùng..."
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="text"
                              value={pres.usage}
                              onChange={(e) => {
                                const updated = [...editingRecordData.prescriptions];
                                updated[idx].usage = e.target.value;
                                setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Cách dùng..."
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="text"
                              value={pres.note}
                              onChange={(e) => {
                                const updated = [...editingRecordData.prescriptions];
                                updated[idx].note = e.target.value;
                                setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Ghi chú..."
                            />
                          </td>
                          <td style={{ padding: '0.25rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                onClick={() => {
                                  const updated = editingRecordData.prescriptions.filter((_, i) => i !== idx);
                                  setEditingRecordData({ ...editingRecordData, prescriptions: updated });
                                }}
                                title="Xóa thuốc"
                                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                              >
                                <Trash2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setQuickTaskModalData({
                                    isOpen: true,
                                    initialNotes: `Nhắc dùng thuốc: ${pres.name} (Lần tiếp theo)`
                                  });
                                }}
                                title="Tạo công việc/nhắc nhở"
                                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#3b82f6' }}
                              >
                                <CalendarPlus size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Services Editor */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #f97316', paddingBottom: '0.25rem', gap: '1rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f97316', whiteSpace: 'nowrap' }}>DỊCH VỤ / HÀNG HÓA SỬ DỤNG</span>
                    
                    <div style={{ flex: 1, position: 'relative', maxWidth: '300px' }}>
                      <input
                        type="text"
                        placeholder="Tìm & thêm nhanh dịch vụ..."
                        value={medicalServiceSearchQuery}
                        onChange={(e) => setMedicalServiceSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.2rem 0.5rem 0.2rem 1.8rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                          height: '28px'
                        }}
                      />
                      <Search size={12} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      {filteredProductsForMedicalServiceSearch.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          zIndex: 1000,
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}>
                          {filteredProductsForMedicalServiceSearch.map(prod => (
                            <div
                              key={prod.id}
                              onClick={() => handleAddMedicalServiceFromProduct(prod)}
                              style={{
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: '0.75rem',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div style={{ fontWeight: '600', color: '#334155' }}>{prod.name}</div>
                              <div style={{ color: '#10b981', fontSize: '0.7rem' }}>
                                {formatVND(Number(prod.basePrice) || 0)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setProductPickerTarget('service');
                          setIsProductPickerModalOpen(true);
                        }}
                        style={{ padding: '0.25rem 0.5rem', border: '1px solid #f97316', borderRadius: '4px', backgroundColor: 'white', color: '#f97316', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}
                      >
                        <Search size={12} style={{ display: 'inline', marginRight: '4px' }} /> Danh mục
                      </button>
                      <button
                        onClick={() => {
                          const updatedSrv = [...editingRecordData.services, { name: '', qty: 1, price: 0, total: 0, note: '' }];
                          setEditingRecordData({ ...editingRecordData, services: updatedSrv });
                        }}
                        style={{
                          padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px',
                          backgroundColor: '#f97316', color: 'white', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        + Dòng mới
                      </button>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '35%' }}>Dịch vụ/Hàng hóa</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '10%' }}>SL</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '20%' }}>Đơn giá</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '20%' }}>Thành tiền</th>
                        <th style={{ padding: '0.4rem', textAlign: 'left', width: '10%' }}>Ghi chú</th>
                        <th style={{ padding: '0.4rem', textAlign: 'center', width: '5%' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingRecordData.services.map((srv, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.25rem', position: 'relative' }}>
                            <input
                              type="text"
                              value={srv.name}
                              onChange={(e) => {
                                const updated = [...editingRecordData.services];
                                updated[idx].name = e.target.value;
                                setEditingRecordData({ ...editingRecordData, services: updated });
                                setActiveServiceSearchIdx(idx);
                              }}
                              onFocus={() => setActiveServiceSearchIdx(idx)}
                              onBlur={() => {
                                setTimeout(() => setActiveServiceSearchIdx(null), 200);
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Tên dịch vụ..."
                            />
                            {activeServiceSearchIdx === idx && filteredProductsForServiceTable.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                maxHeight: '150px',
                                overflowY: 'auto'
                              }}>
                                {filteredProductsForServiceTable.map(prod => (
                                  <div
                                    key={prod.id}
                                    onClick={() => {
                                      const updated = [...editingRecordData.services];
                                      updated[idx].name = prod.name;
                                      const basePr = Number(prod.basePrice) || 0;
                                      updated[idx].price = basePr;
                                      updated[idx].total = updated[idx].qty * basePr;
                                      setEditingRecordData({ ...editingRecordData, services: updated });
                                      setActiveServiceSearchIdx(null);
                                    }}
                                    style={{
                                      padding: '0.35rem 0.5rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      fontSize: '0.75rem',
                                      textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <div style={{ fontWeight: '600', color: '#334155' }}>{prod.name}</div>
                                    <div style={{ color: '#10b981', fontSize: '0.7rem' }}>
                                      {formatVND(Number(prod.basePrice) || 0)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="number"
                              step="0.1"
                              value={srv.qty}
                              onChange={(e) => {
                                const updated = [...editingRecordData.services];
                                updated[idx].qty = Number(e.target.value) || 0;
                                updated[idx].total = (Number(e.target.value) || 0) * updated[idx].price;
                                setEditingRecordData({ ...editingRecordData, services: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="number"
                              value={srv.price}
                              onChange={(e) => {
                                const updated = [...editingRecordData.services];
                                updated[idx].price = Number(e.target.value) || 0;
                                updated[idx].total = updated[idx].qty * (Number(e.target.value) || 0);
                                setEditingRecordData({ ...editingRecordData, services: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.25rem', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                            {formatVND(srv.total)}
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input
                              type="text"
                              value={srv.note}
                              onChange={(e) => {
                                const updated = [...editingRecordData.services];
                                updated[idx].note = e.target.value;
                                setEditingRecordData({ ...editingRecordData, services: updated });
                              }}
                              style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Ghi chú..."
                            />
                          </td>
                          <td style={{ padding: '0.25rem', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                const updated = editingRecordData.services.filter((_, i) => i !== idx);
                                setEditingRecordData({ ...editingRecordData, services: updated });
                              }}
                              style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tổng kết & Ghi chú (Edit Mode) */}
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f97316', whiteSpace: 'nowrap' }}>TỔNG KẾT & GHI CHÚ</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Chẩn đoán</label>
                      <input type="text" value={editingRecordData.summary?.diagnosis || ''} onChange={e => setEditingRecordData({...editingRecordData, summary: {...(editingRecordData.summary || {} as any), diagnosis: e.target.value}})} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Chẩn đoán..." />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Tiên lượng</label>
                      <input type="text" value={editingRecordData.summary?.prognosis || ''} onChange={e => setEditingRecordData({...editingRecordData, summary: {...(editingRecordData.summary || {} as any), prognosis: e.target.value}})} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Tiên lượng..." />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Lời dặn</label>
                      <input type="text" value={editingRecordData.summary?.advice || ''} onChange={e => setEditingRecordData({...editingRecordData, summary: {...(editingRecordData.summary || {} as any), advice: e.target.value}})} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Lời dặn..." />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Tái khám</label>
                      <input type="text" value={editingRecordData.summary?.followUp || ''} onChange={e => setEditingRecordData({...editingRecordData, summary: {...(editingRecordData.summary || {} as any), followUp: e.target.value}})} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Thời gian tái khám..." />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Lý do tái khám</label>
                      <input type="text" value={editingRecordData.summary?.followUpReason || ''} onChange={e => setEditingRecordData({...editingRecordData, summary: {...(editingRecordData.summary || {} as any), followUpReason: e.target.value}})} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Lý do..." />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.25rem' }}>Ghi chú chung</label>
                      <textarea value={editingRecordData.summary?.note || ''} onChange={e => setEditingRecordData({...editingRecordData, summary: {...(editingRecordData.summary || {} as any), note: e.target.value}})} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} placeholder="Ghi chú thêm..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // VIEW MODE
              (() => {
                const currentRec = medicalRecordsList.find(r => r.id === selectedRecordId);
                if (!currentRec) {
                  return (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      height: '100%', minHeight: '300px', color: '#64748b', gap: '1.25rem', padding: '2rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#ea580c', marginBottom: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.1)'
                      }}>
                        <FileText size={40} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Thú cưng chưa có bệnh án</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '360px', lineHeight: '1.5' }}>
                        Thú cưng này chưa có lịch sử khám bệnh. Bạn có thể bắt đầu tạo bệnh án mới ngay bây giờ.
                      </p>
                      <button
                        onClick={() => {
                          const fresh: MedicalExamRecord = {
                            id: 'rec_' + Math.random().toString(36).substring(2, 11),
                            date: new Date().toISOString().slice(0, 10),
                            branch: 'Bệnh viện thú y pet 24h- Cầu Giấy',
                            vetName: 'Bs Nghi',
                            customerSymptoms: '',
                            clinicalSigns: {
                              temperature: '',
                              weight: pet.weight ? String(pet.weight) : '',
                              dewormed: '',
                              bloodPressure: '',
                              spo2: '',
                              vaccinated: '',
                              heartRate: '',
                              pulse: '',
                              clinicalManifestation: ''
                            },
                            examinationPackage: {
                              inpatientTreatment: '',
                              medicineSales: '',
                              liquidMedicine: ''
                            },
                            prescriptions: [],
                            services: [],
                            summary: {
                              diagnosis: '',
                              prognosis: '',
                              advice: '',
                              followUp: '',
                              followUpReason: '',
                              note: ''
                            }
                          };
                          setEditingRecordData(fresh);
                          setIsEditingRecord(true);
                        }}
                        style={{
                          padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px',
                          backgroundColor: '#ea580c', color: 'white', fontWeight: '600', fontSize: '0.875rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
                      >
                        <Plus size={16} /> Tạo bệnh án mới
                      </button>
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Title and Edit Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                        Chi tiết khám bệnh ({new Date(currentRec.date).toLocaleDateString('vi-VN')})
                      </h4>
                      <button
                        onClick={() => {
                          setEditingRecordData(JSON.parse(JSON.stringify(currentRec)));
                          setIsEditingRecord(true);
                        }}
                        style={{
                          padding: '0.4rem 1rem', border: 'none', borderRadius: '6px',
                          backgroundColor: '#f97316', color: 'white', fontWeight: '600', fontSize: '0.8rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}
                      >
                        <Edit2 size={14} /> Chỉnh sửa bệnh án
                      </button>
                    </div>

                    {/* Metadata view */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                      <div>
                        <span style={{ color: '#e28704', fontWeight: 'bold' }}>Chi nhánh:</span>{' '}
                        <span style={{ color: '#334155', fontWeight: '500' }}>{currentRec.branch || 'Bệnh viện thú y pet 24h- Cầu Giấy'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#e28704', fontWeight: 'bold' }}>Người bán:</span>{' '}
                        <span style={{ color: '#334155', fontWeight: '500' }}>{currentRec.vetName || 'Bs Nghi'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#e28704', fontWeight: 'bold' }}>Triệu chứng từ khách:</span>{' '}
                        <span style={{ color: '#ef4444', fontWeight: '500' }}>{currentRec.customerSymptoms || 'Không có thông tin'}</span>
                      </div>
                    </div>

                    {/* Clinical Signs */}
                    <div>
                      <span style={{ color: '#e28704', fontWeight: 'bold', fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem' }}>Triệu chứng:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1rem', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Nhiệt độ(°C):</span>
                          <span style={{ color: currentRec.clinicalSigns.temperature ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.temperature ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.temperature || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Cân nặng(Kg):</span>
                          <span style={{ color: currentRec.clinicalSigns.weight ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.weight ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.weight || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Tẩy giun:</span>
                          <span style={{ color: currentRec.clinicalSigns.dewormed ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.dewormed ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.dewormed || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Huyết áp:</span>
                          <span style={{ color: currentRec.clinicalSigns.bloodPressure ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.bloodPressure ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.bloodPressure || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>SpO2:</span>
                          <span style={{ color: currentRec.clinicalSigns.spo2 ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.spo2 ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.spo2 || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Tiêm ngừa:</span>
                          <span style={{ color: currentRec.clinicalSigns.vaccinated ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.vaccinated ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.vaccinated || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Nhịp tim:</span>
                          <span style={{ color: currentRec.clinicalSigns.heartRate ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.heartRate ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.heartRate || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Nhịp mạch:</span>
                          <span style={{ color: currentRec.clinicalSigns.pulse ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.pulse ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.pulse || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Biểu hiện lâm sàng:</span>
                          <span style={{ color: currentRec.clinicalSigns.clinicalManifestation ? '#1e293b' : '#ef4444', fontWeight: currentRec.clinicalSigns.clinicalManifestation ? '600' : 'normal' }}>
                            {currentRec.clinicalSigns.clinicalManifestation || 'Không có thông tin'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Package details */}
                    <div>
                      <span style={{ color: '#e28704', fontWeight: 'bold', fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem' }}>Thông tin gói khám:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1rem', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Điều trị nội trú:</span>
                          <span style={{ color: currentRec.examinationPackage.inpatientTreatment ? '#1e293b' : '#ef4444', fontWeight: currentRec.examinationPackage.inpatientTreatment ? '600' : 'normal' }}>
                            {currentRec.examinationPackage.inpatientTreatment || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Bán thuốc điều trị:</span>
                          <span style={{ color: currentRec.examinationPackage.medicineSales ? '#1e293b' : '#ef4444', fontWeight: currentRec.examinationPackage.medicineSales ? '600' : 'normal' }}>
                            {currentRec.examinationPackage.medicineSales || 'Không có thông tin'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#334155', minWidth: '150px', display: 'inline-block' }}>Thuốc chiết lọ nhỏ:</span>
                          <span style={{ color: currentRec.examinationPackage.liquidMedicine ? '#1e293b' : '#ef4444', fontWeight: currentRec.examinationPackage.liquidMedicine ? '600' : 'normal' }}>
                            {currentRec.examinationPackage.liquidMedicine || 'Không có thông tin'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Prescriptions View */}
                    <div>
                      <span style={{ color: '#e28704', fontWeight: 'bold', fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem' }}>Đơn thuốc:</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#10b981', color: 'white' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'center', width: '5%', border: '1px solid #cbd5e1' }}>STT</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left', width: '35%', border: '1px solid #cbd5e1' }}>Tên thuốc</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', width: '10%', border: '1px solid #cbd5e1' }}>Số lượng</th>
                            <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>Đơn vị</th>
                            <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>Liều lượng</th>
                            <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>Cách dùng</th>
                            <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRec.prescriptions.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1', fontStyle: 'italic' }}>
                                Không có đơn thuốc nào được kê.
                              </td>
                            </tr>
                          ) : (
                            currentRec.prescriptions.map((pres, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontWeight: '600' }}>{pres.name}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', color: '#ea580c', fontWeight: '700' }}>{pres.qty}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', color: '#475569' }}>{pres.unit}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', color: '#475569' }}>{pres.dosage || '-'}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', color: '#475569' }}>{pres.usage || '-'}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', color: '#64748b' }}>{pres.note || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Services View */}
                    <div>
                      <span style={{ color: '#e28704', fontWeight: 'bold', fontSize: '0.95rem', display: 'block', marginBottom: '0.5rem' }}>Dịch vụ:</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0f766e', color: 'white' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'center', width: '5%', border: '1px solid #cbd5e1' }}>STT</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left', width: '40%', border: '1px solid #cbd5e1' }}>Dịch vụ/Hàng hóa</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', width: '10%', border: '1px solid #cbd5e1' }}>Số lượng</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right', width: '20%', border: '1px solid #cbd5e1' }}>Đơn giá</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right', width: '20%', border: '1px solid #cbd5e1' }}>Thành tiền</th>
                            <th style={{ padding: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'left', width: '15%' }}>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRec.services.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1', fontStyle: 'italic' }}>
                                Không có dịch vụ/hàng hóa nào sử dụng.
                              </td>
                            </tr>
                          ) : (
                            currentRec.services.map((srv, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontWeight: '600' }}>{srv.name}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', color: '#ea580c', fontWeight: '700' }}>{srv.qty}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1', color: '#475569' }}>{formatVND(srv.price)}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1', color: '#0f766e', fontWeight: '700' }}>{formatVND(srv.total)}</td>
                                <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', color: '#64748b' }}>{srv.note || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Tổng kết View Mode */}
                    <div style={{ position: 'relative', marginTop: '1.5rem', backgroundColor: '#f8fafc', padding: '1.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '700', color: '#f97316' }}>Tổng kết:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div><span style={{ fontWeight: '600', color: '#334155', minWidth: '120px', display: 'inline-block' }}>Chẩn đoán:</span> <span style={{ color: currentRec.summary?.diagnosis ? '#1e293b' : '#ef4444' }}>{currentRec.summary?.diagnosis || 'Không có thông tin'}</span></div>
                        <div><span style={{ fontWeight: '600', color: '#334155', minWidth: '120px', display: 'inline-block' }}>Tiên lượng:</span> <span style={{ color: currentRec.summary?.prognosis ? '#1e293b' : '#ef4444' }}>{currentRec.summary?.prognosis || 'Không có thông tin'}</span></div>
                        <div><span style={{ fontWeight: '600', color: '#334155', minWidth: '120px', display: 'inline-block' }}>Lời dặn:</span> <span style={{ color: currentRec.summary?.advice ? '#1e293b' : '#ef4444' }}>{currentRec.summary?.advice || 'Không có thông tin'}</span></div>
                        <div><span style={{ fontWeight: '600', color: '#334155', minWidth: '120px', display: 'inline-block' }}>Tái khám:</span> <span style={{ color: currentRec.summary?.followUp ? '#1e293b' : '#ef4444' }}>{currentRec.summary?.followUp || 'Không có thông tin'}</span></div>
                        <div><span style={{ fontWeight: '600', color: '#334155', minWidth: '120px', display: 'inline-block' }}>Lý do tái khám:</span> <span style={{ color: currentRec.summary?.followUpReason ? '#1e293b' : '#ef4444' }}>{currentRec.summary?.followUpReason || 'Không có thông tin'}</span></div>
                      </div>

                      <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '1rem', fontWeight: '700', color: '#f97316' }}>Ghi chú:</h4>
                      <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                        <span style={{ fontWeight: '600', color: '#334155', minWidth: '120px', display: 'inline-block' }}>Ghi chú:</span> <span style={{ color: currentRec.summary?.note ? '#1e293b' : '#ef4444' }}>{currentRec.summary?.note || 'Không có thông tin'}</span>
                      </div>

                      <button 
                        onClick={() => {
                          const textToCopy = `Tổng kết bệnh án:\n- Chẩn đoán: ${currentRec.summary?.diagnosis || 'Không có thông tin'}\n- Tiên lượng: ${currentRec.summary?.prognosis || 'Không có thông tin'}\n- Lời dặn: ${currentRec.summary?.advice || 'Không có thông tin'}\n- Tái khám: ${currentRec.summary?.followUp || 'Không có thông tin'}\n- Lý do tái khám: ${currentRec.summary?.followUpReason || 'Không có thông tin'}\n- Ghi chú: ${currentRec.summary?.note || 'Không có thông tin'}`;
                          navigator.clipboard.writeText(textToCopy).then(() => {
                            alert('Đã sao chép tổng kết!');
                          });
                        }}
                        style={{ position: 'absolute', bottom: '1rem', right: '1rem', padding: '0.4rem 1.25rem', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px',
              backgroundColor: 'white', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Catalog Picker Modal for Prescriptions/Services */}
      {isProductPickerModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
                {productPickerTarget === 'prescription' ? 'Chọn thuốc từ danh mục' : 'Chọn dịch vụ / sản phẩm'}
              </h3>
              <button onClick={() => setIsProductPickerModalOpen(false)} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên, mã vạch, mã sản phẩm..." 
                  value={productPickerSearch}
                  onChange={(e) => setProductPickerSearch(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {products.filter(p => 
                (p.name || '').toLowerCase().includes(productPickerSearch.toLowerCase()) || 
                (p.productCode || '').toLowerCase().includes(productPickerSearch.toLowerCase()) ||
                (p.barcode || '').includes(productPickerSearch)
              ).map(p => (
                <div key={p.id} style={{ marginBottom: '0.5rem', backgroundColor: popupSelectedProductId === p.id ? '#f8fafc' : 'white', borderRadius: '0.5rem', border: popupSelectedProductId === p.id ? '1px solid #cbd5e1' : 'none' }}>
                  <div 
                    onClick={() => {
                      if (popupSelectedProductId === p.id) {
                         setPopupSelectedProductId(null);
                      } else {
                         setPopupSelectedProductId(p.id);
                         setPopupForm({ qty: 1, unit: p.unit?.name || 'Viên', dosage: '', usage: '', note: '', price: Number(p.basePrice) || 0 });
                      }
                    }}
                    style={{
                      padding: '1rem',
                      borderBottom: popupSelectedProductId === p.id ? 'none' : '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderRadius: popupSelectedProductId === p.id ? '0.5rem 0.5rem 0 0' : '0.5rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {productPickerTarget === 'prescription' ? (p.unit?.name ? `Đơn vị: ${p.unit.name} | ` : '') : ''}
                        Mã: {p.productCode || '--'}
                      </div>
                    </div>
                    {productPickerTarget === 'service' && (
                      <div style={{ fontWeight: '700', color: '#10b981' }}>
                        {p.basePrice ? formatVND(Number(p.basePrice)) : '0đ'}
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (productPickerTarget === 'prescription') {
                          handleAddPrescriptionFromProduct(p);
                        } else {
                          handleAddMedicalServiceFromProduct(p);
                        }
                      }}
                      style={{ padding: '0.3rem 0.8rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Thêm nhanh
                    </button>
                  </div>
                  
                  {/* Expanded Form */}
                  {popupSelectedProductId === p.id && (
                    <div style={{ padding: '1rem', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Số lượng</label>
                          <input type="number" min="1" value={popupForm.qty} onChange={(e) => setPopupForm({...popupForm, qty: Number(e.target.value) || 0})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        </div>
                        {productPickerTarget === 'prescription' && (
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Đơn vị</label>
                            <input type="text" value={popupForm.unit} onChange={(e) => setPopupForm({...popupForm, unit: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </div>
                        )}
                        {productPickerTarget === 'service' && (
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Đơn giá (VND)</label>
                            <input type="number" value={popupForm.price} onChange={(e) => setPopupForm({...popupForm, price: Number(e.target.value) || 0})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                          </div>
                        )}
                      </div>
                      
                      {productPickerTarget === 'prescription' && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Liều lượng</label>
                            <input type="text" value={popupForm.dosage} onChange={(e) => setPopupForm({...popupForm, dosage: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} placeholder="VD: 1 viên/lần" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Cách dùng</label>
                            <input type="text" value={popupForm.usage} onChange={(e) => setPopupForm({...popupForm, usage: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} placeholder="VD: Sáng, chiều sau ăn" />
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Ghi chú</label>
                        <input type="text" value={popupForm.note} onChange={(e) => setPopupForm({...popupForm, note: e.target.value})} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            if (!editingRecordData) return;
                            if (productPickerTarget === 'prescription') {
                              setEditingRecordData({
                                ...editingRecordData,
                                prescriptions: [
                                  ...editingRecordData.prescriptions,
                                  { name: p.name, qty: popupForm.qty, unit: popupForm.unit, dosage: popupForm.dosage, usage: popupForm.usage, note: popupForm.note }
                                ]
                              });
                            } else {
                              setEditingRecordData({
                                ...editingRecordData,
                                services: [
                                  ...editingRecordData.services,
                                  { name: p.name, qty: popupForm.qty, price: popupForm.price, total: popupForm.qty * popupForm.price, note: popupForm.note }
                                ]
                              });
                            }
                            setPopupSelectedProductId(null);
                          }}
                          style={{ padding: '0.5rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Xác nhận Thêm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'right', backgroundColor: '#f8fafc' }}>
              <button onClick={() => setIsProductPickerModalOpen(false)} style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {quickTaskModalData.isOpen && pet && (pet.ownerId || pet.owner?.id) && (
        <AppointmentModal
          isOpen={true}
          onClose={() => setQuickTaskModalData({ isOpen: false, initialNotes: '' })}
          onSubmit={async (data) => {
            await createAppointment(data);
            alert('Tạo công việc thành công!');
          }}
          customerId={pet.ownerId || pet.owner?.id}
          initialNotes={quickTaskModalData.initialNotes}
        />
      )}
    </div>
  );
};

export default MedicalRecordModal;
