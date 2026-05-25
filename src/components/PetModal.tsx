import React, { useState, useEffect, useRef } from 'react';
import { X, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import customersApi from '../api/customers';
import { type Pet } from '../api/pets';
import api from '../api/client';

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

  // Core pet states
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Chó');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState<string | number>('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [notes, setNotes] = useState('');
  const [barcode, setBarcode] = useState('');
  const [ageType, setAgeType] = useState<'years' | 'days'>('years');
  const [ageYears, setAgeYears] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [ageDays, setAgeDays] = useState('');
  const [furColor, setFurColor] = useState('');
  const [neutered, setNeutered] = useState('');
  const [isCrossBreed, setIsCrossBreed] = useState(false);
  const [habitat, setHabitat] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Cross breed selections
  const [primaryBreed, setPrimaryBreed] = useState('');
  const [secondaryBreed, setSecondaryBreed] = useState('');

  // Custom additions lists
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [customHabitats, setCustomHabitats] = useState<string[]>([]);

  // Camera capture states
  const [showWebcamModal, setShowWebcamModal] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string>('');
  const [cameraActiveState, setCameraActiveState] = useState<'streaming' | 'captured'>('streaming');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Queries
  const { data: customerData } = useQuery({
    queryKey: ['searchCustomersForPet', custSearch],
    queryFn: () => customersApi.searchCustomers(custSearch),
    enabled: isOpen && !ownerId && custSearch.trim().length > 0,
  });

  const { data: ownerDetails } = useQuery({
    queryKey: ['customerDetail', ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      const response = await api.get(`/customers/${ownerId}`);
      return response.data;
    },
    enabled: isOpen && !!ownerId,
  });

  const matchedCustomers = customerData?.data || [];

  // Sync species list
  const dogBreeds = ['Poodle', 'Corgi', 'Phốc Sóc', 'Alaska', 'Golden Retriever', 'Husky', 'Khác'];
  const catBreeds = ['Mèo Anh lông ngắn', 'Mèo Anh lông dài', 'Mèo Ba Tư', 'Mèo Ta', 'Khác'];
  const otherBreeds = ['Khác'];
  const breedsToShow = species === 'Chó' ? dogBreeds : (species === 'Mèo' ? catBreeds : otherBreeds);

  const furColors = ['Trắng', 'Đen', 'Vàng', 'Nâu', 'Xám', 'Tam thể', 'Nhị thể'];
  const habitats = ['Trong nhà', 'Ngoài trời', 'Bán hoang dã'];

  // Fill in primary / secondary breed on changes
  useEffect(() => {
    if (isCrossBreed) {
      setBreed(primaryBreed + (secondaryBreed ? ' lai ' + secondaryBreed : ''));
    } else {
      setBreed(primaryBreed);
    }
  }, [primaryBreed, secondaryBreed, isCrossBreed]);

  // Load existing pet or reset form
  useEffect(() => {
    if (pet) {
      setName(pet.name || '');
      
      let initialSpecies = pet.species || 'Chó';
      if (initialSpecies === 'Dog') initialSpecies = 'Chó';
      if (initialSpecies === 'Cat') initialSpecies = 'Mèo';
      setSpecies(initialSpecies);

      const br = pet.breed || '';
      if (br.includes(' lai ')) {
        const parts = br.split(' lai ');
        setPrimaryBreed(parts[0] || '');
        setSecondaryBreed(parts[1] || '');
        setIsCrossBreed(true);
      } else {
        setPrimaryBreed(br);
        setSecondaryBreed('');
        setIsCrossBreed(false);
      }

      setWeight(pet.weight || '');
      setGender(pet.gender || 'unknown');
      setNotes(pet.notes || '');
      setBarcode((pet as any).barcode || '');
      
      const type = (pet as any).ageType || 'years';
      setAgeType(type);
      setAgeYears((pet as any).ageYears !== undefined ? String((pet as any).ageYears) : '');
      setAgeMonths((pet as any).ageMonths !== undefined ? String((pet as any).ageMonths) : '');
      setAgeDays((pet as any).ageDays !== undefined ? String((pet as any).ageDays) : '');
      
      // Calculate age fields if they are missing but dateOfBirth exists
      if (pet.dateOfBirth && !(pet as any).ageYears && !(pet as any).ageDays) {
        const dob = new Date(pet.dateOfBirth);
        const today = new Date();
        let diffYears = today.getFullYear() - dob.getFullYear();
        let diffMonths = today.getMonth() - dob.getMonth();
        let diffDays = today.getDate() - dob.getDate();

        if (diffDays < 0) {
          diffMonths--;
          const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          diffDays += prevMonth.getDate();
        }
        if (diffMonths < 0) {
          diffYears--;
          diffMonths += 12;
        }

        setAgeType('years');
        setAgeYears(String(diffYears));
        setAgeMonths(String(diffMonths));
        setAgeDays('');
      }

      setFurColor((pet as any).furColor || '');
      setNeutered((pet as any).neutered || '');
      setHabitat((pet as any).habitat || '');
      setAvatarUrl((pet as any).avatarUrl || '');

      if (pet.owner) {
        setSelectedOwner({ id: pet.owner.id, name: pet.owner.fullName });
      }
    } else {
      setName('');
      setSpecies('Chó');
      setBreed('');
      setPrimaryBreed('');
      setSecondaryBreed('');
      setIsCrossBreed(false);
      setWeight('');
      setGender('unknown');
      setNotes('');
      setBarcode('');
      setAgeType('years');
      setAgeYears('');
      setAgeMonths('');
      setAgeDays('');
      setFurColor('');
      setNeutered('');
      setHabitat('');
      setAvatarUrl('');
      setSelectedOwner(null);
      setCustSearch('');
    }
  }, [pet, isOpen, ownerId]);

  if (!isOpen) return null;

  // Title info
  let ownerName = '';
  if (pet?.owner) {
    ownerName = pet.owner.fullName;
  } else if (ownerDetails) {
    ownerName = ownerDetails.fullName;
  } else if (selectedOwner) {
    ownerName = selectedOwner.name;
  }

  // Camera actions
  const startCamera = async () => {
    setCapturedBlob(null);
    setCapturedDataUrl('');
    setCameraActiveState('streaming');
    setShowWebcamModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền thiết bị!');
      setShowWebcamModal(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedDataUrl(dataUrl);

        canvas.toBlob((blob) => {
          if (blob) setCapturedBlob(blob);
        }, 'image/jpeg');

        setCameraActiveState('captured');
        
        if (webcamStream) {
          webcamStream.getTracks().forEach(track => track.stop());
          setWebcamStream(null);
        }
      }
    }
  };

  const stopCamera = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setShowWebcamModal(false);
  };

  const handleUploadImage = async (file: File | Blob) => {
    try {
      const formData = new FormData();
      formData.append('files', file, 'avatar.jpg');

      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.data && response.data.data.url) {
        const publicUrl = response.data.data.url;
        setAvatarUrl(publicUrl);
      } else {
        alert('Tải ảnh lên thất bại. Máy chủ trả về phản hồi không hợp lệ.');
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert(`Lỗi tải ảnh lên: ${err?.response?.data?.message || err?.message || 'Có lỗi xảy ra'}`);
    }
  };

  const handleAddFurColor = () => {
    const newColor = prompt('Nhập màu lông mới:');
    if (newColor && newColor.trim()) {
      const val = newColor.trim();
      if (!furColors.includes(val) && !customColors.includes(val)) {
        setCustomColors(prev => [...prev, val]);
      }
      setFurColor(val);
    }
  };

  const handleAddHabitat = () => {
    const newHabitat = prompt('Nhập môi trường sống mới:');
    if (newHabitat && newHabitat.trim()) {
      const val = newHabitat.trim();
      if (!habitats.includes(val) && !customHabitats.includes(val)) {
        setCustomHabitats(prev => [...prev, val]);
      }
      setHabitat(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitOwnerId = ownerId || selectedOwner?.id;
    if (!submitOwnerId) {
      alert('Vui lòng chọn chủ sở hữu cho thú cưng!');
      return;
    }

    if (!name.trim()) {
      alert('Vui lòng nhập tên thú cưng!');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate date of birth on the fly based on age fields
      let computedDateOfBirth = pet?.dateOfBirth ? pet.dateOfBirth.split('T')[0] : undefined;
      if (ageYears || ageMonths || ageDays) {
        const date = new Date();
        if (ageType === 'years') {
          const yearsNum = Number(ageYears) || 0;
          const monthsNum = Number(ageMonths) || 0;
          date.setFullYear(date.getFullYear() - yearsNum);
          date.setMonth(date.getMonth() - monthsNum);
        } else {
          const daysNum = Number(ageDays) || 0;
          date.setDate(date.getDate() - daysNum);
        }
        computedDateOfBirth = date.toISOString().split('T')[0];
      }

      const submitSpecies = species === 'Chó' ? 'Dog' : (species === 'Mèo' ? 'Cat' : species);

      const payload = {
        name: name.trim(),
        species: submitSpecies,
        breed: breed.trim() || undefined,
        weight: weight ? Number(weight) : undefined,
        gender,
        notes: notes.trim() || undefined,
        barcode: barcode.trim() || undefined,
        ageType,
        ageYears: ageYears ? Number(ageYears) : undefined,
        ageMonths: ageMonths ? Number(ageMonths) : undefined,
        ageDays: ageDays ? Number(ageDays) : undefined,
        furColor: furColor.trim() || undefined,
        neutered: neutered || undefined,
        isCrossBreed,
        habitat: habitat.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        ownerId: submitOwnerId,
        dateOfBirth: computedDateOfBirth,
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
    <div className="pet-modal-overlay">
      <style dangerouslySetInnerHTML={{ __html: `
        .pet-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .pet-modal-container {
          background-color: white;
          border-radius: 1rem;
          width: 100%;
          max-width: 650px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .pet-modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pet-modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 75vh;
          overflow-y: auto;
        }

        .pet-modal-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 600px) {
          .pet-modal-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .pet-modal-row-2-1 {
            grid-template-columns: 1fr !important;
          }
        }

        .pet-modal-row-2-1 {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1rem;
        }

        .pet-modal-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .pet-modal-label {
          font-weight: 700;
          color: #334155;
          font-size: 0.85rem;
        }

        .pet-modal-input, .pet-modal-select, .pet-modal-textarea {
          padding: 0.55rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid #cbd5e1;
          font-size: 0.8rem;
          outline: none;
          background-color: white;
          transition: all 0.2s;
          color: #1e293b;
        }

        .pet-modal-input:focus, .pet-modal-select:focus, .pet-modal-textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }

        .pet-modal-avatar-preview {
          width: 85px;
          height: 85px;
          border-radius: 0.75rem;
          background-color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
          position: relative;
          overflow: hidden;
        }

        .pet-modal-avatar-btn-photo {
          border: 1px solid #10b981;
          color: #10b981;
          background-color: white;
          font-weight: 700;
          padding: 0.45rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.2s;
        }

        .pet-modal-avatar-btn-photo:hover {
          background-color: rgba(16, 185, 129, 0.05);
        }

        .pet-modal-avatar-btn-upload {
          border: 1px solid #3b82f6;
          color: #3b82f6;
          background-color: white;
          font-weight: 700;
          padding: 0.45rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.2s;
        }

        .pet-modal-avatar-btn-upload:hover {
          background-color: rgba(59, 130, 246, 0.05);
        }

        .pet-modal-avatar-btn-url {
          border: 1px solid #cbd5e1;
          color: #64748b;
          background-color: white;
          font-weight: 700;
          padding: 0.45rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.2s;
        }

        .pet-modal-avatar-btn-url:hover {
          background-color: #f1f5f9;
        }

        .pet-modal-radio-group {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          height: 100%;
          padding-left: 0.25rem;
        }

        .pet-modal-radio-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
          color: #475569;
        }

        .pet-modal-switch-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 100%;
        }

        .pet-modal-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 22px;
          cursor: pointer;
        }

        .pet-modal-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .pet-modal-switch-slider {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          border-radius: 34px;
          transition: 0.3s;
        }

        .pet-modal-switch-slider::before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: 0.3s;
        }

        .pet-modal-switch input:checked + .pet-modal-switch-slider {
          background-color: #10b981;
        }

        .pet-modal-switch input:checked + .pet-modal-switch-slider::before {
          transform: translateX(18px);
        }

        .pet-modal-footer {
          padding: 1.25rem 1.5rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 1rem;
        }

        .pet-modal-btn-cancel {
          flex: 1;
          padding: 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          background-color: white;
          color: #475569;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .pet-modal-btn-cancel:hover {
          background-color: #f8fafc;
        }

        .pet-modal-btn-submit {
          flex: 1;
          padding: 0.65rem;
          border: none;
          border-radius: 0.5rem;
          background-color: #8b5cf6;
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .pet-modal-btn-submit:hover {
          background-color: #7c3aed;
        }

        .pet-modal-btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .pet-modal-plus-btn {
          padding: 0.55rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid #10b981;
          background-color: white;
          color: #10b981;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pet-modal-plus-btn:hover {
          background-color: rgba(16, 185, 129, 0.05);
        }
      `}} />

      <div className="pet-modal-container">
        {/* Header */}
        <div className="pet-modal-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              {pet ? 'Cập nhật thú cưng' : 'Thêm nhanh thú cưng'}
            </h2>
            {ownerName && (
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', margin: 0 }}>
                Chủ nuôi: <span style={{ color: '#8b5cf6', fontWeight: '700' }}>{ownerName}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ padding: '0.4rem', borderRadius: '0.5rem', color: '#94a3b8', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pet-modal-body">
          {/* Owner Selection (only when not pre-filled and not editing) */}
          {!ownerId && !pet && (
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
              <label className="pet-modal-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                <span style={{ color: '#ef4444' }}>*</span> Chủ sở hữu (Khách hàng)
              </label>
              {selectedOwner ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem', backgroundColor: 'rgba(139, 92, 246, 0.05)',
                  borderRadius: '0.5rem', border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="#8b5cf6" />
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>{selectedOwner.name}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedOwner(null)} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
                    Thay đổi
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Nhập tên hoặc số điện thoại khách hàng..."
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    className="pet-modal-input"
                    style={{ width: '100%', paddingLeft: '2.25rem' }}
                  />
                  {custSearch.trim().length > 0 && matchedCustomers.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '110%', left: 0, right: 0,
                      backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
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
                            padding: '0.55rem 0.85rem', cursor: 'pointer', transition: 'background-color 0.2s',
                            fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9'
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

          {/* Row 1: Image Selection */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div className="pet-modal-avatar-preview">
              {avatarUrl ? (
                <>
                  <img src={avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    style={{
                      position: 'absolute', top: '2px', right: '2px',
                      backgroundColor: 'rgba(239, 68, 68, 0.8)', border: 'none',
                      borderRadius: '50%', width: '18px', height: '18px',
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', fontSize: '10px'
                    }}
                    title="Xóa ảnh"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '2rem' }}>🐾</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <span className="pet-modal-label">Ảnh thú cưng:</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="pet-modal-avatar-btn-photo" onClick={startCamera}>
                  📷 Chụp ảnh
                </button>
                
                <label className="pet-modal-avatar-btn-upload">
                  📁 Tải ảnh lên
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleUploadImage(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  type="button"
                  className="pet-modal-avatar-btn-url"
                  onClick={() => {
                    const url = prompt('Dán URL ảnh thú cưng của bạn vào đây:');
                    if (url) setAvatarUrl(url);
                  }}
                >
                  🔗 Nhập URL
                </button>
              </div>
              
              {avatarUrl && (
                <span style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>
                  URL ảnh: {avatarUrl.substring(0, 45)}...
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Name, Barcode ID, Age */}
          <div className="pet-modal-row">
            <div className="pet-modal-field">
              <label className="pet-modal-label">
                <span style={{ color: '#ef4444' }}>*</span> Tên thú cưng:
              </label>
              <input
                type="text"
                placeholder="Nhập tên thú cưng"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pet-modal-input"
                required
              />
            </div>

            <div className="pet-modal-field">
              <label className="pet-modal-label">ID:</label>
              <input
                type="text"
                placeholder="Nhập mã vạch"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="pet-modal-input"
              />
            </div>

            <div className="pet-modal-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="pet-modal-label">Tuổi:</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <label className="pet-modal-radio-label">
                    <input
                      type="radio"
                      checked={ageType === 'years'}
                      onChange={() => setAgeType('years')}
                    />Tuổi
                  </label>
                  <label className="pet-modal-radio-label">
                    <input
                      type="radio"
                      checked={ageType === 'days'}
                      onChange={() => setAgeType('days')}
                    />Ngày
                  </label>
                </div>
              </div>
              
              {ageType === 'years' ? (
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Năm"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    className="pet-modal-input"
                    style={{ width: '100%', paddingLeft: '0.25rem', paddingRight: '0.25rem', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Năm</span>
                  <input
                    type="number"
                    placeholder="Tháng"
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(e.target.value)}
                    className="pet-modal-input"
                    style={{ width: '100%', paddingLeft: '0.25rem', paddingRight: '0.25rem', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Tháng</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Ngày"
                    value={ageDays}
                    onChange={(e) => setAgeDays(e.target.value)}
                    className="pet-modal-input"
                    style={{ width: '100%', paddingLeft: '0.25rem', paddingRight: '0.25rem', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ngày</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Species, Weight, Gender */}
          <div className="pet-modal-row">
            <div className="pet-modal-field">
              <label className="pet-modal-label">
                <span style={{ color: '#ef4444' }}>*</span> Loài:
              </label>
              <select
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  setPrimaryBreed('');
                  setSecondaryBreed('');
                }}
                className="pet-modal-select"
              >
                <option value="Chó">Chó</option>
                <option value="Mèo">Mèo</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="pet-modal-field">
              <label className="pet-modal-label">Cân nặng:</label>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Nhập cân nặng"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="pet-modal-input"
                  style={{ width: '100%', paddingRight: '2rem' }}
                />
                <span style={{
                  position: 'absolute', right: '0.75rem', color: '#64748b',
                  fontWeight: '700', fontSize: '0.75rem', pointerEvents: 'none'
                }}>KG</span>
              </div>
            </div>

            <div className="pet-modal-field">
              <label className="pet-modal-label">Giới tính:</label>
              <div className="pet-modal-radio-group">
                <label className="pet-modal-radio-label">
                  <input
                    type="radio"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                  /> Đực
                </label>
                <label className="pet-modal-radio-label">
                  <input
                    type="radio"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                  /> Cái
                </label>
                <label className="pet-modal-radio-label">
                  <input
                    type="radio"
                    checked={gender === 'unknown'}
                    onChange={() => setGender('unknown')}
                  /> Khác
                </label>
              </div>
            </div>
          </div>

          {/* Row 4: Breed, Fur Color, Neutered */}
          <div className="pet-modal-row">
            <div className="pet-modal-field">
              <label className="pet-modal-label">
                <span style={{ color: '#ef4444' }}>*</span> Giống:
              </label>
              <select
                value={primaryBreed}
                onChange={(e) => setPrimaryBreed(e.target.value)}
                className="pet-modal-select"
                required
              >
                <option value="">--Chọn giống--</option>
                {breedsToShow.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {isCrossBreed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b' }}>lai với:</span>
                  <select
                    value={secondaryBreed}
                    onChange={(e) => setSecondaryBreed(e.target.value)}
                    className="pet-modal-select"
                  >
                    <option value="">--Chọn giống lai--</option>
                    {breedsToShow.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pet-modal-field">
              <label className="pet-modal-label">Màu lông:</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <select
                  value={furColor}
                  onChange={(e) => setFurColor(e.target.value)}
                  className="pet-modal-select"
                  style={{ flex: 1 }}
                >
                  <option value="">--Chọn màu lông--</option>
                  {furColors.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {customColors.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddFurColor}
                  className="pet-modal-plus-btn"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pet-modal-field">
              <label className="pet-modal-label">Triệt sản:</label>
              <select
                value={neutered}
                onChange={(e) => setNeutered(e.target.value)}
                className="pet-modal-select"
              >
                <option value="">--Chọn--</option>
                <option value="Có">Có</option>
                <option value="Không">Không</option>
                <option value="Không rõ">Không rõ</option>
              </select>
            </div>
          </div>

          {/* Row 5: Cross breed toggles, Habitat */}
          <div className="pet-modal-row-2-1">
            <div className="pet-modal-field" style={{ justifyContent: 'center' }}>
              <div className="pet-modal-switch-container">
                <label className="pet-modal-switch">
                  <input
                    type="checkbox"
                    checked={isCrossBreed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsCrossBreed(checked);
                      if (!checked) {
                        setSecondaryBreed('');
                      }
                    }}
                  />
                  <span className="pet-modal-switch-slider" />
                </label>
                <span className="pet-modal-label">Lai với ⇅</span>
              </div>
            </div>

            <div className="pet-modal-field">
              <label className="pet-modal-label">Môi trường sống:</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <select
                  value={habitat}
                  onChange={(e) => setHabitat(e.target.value)}
                  className="pet-modal-select"
                  style={{ flex: 1 }}
                >
                  <option value="">--Chọn môi trường sống--</option>
                  {habitats.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                  {customHabitats.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddHabitat}
                  className="pet-modal-plus-btn"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Row 6: Notes */}
          <div className="pet-modal-field">
            <label className="pet-modal-label">Ghi chú:</label>
            <textarea
              placeholder="Nhập ghi chú"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="pet-modal-textarea"
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="pet-modal-btn-cancel"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pet-modal-btn-submit"
            >
              {isSubmitting ? 'Đang xử lý...' : (pet ? 'Cập nhật thú cưng' : 'Thêm thú cưng')}
            </button>
          </div>
        </form>
      </div>

      {/* Webcam Capture Modal Overlay */}
      {showWebcamModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', overflow: 'hidden',
            border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Chụp ảnh thú cưng</h3>
                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem', margin: 0 }}>
                  Sử dụng camera của thiết bị để chụp ảnh trực tiếp
                </p>
              </div>
              <button 
                type="button"
                onClick={stopCamera} 
                style={{ padding: '0.4rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Camera Viewport */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#0f172a' }}>
              <div style={{
                width: '100%', aspectRatio: '4/3', borderRadius: '0.5rem',
                overflow: 'hidden', position: 'relative', border: '2px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#1e293b'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    display: cameraActiveState === 'streaming' ? 'block' : 'none'
                  }}
                />
                
                {cameraActiveState === 'captured' && capturedDataUrl && (
                  <img
                    src={capturedDataUrl}
                    alt="Captured preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Actions Footer */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
              display: 'flex', gap: '0.75rem', backgroundColor: '#f8fafc',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                  backgroundColor: 'white', color: '#475569', fontSize: '0.82rem', fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>

              {cameraActiveState === 'streaming' ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  style={{
                    padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none',
                    backgroundColor: '#10b981', color: 'white', fontSize: '0.82rem', fontWeight: '700',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  📸 Chụp hình
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraActiveState('streaming');
                      setCapturedBlob(null);
                      setCapturedDataUrl('');
                      startCamera();
                    }}
                    style={{
                      padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #10b981',
                      backgroundColor: 'white', color: '#10b981', fontSize: '0.82rem', fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Chụp lại
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      if (capturedBlob) {
                        await handleUploadImage(capturedBlob);
                      }
                      setShowWebcamModal(false);
                    }}
                    style={{
                      padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none',
                      backgroundColor: '#8b5cf6', color: 'white', fontSize: '0.82rem', fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Xác nhận & Tải lên
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetModal;
