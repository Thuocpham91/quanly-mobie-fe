import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Building, AlertCircle, X, User, QrCode, Info, Wallet, Home, FileText } from 'lucide-react';
import inventoryApi from '../api/inventory';
import { getSalesRank } from '../api/inventory';
import type { Product } from '../api/inventory';
import { createOrder } from '../api/orders';
import api from '../api/client';
import customersApi from '../api/customers';
import type { Customer } from '../api/customers';
import { useBranchContext } from '../context/BranchContext';
import { getRooms, updateCage, CageStatus } from '../api/boarding';
import MedicalRecordModal from '../components/MedicalRecordModal';

interface CartItem extends Product {
  cartQuantity: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Format number with thousands separator (dot), no currency symbol
const formatThousands = (value: number): string => {
  if (!value) return '';
  return new Intl.NumberFormat('vi-VN').format(value);
};

// Parse formatted string back to number
const parseThousands = (str: string): number => {
  // Remove all non-numeric characters except minus
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

interface MoneyInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, placeholder = '0', style = {} }) => {
  const [focused, setFocused] = React.useState(false);
  const displayValue = focused
    ? (value || '')
    : formatThousands(value);

  return (
    <input
      type={focused ? 'number' : 'text'}
      value={displayValue}
      onChange={(e) => onChange(parseThousands(e.target.value))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={{ textAlign: 'right', ...style }}
    />
  );
};

interface OrderTab {
  id: string;
  name: string;
  cart: CartItem[];
  discount: number;
  tax: number;
  paidCash: number;
  paidCard: number;
  paidTransfer: number;
  paidWallet: number;
  selectedCustomer: Customer | null;
  selectedPetId: string;
}

const POSPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paidCash, setPaidCash] = useState<number>(0);
  const [paidCard, setPaidCard] = useState<number>(0);
  const [paidTransfer, setPaidTransfer] = useState<number>(0);
  const [paidWallet, setPaidWallet] = useState<number>(0);
  const [showProductPrice, setShowProductPrice] = useState<boolean>(true);
  const [showTreatmentName, setShowTreatmentName] = useState<boolean>(true);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);

  // Multiple Order Tabs State
  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([
    { id: '1', name: 'Đơn 1', cart: [], discount: 0, tax: 0, paidCash: 0, paidCard: 0, paidTransfer: 0, paidWallet: 0, selectedCustomer: null, selectedPetId: '' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');

  const switchTab = (nextTabId: string) => {
    if (nextTabId === activeTabId) return;

    // 1. Save current active state to orderTabs
    setOrderTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          cart,
          discount,
          tax,
          paidCash,
          paidCard,
          paidTransfer,
          paidWallet,
          selectedCustomer,
          selectedPetId
        };
      }
      return t;
    }));

    // 2. Load target tab state
    const targetTab = orderTabs.find(t => t.id === nextTabId);
    if (targetTab) {
      setCart(targetTab.cart);
      setDiscount(targetTab.discount);
      setTax(targetTab.tax);
      setPaidCash(targetTab.paidCash);
      setPaidCard(targetTab.paidCard);
      setPaidTransfer(targetTab.paidTransfer);
      setPaidWallet(targetTab.paidWallet || 0);
      setSelectedCustomer(targetTab.selectedCustomer);
      setSelectedPetId(targetTab.selectedPetId);
    }
    setActiveTabId(nextTabId);
  };

  const addNewTab = () => {
    const newId = Date.now().toString();
    
    // Find next available order number
    const nextNum = orderTabs.length + 1;

    const newTab: OrderTab = {
      id: newId,
      name: `Đơn ${nextNum}`,
      cart: [],
      discount: 0,
      tax: 0,
      paidCash: 0,
      paidCard: 0,
      paidTransfer: 0,
      paidWallet: 0,
      selectedCustomer: null,
      selectedPetId: ''
    };

    // Save current active state first
    const updatedTabs = orderTabs.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          cart,
          discount,
          tax,
          paidCash,
          paidCard,
          paidTransfer,
          paidWallet,
          selectedCustomer,
          selectedPetId
        };
      }
      return t;
    });

    setOrderTabs([...updatedTabs, newTab]);
    
    // Reset local states for the new tab
    setCart([]);
    setDiscount(0);
    setTax(0);
    setPaidCash(0);
    setPaidCard(0);
    setPaidTransfer(0);
    setPaidWallet(0);
    setSelectedCustomer(null);
    setSelectedPetId('');
    
    setActiveTabId(newId);
  };

  const closeTab = (tabIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (orderTabs.length === 1) {
      // Cannot close the only tab, just reset it
      setCart([]);
      setDiscount(0);
      setTax(0);
      setPaidCash(0);
      setPaidCard(0);
      setPaidTransfer(0);
      setPaidWallet(0);
      setSelectedCustomer(null);
      setSelectedPetId('');
      
      setOrderTabs([{ id: '1', name: 'Đơn 1', cart: [], discount: 0, tax: 0, paidCash: 0, paidCard: 0, paidTransfer: 0, paidWallet: 0, selectedCustomer: null, selectedPetId: '' }]);
      setActiveTabId('1');
      return;
    }

    const indexToClose = orderTabs.findIndex(t => t.id === tabIdToClose);
    const newTabs = orderTabs.filter(t => t.id !== tabIdToClose);
    
    setOrderTabs(newTabs);

    if (activeTabId === tabIdToClose) {
      // Switch to another tab
      const nextActiveTab = newTabs[Math.max(0, indexToClose - 1)];
      setCart(nextActiveTab.cart);
      setDiscount(nextActiveTab.discount);
      setTax(nextActiveTab.tax);
      setPaidCash(nextActiveTab.paidCash);
      setPaidCard(nextActiveTab.paidCard);
      setPaidTransfer(nextActiveTab.paidTransfer);
      setPaidWallet(nextActiveTab.paidWallet || 0);
      setSelectedCustomer(nextActiveTab.selectedCustomer);
      setSelectedPetId(nextActiveTab.selectedPetId);
      setActiveTabId(nextActiveTab.id);
    }
  };
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [isAdmitPetModalOpen, setIsAdmitPetModalOpen] = useState(false);
  const [selectedAdmitRoomId, setSelectedAdmitRoomId] = useState<string>('');
  const [selectedAdmitCageId, setSelectedAdmitCageId] = useState<string>('');
  const [admitActiveTab, setAdmitActiveTab] = useState<'info' | 'time'>('info');
  const [admitSameDay, setAdmitSameDay] = useState(false);
  const [isPetDetailsModalOpen, setIsPetDetailsModalOpen] = useState(false);
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false);
  const [selectedMedicalRecordPet, setSelectedMedicalRecordPet] = useState<any>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [creditChangeToWallet, setCreditChangeToWallet] = useState<boolean>(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState<boolean>(false);
  const [quickCustomerName, setQuickCustomerName] = useState<string>('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState<string>('');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState<string>('');
  const [quickCustomerEmail, setQuickCustomerEmail] = useState<string>('');

  const [activeCustomerModalTab, setActiveCustomerModalTab] = useState<'customer' | 'pets'>('customer');
  const [quickCustomerPets, setQuickCustomerPets] = useState<any[]>([]);
  const [tempPetName, setTempPetName] = useState<string>('');
  const [tempPetSpecies, setTempPetSpecies] = useState<string>('Chó');
  const [tempPetBreed, setTempPetBreed] = useState<string>('');
  const [tempPetWeight, setTempPetWeight] = useState<string>('');
  const [tempPetGender, setTempPetGender] = useState<string>('male');
  const [tempPetNotes, setTempPetNotes] = useState<string>('');
  const [tempPetBarcode, setTempPetBarcode] = useState<string>('');
  const [tempPetAgeType, setTempPetAgeType] = useState<'years' | 'days'>('years');
  const [tempPetAgeYears, setTempPetAgeYears] = useState<string>('');
  const [tempPetAgeMonths, setTempPetAgeMonths] = useState<string>('');
  const [tempPetAgeDays, setTempPetAgeDays] = useState<string>('');
  const [tempPetFurColor, setTempPetFurColor] = useState<string>('');
  const [tempPetNeutered, setTempPetNeutered] = useState<string>('');
  const [tempPetIsCrossBreed, setTempPetIsCrossBreed] = useState<boolean>(false);
  const [tempPetHabitat, setTempPetHabitat] = useState<string>('');
  const [tempPetAvatarUrl, setTempPetAvatarUrl] = useState<string>('');

  const [showQuickPetModal, setShowQuickPetModal] = useState<boolean>(false);
  const [quickPetName, setQuickPetName] = useState<string>('');
  const [quickPetSpecies, setQuickPetSpecies] = useState<string>('Chó');
  const [quickPetBreed, setQuickPetBreed] = useState<string>('');
  const [quickPetWeight, setQuickPetWeight] = useState<string>('');
  const [quickPetGender, setQuickPetGender] = useState<string>('unknown');
  const [quickPetNotes, setQuickPetNotes] = useState<string>('');
  const [quickPetBarcode, setQuickPetBarcode] = useState<string>('');
  const [quickPetAgeType, setQuickPetAgeType] = useState<'years' | 'days'>('years');
  const [quickPetAgeYears, setQuickPetAgeYears] = useState<string>('');
  const [quickPetAgeMonths, setQuickPetAgeMonths] = useState<string>('');
  const [quickPetAgeDays, setQuickPetAgeDays] = useState<string>('');
  const [quickPetFurColor, setQuickPetFurColor] = useState<string>('');
  const [quickPetNeutered, setQuickPetNeutered] = useState<string>('');
  const [quickPetIsCrossBreed, setQuickPetIsCrossBreed] = useState<boolean>(false);
  const [quickPetHabitat, setQuickPetHabitat] = useState<string>('');
  const [quickPetAvatarUrl, setQuickPetAvatarUrl] = useState<string>('');

  const [showWebcamModal, setShowWebcamModal] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string>('');
  const [cameraActiveState, setCameraActiveState] = useState<'streaming' | 'captured'>('streaming');
  const [cameraTarget, setCameraTarget] = useState<'tempPet' | 'quickPet'>('quickPet');

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const startCamera = async (target: 'tempPet' | 'quickPet') => {
    setCameraTarget(target);
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

  const handleUploadImage = async (file: File | Blob, target: 'tempPet' | 'quickPet') => {
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
        if (target === 'quickPet') {
          setQuickPetAvatarUrl(publicUrl);
        } else {
          setTempPetAvatarUrl(publicUrl);
        }
      } else {
        alert('Tải ảnh lên thất bại. Máy chủ trả về phản hồi không hợp lệ.');
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert(`Lỗi tải ảnh lên: ${err?.response?.data?.message || err?.message || 'Có lỗi xảy ra'}`);
    }
  };

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderPetFormFields = (
    state: {
      name: string; setName: (v: string) => void;
      species: string; setSpecies: (v: string) => void;
      breed: string; setBreed: (v: string) => void;
      weight: string; setWeight: (v: string) => void;
      gender: string; setGender: (v: string) => void;
      notes: string; setNotes: (v: string) => void;
      barcode: string; setBarcode: (v: string) => void;
      ageType: 'years' | 'days'; setAgeType: (v: 'years' | 'days') => void;
      ageYears: string; setAgeYears: (v: string) => void;
      ageMonths: string; setAgeMonths: (v: string) => void;
      ageDays: string; setAgeDays: (v: string) => void;
      furColor: string; setFurColor: (v: string) => void;
      neutered: string; setNeutered: (v: string) => void;
      isCrossBreed: boolean; setIsCrossBreed: (v: boolean) => void;
      habitat: string; setHabitat: (v: string) => void;
      avatarUrl: string; setAvatarUrl: (v: string) => void;
    },
    isSubform = false
  ) => {
    const dogBreeds = ['Poodle', 'Corgi', 'Phốc Sóc', 'Alaska', 'Golden Retriever', 'Husky', 'Khác'];
    const catBreeds = ['Mèo Anh lông ngắn', 'Mèo Anh lông dài', 'Mèo Ba Tư', 'Mèo Ta', 'Khác'];
    const otherBreeds = ['Khác'];
    const breedsToShow = state.species === 'Chó' ? dogBreeds : (state.species === 'Mèo' ? catBreeds : otherBreeds);

    const breedParts = state.breed.split(' lai ');
    const primaryBreed = breedParts[0] || '';
    const secondaryBreed = breedParts[1] || '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', color: '#1e293b', fontSize: '0.85rem' }}>
        
        {/* Row 1: Image Selection */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          {/* Green avatar preview box with paw print */}
          <div style={{
            width: '85px', height: '85px', borderRadius: '0.75rem',
            backgroundColor: '#10b981', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', flexShrink: 0,
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', position: 'relative',
            overflow: 'hidden'
          }}>
            {state.avatarUrl ? (
              <>
                <img src={state.avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => state.setAvatarUrl('')}
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>Ảnh thú cưng:</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              
              {/* Camera Trigger */}
              <button
                type="button"
                onClick={() => startCamera(isSubform ? 'tempPet' : 'quickPet')}
                style={{
                  padding: '0.45rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #10b981',
                  backgroundColor: 'white', color: '#10b981', fontWeight: '700',
                  fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '0.25rem', transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#10b981';
                }}
              >
                📸 Chụp ảnh
              </button>

              {/* Upload Trigger */}
              <label style={{
                padding: '0.45rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #3b82f6',
                backgroundColor: 'white', color: '#3b82f6', fontWeight: '700',
                fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                gap: '0.25rem', transition: 'all 0.2s'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#3b82f6';
                }}
              >
                📁 Tải ảnh lên
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleUploadImage(file, isSubform ? 'tempPet' : 'quickPet');
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>

              {/* URL paste fallback */}
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Dán URL ảnh thú cưng của bạn vào đây:');
                  if (url) state.setAvatarUrl(url);
                }}
                style={{
                  padding: '0.45rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1',
                  backgroundColor: 'white', color: '#64748b', fontWeight: '600',
                  fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                🔗 Nhập URL
              </button>
            </div>
            
            {state.avatarUrl && (
              <span style={{ fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>
                URL ảnh: {state.avatarUrl.substring(0, 50)}...
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Name, Barcode ID, Age */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>
              <span style={{ color: '#ef4444' }}>*</span> Tên thú cưng:
            </label>
            <input
              type="text"
              placeholder="Nhập tên thú cưng"
              value={state.name}
              onChange={(e) => state.setName(e.target.value)}
              style={{
                padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
                border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none'
              }}
              required={!isSubform}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>ID:</label>
            <input
              type="text"
              placeholder="Nhập mã vạch"
              value={state.barcode}
              onChange={(e) => state.setBarcode(e.target.value)}
              style={{
                padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
                border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: '700', color: '#475569' }}>Tuổi:</label>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={state.ageType === 'years'}
                    onChange={() => state.setAgeType('years')}
                  /> Tuổi
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={state.ageType === 'days'}
                    onChange={() => state.setAgeType('days')}
                  /> Ngày
                </label>
              </div>
            </div>
            {state.ageType === 'years' ? (
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <input
                  type="number"
                  className="no-spinner"
                  placeholder="Năm"
                  value={state.ageYears}
                  onChange={(e) => state.setAgeYears(e.target.value)}
                  style={{
                    width: '100%', padding: '0.55rem 0.4rem', borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Năm</span>
                <input
                  type="number"
                  className="no-spinner"
                  placeholder="Tháng"
                  value={state.ageMonths}
                  onChange={(e) => state.setAgeMonths(e.target.value)}
                  style={{
                    width: '100%', padding: '0.55rem 0.4rem', borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Tháng</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <input
                  type="number"
                  className="no-spinner"
                  placeholder="Ngày"
                  value={state.ageDays}
                  onChange={(e) => state.setAgeDays(e.target.value)}
                  style={{
                    width: '100%', padding: '0.55rem 0.4rem', borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ngày</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Species, Weight, Gender */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>
              <span style={{ color: '#ef4444' }}>*</span> Loài:
            </label>
            <select
              value={state.species}
              onChange={(e) => {
                state.setSpecies(e.target.value);
                state.setBreed('');
              }}
              style={{
                padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
                border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="Chó">Chó</option>
              <option value="Mèo">Mèo</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>Cân nặng:</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                type="number"
                step="0.1"
                placeholder="Nhập cân nặng"
                value={state.weight}
                onChange={(e) => state.setWeight(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 2.25rem 0.55rem 0.75rem', borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none'
                }}
              />
              <span style={{
                position: 'absolute', right: '0.75rem', color: '#64748b',
                fontWeight: '600', fontSize: '0.75rem'
              }}>KG</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>Giới tính:</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', height: '100%', paddingLeft: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontWeight: '500' }}>
                <input
                  type="radio"
                  value="male"
                  checked={state.gender === 'male'}
                  onChange={() => state.setGender('male')}
                /> Đực
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontWeight: '500' }}>
                <input
                  type="radio"
                  value="female"
                  checked={state.gender === 'female'}
                  onChange={() => state.setGender('female')}
                /> Cái
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontWeight: '500' }}>
                <input
                  type="radio"
                  value="unknown"
                  checked={state.gender === 'unknown'}
                  onChange={() => state.setGender('unknown')}
                /> Khác
              </label>
            </div>
          </div>
        </div>

        {/* Row 4: Breed, Fur Color, Neutered */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>
              <span style={{ color: '#ef4444' }}>*</span> Giống:
            </label>
            <select
              value={primaryBreed}
              onChange={(e) => {
                const val = e.target.value;
                if (state.isCrossBreed) {
                  state.setBreed(val + (secondaryBreed ? ' lai ' + secondaryBreed : ''));
                } else {
                  state.setBreed(val);
                }
              }}
              style={{
                padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
                border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">--Chọn giống--</option>
              {breedsToShow.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {state.isCrossBreed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b' }}>lai với:</span>
                <select
                  value={secondaryBreed}
                  onChange={(e) => {
                    const sec = e.target.value;
                    state.setBreed(primaryBreed + (sec ? ' lai ' + sec : ''));
                  }}
                  style={{
                    padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">--Chọn giống lai--</option>
                  {breedsToShow.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>Màu lông:</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <select
                value={state.furColor}
                onChange={(e) => state.setFurColor(e.target.value)}
                style={{
                  flex: 1, padding: '0.55rem 0.5rem', borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="">--Chọn màu lông--</option>
                <option value="Trắng">Trắng</option>
                <option value="Đen">Đen</option>
                <option value="Vàng">Vàng</option>
                <option value="Nâu">Nâu</option>
                <option value="Xám">Xám</option>
                <option value="Tam thể">Tam thể</option>
                <option value="Nhị thể">Nhị thể</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const newColor = prompt('Nhập màu lông mới:');
                  if (newColor) state.setFurColor(newColor);
                }}
                style={{
                  padding: '0.55rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #10b981',
                  backgroundColor: 'white', color: '#10b981', fontWeight: '700', cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>Triệt sản:</label>
            <select
              value={state.neutered}
              onChange={(e) => state.setNeutered(e.target.value)}
              style={{
                padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
                border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">--Chọn--</option>
              <option value="Có">Có</option>
              <option value="Không">Không</option>
              <option value="Không rõ">Không rõ</option>
            </select>
          </div>
        </div>

        {/* Row 5: Cross breed, Habitat */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
            <label style={{
              position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={state.isCrossBreed}
                onChange={(e) => {
                  const checked = e.target.checked;
                  state.setIsCrossBreed(checked);
                  if (!checked) {
                    state.setBreed(primaryBreed);
                  }
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: state.isCrossBreed ? '#10b981' : '#cbd5e1',
                borderRadius: '34px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '16px', width: '16px',
                  left: state.isCrossBreed ? '20px' : '3px', bottom: '3px',
                  backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
            <span style={{ fontWeight: '700', color: '#475569' }}>Lai với ⇅</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontWeight: '700', color: '#475569' }}>Môi trường sống:</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <select
                value={state.habitat}
                onChange={(e) => state.setHabitat(e.target.value)}
                style={{
                  flex: 1, padding: '0.55rem 0.5rem', borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="">--Chọn môi trường sống--</option>
                <option value="Trong nhà">Trong nhà</option>
                <option value="Ngoài trời">Ngoài trời</option>
                <option value="Bán hoang dã">Bán hoang dã</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const newHab = prompt('Nhập môi trường sống mới:');
                  if (newHab) state.setHabitat(newHab);
                }}
                style={{
                  padding: '0.55rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #10b981',
                  backgroundColor: 'white', color: '#10b981', fontWeight: '700', cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Row 6: Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontWeight: '700', color: '#475569' }}>Ghi chú:</label>
          <textarea
            placeholder="Nhập ghi chú"
            value={state.notes}
            onChange={(e) => state.setNotes(e.target.value)}
            rows={2}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '0.375rem',
              border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>
      </div>
    );
  };

  const { data: searchResultsData } = useQuery({
    queryKey: ['searchCustomers', customerSearchQuery],
    queryFn: () => customersApi.searchCustomers(customerSearchQuery),
    enabled: customerSearchQuery.trim().length > 0,
  });
  const searchResults = searchResultsData?.data || [];

  const { data: customerPets = [] } = useQuery({
    queryKey: ['pets', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      const response = await api.get(`/pets/owner/${selectedCustomer.id}`);
      return response.data;
    },
    enabled: !!selectedCustomer?.id,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: inventoryApi.getProducts,
  });

  const { selectedBranchId } = useBranchContext();
  const branchId = (!selectedBranchId || selectedBranchId === 'undefined' || selectedBranchId === 'null') ? undefined : selectedBranchId;

  // Fetch Rooms with cages for admitting
  const { data: admitRooms = [] } = useQuery({
    queryKey: ['rooms', branchId],
    queryFn: () => getRooms(branchId),
    enabled: !!branchId && isAdmitPetModalOpen,
  });

  // Filter available cages for the selected room
  const availableCages = useMemo(() => {
    if (!selectedAdmitRoomId) return [];
    const room = admitRooms.find(r => r.id === selectedAdmitRoomId);
    if (!room) return [];
    return (room.cages || []).filter(c => c.status === CageStatus.AVAILABLE);
  }, [selectedAdmitRoomId, admitRooms]);

  // Set default room and cage when modal opens or rooms load
  React.useEffect(() => {
    if (isAdmitPetModalOpen && admitRooms.length > 0) {
      if (!selectedAdmitRoomId || !admitRooms.some(r => r.id === selectedAdmitRoomId)) {
        const firstRoom = admitRooms[0];
        setSelectedAdmitRoomId(firstRoom.id);
        
        const firstAvailableCage = (firstRoom.cages || []).find(c => c.status === CageStatus.AVAILABLE);
        if (firstAvailableCage) {
          setSelectedAdmitCageId(firstAvailableCage.id);
        } else {
          setSelectedAdmitCageId('');
        }
      }
    }
  }, [isAdmitPetModalOpen, admitRooms, selectedAdmitRoomId]);

  // Handle changing room selection
  const handleAdmitRoomChange = (roomId: string) => {
    setSelectedAdmitRoomId(roomId);
    const room = admitRooms.find(r => r.id === roomId);
    if (room) {
      const firstAvailableCage = (room.cages || []).find(c => c.status === CageStatus.AVAILABLE);
      if (firstAvailableCage) {
        setSelectedAdmitCageId(firstAvailableCage.id);
      } else {
        setSelectedAdmitCageId('');
      }
    } else {
      setSelectedAdmitCageId('');
    }
  };

  const admitPetMutation = useMutation({
    mutationFn: async ({ cageId, petId }: { cageId: string; petId: string }) => {
      return await updateCage(cageId, { petId, status: CageStatus.OCCUPIED });
    },
    onSuccess: () => {
      alert('Nhập chuồng lưu trú cho thú cưng thành công!');
      setIsAdmitPetModalOpen(false);
      setSelectedAdmitCageId('');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (err: any) => {
      alert(`Lỗi nhập chuồng: ${err.response?.data?.message || err.message || 'Không rõ nguyên nhân'}`);
    }
  });

  const handleAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmitCageId) {
      alert('Vui lòng chọn chuồng trống để nhập chuồng!');
      return;
    }
    admitPetMutation.mutate({ cageId: selectedAdmitCageId, petId: selectedPetId });
  };

  const { data: inventorySummary = [] } = useQuery({
    queryKey: ['inventorySummary', branchId],
    queryFn: () => inventoryApi.getInventorySummary(branchId),
  });

  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (Array.isArray(inventorySummary)) {
      inventorySummary.forEach((item: any) => {
        if (item.product && item.product.id) {
          map[item.product.id] = item.totalStock;
        }
      });
    }
    return map;
  }, [inventorySummary]);

  const { data: salesRank = {} } = useQuery({
    queryKey: ['salesRank', branchId],
    queryFn: () => getSalesRank(branchId),
    staleTime: 1000 * 60 * 5, // cache 5 minutes
  });

  // Fetch inventory batches for details view
  const { data: allBatches = [] } = useQuery({
    queryKey: ['inventoryBatches', branchId],
    queryFn: () => inventoryApi.getInventoryBatches(branchId),
    enabled: !!selectedProductForDetails,
  });

  const selectedProductBatches = useMemo(() => {
    if (!selectedProductForDetails) return [];
    return allBatches.filter((b: any) => b.productId === selectedProductForDetails.id && b.currentQuantity > 0);
  }, [allBatches, selectedProductForDetails]);

  const products = Array.isArray(productsData) ? productsData : [];

  // Sort: products with more sales go first, then alphabetically
  const sortedProducts = [...products].sort((a, b) => {
    const soldA = salesRank[a.id] || 0;
    const soldB = salesRank[b.id] || 0;
    if (soldB !== soldA) return soldB - soldA;
    return a.name.localeCompare(b.name, 'vi');
  });

  const filteredProducts = sortedProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.productCode && p.productCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const queryClient = useQueryClient();

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async (data) => {
      if (paidWallet > 0 && selectedCustomer) {
        try {
          await customersApi.topUpWallet(selectedCustomer.id, -paidWallet);
        } catch (err) {
          console.error("Lỗi khi khấu trừ số dư ví:", err);
          alert("Lỗi hệ thống: Không thể khấu trừ số dư ví của khách hàng!");
        }
      }

      const credited = (data as any).walletCreditAmount;
      if (data.status === 'DRAFT') {
        alert(`Lưu đơn nháp thành công! Mã đơn: ${data.orderCode}`);
      } else if (credited && credited > 0 && selectedCustomer) {
        alert(`Thanh toán thành công! Mã đơn: ${data.orderCode}\n✅ Đã góp ${formatCurrency(credited)} tiền thừa vào ví của ${selectedCustomer.fullName}`);
      } else {
        alert(`Thanh toán thành công! Mã đơn: ${data.orderCode}`);
      }
      setCart([]);
      setDiscount(0);
      setTax(0);
      setPaidCash(0);
      setPaidCard(0);
      setPaidTransfer(0);
      setPaidWallet(0);
      setSelectedCustomer(null);
      setSelectedPetId('');
      setCreditChangeToWallet(false);
      setOrderTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          return {
            ...t,
            cart: [],
            discount: 0,
            tax: 0,
            paidCash: 0,
            paidCard: 0,
            paidTransfer: 0,
            paidWallet: 0,
            selectedCustomer: null,
            selectedPetId: ''
          };
        }
        return t;
      }));
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const newCustomer = await customersApi.createCustomer(customerData);
      if (quickCustomerPets.length > 0) {
        await Promise.all(
          quickCustomerPets.map(pet => 
            api.post('/pets', {
              ...pet,
              ownerId: newCustomer.id,
              branchId: branchId
            })
          )
        );
      }
      return newCustomer;
    },
    onSuccess: (newCustomer) => {
      setSelectedCustomer(newCustomer);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pets', newCustomer.id] });
      if (quickCustomerPets.length > 0) {
        alert(`Đăng ký khách hàng ${newCustomer.fullName} và ${quickCustomerPets.length} thú cưng thành công!`);
      } else {
        alert(`Đăng ký khách hàng mới thành công: ${newCustomer.fullName}`);
      }
      setQuickCustomerName('');
      setQuickCustomerPhone('');
      setQuickCustomerAddress('');
      setQuickCustomerEmail('');
      setQuickCustomerPets([]);
      setActiveCustomerModalTab('customer');
      setShowQuickCustomerModal(false);
    },
    onError: (error: any) => {
      alert(`Lỗi khi tạo khách hàng mới: ${error?.response?.data?.message || error?.message || 'Có lỗi xảy ra'}`);
    }
  });

  const createPetMutation = useMutation({
    mutationFn: async (petData: any) => {
      const response = await api.post('/pets', petData);
      return response.data;
    },
    onSuccess: (newPet) => {
      queryClient.invalidateQueries({ queryKey: ['pets', selectedCustomer?.id] });
      setSelectedPetId(newPet.id);
      alert(`Đã thêm mới thú cưng thành công: ${newPet.name}`);
      setQuickPetName('');
      setQuickPetBreed('');
      setQuickPetWeight('');
      setQuickPetGender('unknown');
      setQuickPetNotes('');
      setQuickPetBarcode('');
      setQuickPetAgeType('years');
      setQuickPetAgeYears('');
      setQuickPetAgeMonths('');
      setQuickPetAgeDays('');
      setQuickPetFurColor('');
      setQuickPetNeutered('');
      setQuickPetIsCrossBreed(false);
      setQuickPetHabitat('');
      setQuickPetAvatarUrl('');
      setShowQuickPetModal(false);
    },
    onError: (error: any) => {
      alert(`Lỗi khi thêm mới thú cưng: ${error?.response?.data?.message || error?.message || 'Có lỗi xảy ra'}`);
    }
  });



  const addToCart = (product: Product) => {
    const availableStock = stockMap[product.id] || 0;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= availableStock) {
          alert(`Không thể thêm! Số lượng trong giỏ hàng (${existing.cartQuantity}) đã đạt tối đa tồn kho khả dụng (${availableStock})`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      if (availableStock <= 0) {
        if (!window.confirm(`Sản phẩm này hiện đang HẾT HÀNG (Tồn: 0). Bạn có chắc chắn muốn bán tiếp?`)) {
          return prev;
        }
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const availableStock = stockMap[id] || 0;
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        if (delta > 0 && item.cartQuantity >= availableStock) {
          alert(`Không thể tăng! Số lượng trong giỏ hàng (${item.cartQuantity}) đã đạt tối đa tồn kho khả dụng (${availableStock})`);
          return item;
        }
        const newQty = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.basePrice || 0) * item.cartQuantity, 0);
  }, [cart]);

  const totalAmountAfterDiscount = Math.max(0, subTotal + tax - discount);
  const totalPaid = paidCash + paidCard + paidTransfer + paidWallet;
  const changeAmount = Math.max(0, totalPaid - totalAmountAfterDiscount);

  // Khống chế số tiền trừ ví không vượt quá số dư ví hoặc phần còn lại cần thanh toán
  const remainingForWallet = Math.max(0, totalAmountAfterDiscount - (paidCash + paidCard + paidTransfer));
  const maxPossibleWallet = selectedCustomer ? Math.min(Number(selectedCustomer.walletBalance) || 0, remainingForWallet) : 0;
  
  React.useEffect(() => {
    if (paidWallet > maxPossibleWallet) {
      setPaidWallet(maxPossibleWallet);
    }
  }, [paidWallet, maxPossibleWallet]);

  // QR Bank account configurations retrieved from localStorage
  const savedQrBank = localStorage.getItem('qr_bank') || 'MB';
  const savedQrAccount = localStorage.getItem('qr_account') || '';
  const savedQrName = localStorage.getItem('qr_name') || '';
  const savedQrMemo = localStorage.getItem('qr_memo') || 'PKCare Thanh Toan';

  const handleCheckout = (status: 'DRAFT' | 'COMPLETED' = 'COMPLETED') => {
    if (cart.length === 0) return;

    const branchId = localStorage.getItem('selectedBranchId');
    if (!branchId) {
      alert('Vui lòng chọn chi nhánh trước khi tạo đơn hàng.\n(Đăng xuất và đăng nhập lại để chọn chi nhánh)');
      return;
    }
    
    let resolvedMethod: 'CASH' | 'CARD' | 'TRANSFER' = 'CASH';
    if (paidTransfer > paidCash && paidTransfer > paidCard) {
      resolvedMethod = 'TRANSFER';
    } else if (paidCard > paidCash && paidCard > paidTransfer) {
      resolvedMethod = 'CARD';
    }

    orderMutation.mutate({
      items: cart.map(item => ({
        productId: item.id,
        quantity: Number(item.cartQuantity),
        unitPrice: Number(item.basePrice) || 0
      })),
      discount: Number(discount) || 0,
      paymentMethod: resolvedMethod,
      customerId: selectedCustomer?.id || undefined,
      petId: selectedPetId || undefined,
      status,
      notes: paidWallet > 0 ? `Khấu trừ từ ví: ${formatCurrency(paidWallet)}` : '',
      walletCreditAmount: (creditChangeToWallet && selectedCustomer && changeAmount > 0)
        ? changeAmount
        : 0
    });
  };

  const handleShowQR = () => {
    setShowQRModal(true);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : 'calc(100vh - 110px)', 
      minHeight: '100%',
      backgroundColor: 'var(--background)', 
      gap: isMobile ? '1rem' : '1.5rem', 
      padding: isMobile ? '1rem' : '1.5rem' 
    }}>
      
      {/* Left side: Products catalog and Cart List */}
      <div style={{ 
        flex: isMobile ? 'none' : '2.2', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem', 
        overflow: isMobile ? 'visible' : 'hidden',
        height: '100%'
      }}>
        
        {/* Order Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.6rem',
          overflowX: 'auto',
          scrollbarWidth: 'none', // hide scrollbar for clean design
          msOverflowStyle: 'none'
        }}>
          {orderTabs.map(t => {
            const isActive = t.id === activeTabId;
            const itemCount = isActive ? cart.length : t.cart.length;
            const customerName = isActive 
              ? (selectedCustomer ? selectedCustomer.fullName : null)
              : (t.selectedCustomer ? t.selectedCustomer.fullName : null);

            return (
              <div
                key={t.id}
                onClick={() => switchTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: isActive ? '1.5px solid #2563eb' : '1px solid var(--border)',
                  backgroundColor: isActive ? '#eff6ff' : 'white',
                  color: isActive ? '#1e40af' : '#64748b',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 1px 3px 0 rgba(37, 99, 235, 0.1)' : 'none',
                }}
              >
                <span>🛒 {t.name}</span>
                {itemCount > 0 && (
                  <span style={{
                    backgroundColor: isActive ? '#2563eb' : '#cbd5e1',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '999px',
                    fontWeight: '700'
                  }}>
                    {itemCount}
                  </span>
                )}
                {customerName && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: isActive ? '#2563eb' : '#94a3b8',
                    maxWidth: '85px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 'normal'
                  }}>
                    - {customerName}
                  </span>
                )}
                {/* Close/Reset Button */}
                <button
                  type="button"
                  onClick={(e) => closeTab(t.id, e)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isActive ? '#2563eb' : '#94a3b8',
                    cursor: 'pointer',
                    padding: '0.1rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '0.2rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          
          {/* Add New Tab Button */}
          <button
            type="button"
            onClick={addNewTab}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.4rem 0.6rem',
              borderRadius: '0.5rem',
              border: '1px dashed #cbd5e1',
              backgroundColor: 'white',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.color = '#2563eb';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.backgroundColor = 'white';
            }}
            title="Tạo hóa đơn mới"
          >
            <Plus size={16} style={{ marginRight: '0.2rem' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Thêm đơn</span>
          </button>
        </div>

        {/* Container for Products and Cart side-by-side */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1.25rem',
          overflow: isMobile ? 'visible' : 'hidden',
          minHeight: 0
        }}>
          {/* Left/Top: Products grid */}
          <div style={{ 
            flex: isMobile ? 'none' : '1.3', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            minHeight: '260px',
            overflow: isMobile ? 'visible' : 'hidden',
            height: isMobile ? 'auto' : '100%'
          }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '0.5rem' : '0' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--foreground)' }}>Danh sách sản phẩm</h1>
              <div style={{ position: 'relative', width: isMobile ? '100%' : '300px' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem 1rem 0.5rem 2.3rem',
                    borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', alignContent: 'start', paddingBottom: '1rem' }}>
              {isLoading ? (
                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Đang tải sản phẩm...</p>
              ) : filteredProducts.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Không tìm thấy sản phẩm nào.</p>
              ) : (
                filteredProducts.map((product, index) => {
                  const soldCount = salesRank[product.id] || 0;
                  const isHot = soldCount > 0 && index < 3; // top 3 bestsellers
                  return (
                    <div 
                      key={product.id} 
                      onClick={() => addToCart(product)}
                      style={{
                        backgroundColor: 'var(--card)', 
                        border: isHot ? '1.5px solid #f97316' : '1px solid var(--border)', 
                        borderRadius: 'var(--radius)',
                        padding: '0.75rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        transition: 'transform 0.1s, box-shadow 0.1s', userSelect: 'none',
                        position: 'relative'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {/* Bestseller badge */}
                      {isHot && (
                        <div style={{
                          position: 'absolute', top: '-8px', right: '8px',
                          backgroundColor: '#f97316', color: 'white',
                          fontSize: '0.65rem', fontWeight: '700',
                          padding: '0.1rem 0.4rem', borderRadius: '999px',
                          display: 'flex', alignItems: 'center', gap: '0.2rem',
                          boxShadow: '0 2px 6px rgba(249,115,22,0.4)'
                        }}>
                          🔥 Bán chạy
                        </div>
                      )}
                      <div style={{ height: '80px', backgroundColor: '#f8fafc', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justify: 'center', overflow: 'hidden', position: 'relative', border: '1px solid #f1f5f9' }}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ShoppingCart size={24} style={{ color: '#94a3b8', opacity: 0.5 }} />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForDetails(product);
                          }}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                            zIndex: 5,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                            e.currentTarget.style.color = '#2563eb';
                          }}
                          title="Xem chi tiết sản phẩm"
                        >
                          <Info size={14} />
                        </button>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--foreground)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem', lineHeight: '1.2rem' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{product.productCode || 'N/A'}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          color: (stockMap[product.id] || 0) > 0 ? '#10b981' : '#ef4444'
                        }}>
                          Tồn: {stockMap[product.id] || 0}
                        </span>
                      </div>
                      {soldCount > 0 && (
                        <div style={{ fontSize: '0.65rem', color: '#f97316', fontWeight: '600', textAlign: 'right', marginTop: '-0.2rem' }}>
                          Đã bán: {soldCount}
                        </div>
                      )}
                      <div style={{ fontWeight: '700', color: 'var(--primary)', marginTop: 'auto', paddingTop: '0.25rem', fontSize: '0.9rem' }}>
                        {formatCurrency(product.basePrice || 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Vertical/Horizontal divider line */}
          <div style={{ 
            borderLeft: isMobile ? 'none' : '2px solid var(--border)', 
            borderTop: isMobile ? '2px solid var(--border)' : 'none',
            margin: isMobile ? '0.15rem 0' : '0 0.15rem' 
          }}></div>

          {/* Right/Bottom: Purchased Items List (Cart) */}
          <div style={{ 
            flex: isMobile ? 'none' : '1', 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'var(--card)', 
            borderRadius: 'var(--radius)', 
            border: '1px solid var(--border)', 
            overflow: isMobile ? 'visible' : 'hidden', 
            boxShadow: 'var(--shadow)',
            height: isMobile ? 'auto' : '100%'
          }}>
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart style={{ color: 'var(--primary)' }} size={18} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--foreground)' }}>Danh sách hàng mua</h2>
              {cart.length > 0 && (
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.1rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', marginLeft: 'auto', fontWeight: '600' }}>
                  {cart.length}
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column' }}>
              {cart.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '0.75rem', minHeight: '120px' }}>
                  <ShoppingCart size={36} style={{ opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem' }}>Chưa chọn mặt hàng nào</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>
                      <th style={{ padding: '0.5rem 0.4rem' }}>Tên sản phẩm</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>Giá</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>Tổng</th>
                      <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                        <td style={{ padding: '0.5rem 0.4rem' }}>
                          <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span>{item.productCode || 'N/A'}</span>
                            <span style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: '600', 
                              color: (stockMap[item.id] || 0) > 0 ? '#10b981' : '#ef4444' 
                            }}>
                              (Tồn: {stockMap[item.id] || 0})
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>
                          {formatCurrency(item.basePrice || 0)}
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', border: '1px solid var(--border)', borderRadius: '0.4rem', padding: '0.1rem' }}>
                            <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '0.1rem', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' }}><Minus size={10}/></button>
                            <span style={{ minWidth: '1rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: '600' }}>{item.cartQuantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: '0.1rem', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' }}><Plus size={10}/></button>
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          {formatCurrency((item.basePrice || 0) * item.cartQuantity)}
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ padding: '0.15rem', backgroundColor: 'transparent', border: 'none', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.1rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                            <Trash2 size={11}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Right side: Customer and Payment details */}
      <div style={{ 
        flex: isMobile ? 'none' : '1', 
        minWidth: isMobile ? '100%' : '350px', 
        maxWidth: isMobile ? '100%' : '400px', 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: 'var(--card)', 
        borderRadius: 'var(--radius)', 
        border: '1px solid var(--border)', 
        overflow: isMobile ? 'visible' : 'hidden', 
        boxShadow: 'var(--shadow)',
        height: '100%'
      }}>
        
        {/* Customer Selection Section */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--foreground)', marginBottom: '0.1rem' }}>Thông tin khách hàng</h3>
          
          {!selectedCustomer && !isSearchingCustomer ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Khách lẻ</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  onClick={() => setIsSearchingCustomer(true)}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: 'var(--primary)', 
                    backgroundColor: 'white', 
                    border: '1px solid var(--primary)', 
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer' 
                  }}
                >
                  Chọn khách hàng
                </button>
                <button 
                  onClick={() => setShowQuickCustomerModal(true)}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#8b5cf6', 
                    backgroundColor: 'white', 
                    border: '1px solid #8b5cf6', 
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <Plus size={12} /> Tạo nhanh
                </button>
              </div>
            </div>
          ) : isSearchingCustomer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={14} />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc SĐT..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem 0.4rem 2rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                </div>
                <button 
                  onClick={() => {
                    setIsSearchingCustomer(false);
                    setCustomerSearchQuery('');
                  }}
                  style={{
                    padding: '0.4rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search Results Dropdown */}
              {customerSearchQuery.trim().length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 20,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: '1rem 0.75rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Không tìm thấy khách hàng</span>
                      <button
                        onClick={() => {
                          setQuickCustomerName(customerSearchQuery);
                          setIsSearchingCustomer(false);
                          setCustomerSearchQuery('');
                          setShowQuickCustomerModal(true);
                        }}
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        <Plus size={11} /> Tạo nhanh "{customerSearchQuery}"
                      </button>
                    </div>
                  ) : (
                    searchResults.map((customer: any) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsSearchingCustomer(false);
                          setCustomerSearchQuery('');
                        }}
                        style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: '600' }}>{customer.fullName}</span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '0.2rem',
                            backgroundColor: customer.customerType === 'Khách VIP' ? '#fef3c7' : 
                                             customer.customerType === 'Khách sỉ' ? '#dcfce7' : 
                                             customer.customerType === 'Đại lý' ? '#e0f2fe' : 
                                             customer.customerType === 'Đối tác' ? '#f3e8ff' : '#f1f5f9',
                            color: customer.customerType === 'Khách VIP' ? '#d97706' : 
                                   customer.customerType === 'Khách sỉ' ? '#166534' : 
                                   customer.customerType === 'Đại lý' ? '#0369a1' : 
                                   customer.customerType === 'Đối tác' ? '#6b21a8' : '#475569'
                          }}>
                            {customer.customerType || 'Khách lẻ'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SĐT: {customer.phone || 'N/A'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--foreground)' }}>{selectedCustomer?.fullName}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      padding: '0.1rem 0.3rem',
                      borderRadius: '0.2rem',
                      backgroundColor: selectedCustomer?.customerType === 'Khách VIP' ? '#fef3c7' : 
                                       selectedCustomer?.customerType === 'Khách sỉ' ? '#dcfce7' : 
                                       selectedCustomer?.customerType === 'Đại lý' ? '#e0f2fe' : 
                                       selectedCustomer?.customerType === 'Đối tác' ? '#f3e8ff' : '#f1f5f9',
                      color: selectedCustomer?.customerType === 'Khách VIP' ? '#d97706' : 
                             selectedCustomer?.customerType === 'Khách sỉ' ? '#166534' : 
                             selectedCustomer?.customerType === 'Đại lý' ? '#0369a1' : 
                             selectedCustomer?.customerType === 'Đối tác' ? '#6b21a8' : '#475569'
                    }}>
                      {selectedCustomer?.customerType || 'Khách lẻ'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SĐT: {selectedCustomer?.phone || 'N/A'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                    <Wallet size={12} color="#8b5cf6" />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8b5cf6' }}>
                      Số dư ví: {formatCurrency(Number(selectedCustomer?.walletBalance) || 0)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedPetId('');
                  }}
                  style={{
                    padding: '0.2rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  Khách lẻ
                </button>
              </div>

              {/* Pet Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Thú cưng:</span>
                  <select
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      outline: 'none',
                      backgroundColor: 'white',
                      minWidth: 0
                    }}
                  >
                    <option value="">
                      {customerPets.length === 0 ? '-- Chưa có thú cưng --' : '-- Chọn thú cưng --'}
                    </option>
                    {customerPets.map((pet: any) => (
                      <option key={pet.id} value={pet.id}>{pet.name} ({pet.species || 'Chó/Mèo'})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickPetModal(true)}
                    style={{
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: '#8b5cf6',
                      backgroundColor: 'white',
                      border: '1px solid #8b5cf6',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.15rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={11} /> Thêm mới
                  </button>
                </div>

                {selectedPetId && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsAdmitPetModalOpen(true)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: 'white',
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                    >
                      <Home size={11} /> Nhập chuồng
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPetDetailsModalOpen(true)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: 'white',
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    >
                      <Info size={11} /> Chi tiết thú cưng
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Premium Payment Details Panel */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Tiền thuế <span title="Thuế giá trị gia tăng"><Info size={13} style={{ color: '#94a3b8', cursor: 'pointer' }} /></span>
            </span>
            <MoneyInput
              value={tax}
              onChange={setTax}
              style={{ width: '90px', padding: '0.15rem 0.35rem', border: '1px solid var(--border)', borderRadius: '0.25rem', outline: 'none', backgroundColor: 'transparent', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
            <span>Tổng tiền hàng ({cart.length})</span>
            <span style={{ fontWeight: '600', color: 'var(--foreground)' }}>{formatCurrency(subTotal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Giảm giá</span>
            <MoneyInput
              value={discount}
              onChange={setDiscount}
              style={{ width: '110px', padding: '0.2rem 0.4rem', border: '1px solid var(--border)', borderRadius: '0.25rem', outline: 'none', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ borderTop: '1px dashed var(--border)', margin: '0.25rem 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
            <span>Tổng tiền sau giảm</span>
            <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{formatCurrency(totalAmountAfterDiscount)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.05rem', color: '#22c55e' }}>
            <span>Cần trả khách</span>
            <span>{formatCurrency(totalAmountAfterDiscount)}</span>
          </div>

          {/* Paid fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.25rem 0' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>Khách trả</span>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                <Banknote size={15} color="#22c55e" />
                <span>Tiền mặt</span>
              </div>
              <MoneyInput
                value={paidCash}
                onChange={setPaidCash}
                style={{ width: '120px', padding: '0.2rem 0.4rem', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', backgroundColor: 'transparent', fontWeight: '600', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                <CreditCard size={15} color="#ec4899" />
                <span>Thẻ</span>
              </div>
              <MoneyInput
                value={paidCard}
                onChange={setPaidCard}
                style={{ width: '120px', padding: '0.2rem 0.4rem', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', backgroundColor: 'transparent', fontWeight: '600', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                <Building size={15} color="#3b82f6" />
                <span>Chuyển khoản</span>
              </div>
              <MoneyInput
                value={paidTransfer}
                onChange={setPaidTransfer}
                style={{ width: '120px', padding: '0.2rem 0.4rem', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', backgroundColor: 'transparent', fontWeight: '600', fontSize: '0.85rem' }}
              />
            </div>

            {selectedCustomer && (Number(selectedCustomer.walletBalance) > 0 || paidWallet > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#8b5cf6' }}>
                  <Wallet size={15} color="#8b5cf6" />
                  <span>Trừ từ ví (Dư: {formatCurrency(Number(selectedCustomer.walletBalance) || 0)})</span>
                </div>
                <MoneyInput
                  value={paidWallet}
                  onChange={(val) => {
                    const remaining = totalAmountAfterDiscount - (paidCash + paidCard + paidTransfer);
                    const maxPay = Math.max(0, Math.min(Number(selectedCustomer.walletBalance) || 0, remaining));
                    setPaidWallet(Math.min(val, maxPay));
                  }}
                  style={{ width: '120px', padding: '0.2rem 0.4rem', border: 'none', borderBottom: '1px solid #8b5cf6', outline: 'none', backgroundColor: 'transparent', fontWeight: '600', fontSize: '0.85rem', color: '#8b5cf6' }}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleShowQR}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              width: '100%',
              padding: '0.4rem',
              border: '1px solid #10b981',
              color: '#10b981',
              backgroundColor: 'white',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
          >
            <QrCode size={14} /> Hiển thị QR thanh toán
          </button>

          <div style={{ 
            backgroundColor: changeAmount > 0 ? 'rgba(34, 197, 94, 0.05)' : 'transparent', 
            border: changeAmount > 0 ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent', 
            borderRadius: 'var(--radius)', 
            padding: changeAmount > 0 ? '0.6rem 0.75rem' : '0rem', 
            transition: 'all 0.3s' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>Tiền thừa</span>
              </span>
              <span style={{ fontWeight: '700', color: changeAmount > 0 ? '#22c55e' : 'var(--foreground)', fontSize: changeAmount > 0 ? '1rem' : '0.85rem' }}>
                {formatCurrency(changeAmount)}
              </span>
            </div>

            {/* Checkbox to credit change to wallet — shown when there's change */}
            {changeAmount > 0 && (
              selectedCustomer ? (
                <label style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  marginTop: '0.5rem', cursor: 'pointer',
                  padding: '0.4rem 0.5rem',
                  backgroundColor: creditChangeToWallet ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.03)',
                  border: `1px solid ${creditChangeToWallet ? '#8b5cf6' : 'rgba(139, 92, 246, 0.2)'}`,
                  borderRadius: '0.4rem',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={creditChangeToWallet}
                    onChange={(e) => setCreditChangeToWallet(e.target.checked)}
                    style={{ accentColor: '#8b5cf6', width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Wallet size={12} /> Góp {formatCurrency(changeAmount)} vào ví của {selectedCustomer.fullName}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Số dư hiện tại: {formatCurrency(Number(selectedCustomer.walletBalance) || 0)}
                    </span>
                  </div>
                </label>
              ) : (
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  marginTop: '0.5rem',
                  padding: '0.4rem 0.5rem',
                  backgroundColor: 'rgba(241, 245, 249, 0.6)',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '0.4rem',
                }}>
                  <input
                    type="checkbox"
                    disabled
                    checked={false}
                    style={{ width: '14px', height: '14px', cursor: 'not-allowed' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Wallet size={12} /> Góp tiền thừa vào ví khách hàng
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: '500' }}>
                      ⚠ Chọn khách hàng cụ thể để sử dụng chức năng nạp ví.
                    </span>
                  </div>
                </div>
              )
            )}
          </div>


          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showProductPrice}
                onChange={(e) => setShowProductPrice(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              Hiện giá từng sản phẩm
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showTreatmentName}
                onChange={(e) => setShowTreatmentName(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              Hiện tên thuốc điều trị
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
            <button 
              className="btn-secondary" 
              style={{ 
                flex: 1, 
                padding: '0.7rem', 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                border: '1px solid var(--primary)', 
                color: 'var(--primary)', 
                backgroundColor: 'white', 
                borderRadius: 'var(--radius)',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                opacity: cart.length === 0 ? 0.5 : 1
              }}
              disabled={cart.length === 0 || orderMutation.isPending}
              onClick={() => handleCheckout('DRAFT')}
            >
              LƯU NHÁP
            </button>
            <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {totalPaid === 0 && cart.length > 0 && (
                <div style={{ 
                  fontSize: '0.65rem', color: '#ef4444', textAlign: 'center', 
                  fontWeight: '600', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', gap: '0.2rem' 
                }}>
                  ⚠ Chưa nhập tiền khách trả
                </div>
              )}
              <button 
                className="btn-primary" 
                style={{ 
                  width: '100%',
                  padding: '0.7rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  cursor: (cart.length === 0 || totalPaid === 0) ? 'not-allowed' : 'pointer',
                  opacity: (cart.length === 0 || totalPaid === 0) ? 0.45 : 1,
                  transition: 'opacity 0.2s'
                }}
                disabled={cart.length === 0 || totalPaid === 0 || orderMutation.isPending}
                onClick={() => handleCheckout('COMPLETED')}
              >
                {orderMutation.isPending ? 'Đang xử lý...' : 'THANH TOÁN'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* QR Modal */}
      {showQRModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowQRModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem', color: '#1e293b' }}>Quét Mã QR Thanh Toán</h3>
            
            {savedQrAccount ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                <div style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)', 
                  padding: '0.75rem', 
                  backgroundColor: 'white',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                  <img 
                    src={`https://img.vietqr.io/image/${savedQrBank}-${savedQrAccount.trim()}-compact2.png?amount=${totalAmountAfterDiscount}&addInfo=${encodeURIComponent(savedQrMemo)}&accountName=${encodeURIComponent(savedQrName.trim().toUpperCase())}`} 
                    alt="Payment QR" 
                    style={{ width: '200px', height: '200px', display: 'block' }}
                  />
                </div>
                
                <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tài khoản nhận tiền:</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginTop: '0.1rem' }}>
                    {savedQrBank} - {savedQrAccount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', marginTop: '0.05rem' }}>
                    {savedQrName}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                <div style={{ 
                  border: '1px dashed #ef4444', 
                  borderRadius: 'var(--radius)', 
                  padding: '1rem', 
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#ef4444',
                  textAlign: 'center'
                }}>
                  <AlertCircle size={32} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Chưa cấu hình tài khoản nhận tiền!</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Hệ thống đang hiển thị QR mặc định. Vui lòng vào <strong>Hệ thống &gt; Cài đặt &gt; Cấu hình QR</strong> để cài đặt ngân hàng của phòng khám.
                  </span>
                </div>
                
                <div style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)', 
                  padding: '0.75rem', 
                  backgroundColor: 'white',
                  opacity: 0.5
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://vietqr.me/pay?amount=${totalAmountAfterDiscount}%26desc=PKCare%2520Thanh%2520Toan`} 
                    alt="Fallback QR" 
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
              </div>
            )}
            
            <p style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', margin: '1rem 0' }}>
              Quét mã chuyển khoản chính xác số tiền <br/>
              <strong style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>{formatCurrency(totalAmountAfterDiscount)}</strong>
            </p>
            
            <button 
              className="btn-primary" 
              style={{ width: '100%' }}
              onClick={() => {
                setShowQRModal(false);
                setPaidTransfer(totalAmountAfterDiscount);
              }}
            >
              Đã Thanh Toán Thành Công
            </button>
          </div>
        </div>
      )}

      {/* Quick Create Customer Modal */}
      {showQuickCustomerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '580px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex',
            flexDirection: 'column', position: 'relative', border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Close Button */}
            <button 
              onClick={() => {
                setShowQuickCustomerModal(false);
                setQuickCustomerPets([]);
                setActiveCustomerModalTab('customer');
              }}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                backgroundColor: 'transparent', border: 'none', color: '#94a3b8',
                cursor: 'pointer', transition: 'color 0.2s', zIndex: 10
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#475569'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={20} />
            </button>

            {/* Custom Tab Header precisely matching the user's requested layout */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '0.25rem',
              padding: '1.25rem 1.5rem 0.75rem', backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'inline-flex', padding: '0.25rem', backgroundColor: '#e2e8f0',
                borderRadius: '0.5rem', gap: '0.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveCustomerModalTab('customer')}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '0.375rem', fontSize: '0.85rem',
                    fontWeight: '600', border: 'none', cursor: 'pointer',
                    backgroundColor: activeCustomerModalTab === 'customer' ? 'white' : 'transparent',
                    color: activeCustomerModalTab === 'customer' ? '#1e293b' : '#64748b',
                    boxShadow: activeCustomerModalTab === 'customer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Khách hàng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickCustomerName.trim() || !quickCustomerPhone.trim()) {
                      alert('Vui lòng điền thông tin Họ tên và Số điện thoại khách hàng trước!');
                      return;
                    }
                    setActiveCustomerModalTab('pets');
                  }}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '0.375rem', fontSize: '0.85rem',
                    fontWeight: '600', border: 'none', cursor: 'pointer',
                    backgroundColor: activeCustomerModalTab === 'pets' ? 'white' : 'transparent',
                    color: activeCustomerModalTab === 'pets' ? '#1e293b' : '#64748b',
                    boxShadow: activeCustomerModalTab === 'pets' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Thú cưng {quickCustomerPets.length > 0 && `(${quickCustomerPets.length})`}
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {activeCustomerModalTab === 'customer' ? (
                /* Tab 1: Customer Form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: '0.4rem', borderRadius: '0.5rem', color: '#8b5cf6' }}>
                      <User size={18} />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>Thông tin khách hàng</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569' }}>Họ và tên khách hàng *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={quickCustomerName}
                      onChange={(e) => setQuickCustomerName(e.target.value)}
                      style={{
                        padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                        fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569' }}>Số điện thoại *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 0987654321"
                      value={quickCustomerPhone}
                      onChange={(e) => setQuickCustomerPhone(e.target.value)}
                      style={{
                        padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                        fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569' }}>Địa chỉ (Tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="Địa chỉ liên hệ"
                      value={quickCustomerAddress}
                      onChange={(e) => setQuickCustomerAddress(e.target.value)}
                      style={{
                        padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                        fontSize: '0.85rem', outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569' }}>Email (Tùy chọn)</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={quickCustomerEmail}
                      onChange={(e) => setQuickCustomerEmail(e.target.value)}
                      style={{
                        padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                        fontSize: '0.85rem', outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!quickCustomerName.trim() || !quickCustomerPhone.trim()) {
                          alert('Vui lòng điền Họ tên và Số điện thoại khách hàng!');
                          return;
                        }
                        setActiveCustomerModalTab('pets');
                      }}
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: 'none',
                        backgroundColor: '#8b5cf6', color: 'white', fontSize: '0.85rem',
                        fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                    >
                      Tiếp theo: Thêm thú cưng <Plus size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab 2: Pets Sub-Form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* List of currently added pets */}
                  {quickCustomerPets.length > 0 && (
                    <div style={{
                      backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '0.75rem',
                      display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px dashed #cbd5e1'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>
                        Danh sách thú cưng sẽ được tạo ({quickCustomerPets.length}):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {quickCustomerPets.map((p, idx) => (
                          <div key={idx} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            backgroundColor: 'white', border: '1px solid #cbd5e1',
                            borderRadius: '2rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem',
                            fontWeight: '600', color: '#1e293b'
                          }}>
                            <span>🐶 {p.name} ({p.species})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickCustomerPets(prev => prev.filter((_, i) => i !== idx));
                              }}
                              style={{
                                border: 'none', backgroundColor: 'transparent', color: '#ef4444',
                                cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center'
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Pet Sub-Form */}
                  <div style={{
                    border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem',
                    backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                      Nhập thông tin thú cưng
                    </span>

                    {renderPetFormFields({
                      name: tempPetName, setName: setTempPetName,
                      species: tempPetSpecies, setSpecies: setTempPetSpecies,
                      breed: tempPetBreed, setBreed: setTempPetBreed,
                      weight: tempPetWeight, setWeight: setTempPetWeight,
                      gender: tempPetGender, setGender: setTempPetGender,
                      notes: tempPetNotes, setNotes: setTempPetNotes,
                      barcode: tempPetBarcode, setBarcode: setTempPetBarcode,
                      ageType: tempPetAgeType, setAgeType: setTempPetAgeType,
                      ageYears: tempPetAgeYears, setAgeYears: setTempPetAgeYears,
                      ageMonths: tempPetAgeMonths, setAgeMonths: setTempPetAgeMonths,
                      ageDays: tempPetAgeDays, setAgeDays: setTempPetAgeDays,
                      furColor: tempPetFurColor, setFurColor: setTempPetFurColor,
                      neutered: tempPetNeutered, setNeutered: setTempPetNeutered,
                      isCrossBreed: tempPetIsCrossBreed, setIsCrossBreed: setTempPetIsCrossBreed,
                      habitat: tempPetHabitat, setHabitat: setTempPetHabitat,
                      avatarUrl: tempPetAvatarUrl, setAvatarUrl: setTempPetAvatarUrl,
                    }, true)}

                    <button
                      type="button"
                      onClick={() => {
                        if (!tempPetName.trim()) {
                          alert('Vui lòng nhập tên thú cưng!');
                          return;
                        }
                        const newPetObj = {
                          name: tempPetName.trim(),
                          species: tempPetSpecies,
                          breed: tempPetBreed.trim() || undefined,
                          weight: tempPetWeight ? Number(tempPetWeight) : undefined,
                          gender: tempPetGender,
                          notes: tempPetNotes.trim() || undefined,
                          barcode: tempPetBarcode.trim() || undefined,
                          ageType: tempPetAgeType,
                          ageYears: tempPetAgeYears ? Number(tempPetAgeYears) : undefined,
                          ageMonths: tempPetAgeMonths ? Number(tempPetAgeMonths) : undefined,
                          ageDays: tempPetAgeDays ? Number(tempPetAgeDays) : undefined,
                          furColor: tempPetFurColor.trim() || undefined,
                          neutered: tempPetNeutered || undefined,
                          isCrossBreed: tempPetIsCrossBreed,
                          habitat: tempPetHabitat.trim() || undefined,
                          avatarUrl: tempPetAvatarUrl.trim() || undefined
                        };
                        setQuickCustomerPets(prev => [...prev, newPetObj]);
                        
                        // Clear all subform states
                        setTempPetName('');
                        setTempPetBreed('');
                        setTempPetWeight('');
                        setTempPetGender('male');
                        setTempPetNotes('');
                        setTempPetBarcode('');
                        setTempPetAgeType('years');
                        setTempPetAgeYears('');
                        setTempPetAgeMonths('');
                        setTempPetAgeDays('');
                        setTempPetFurColor('');
                        setTempPetNeutered('');
                        setTempPetIsCrossBreed(false);
                        setTempPetHabitat('');
                        setTempPetAvatarUrl('');
                      }}
                      style={{
                        padding: '0.45rem', borderRadius: '0.375rem', border: '1px solid #8b5cf6',
                        backgroundColor: 'white', color: '#8b5cf6', fontSize: '0.75rem',
                        fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#8b5cf6';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#8b5cf6';
                      }}
                    >
                      <Plus size={13} /> Thêm thú cưng này vào danh sách
                    </button>
                  </div>
                </div>
              )}

              {/* General Actions Row at the very bottom */}
              <div style={{
                display: 'flex', gap: '0.75rem', marginTop: '1.5rem',
                borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCustomerModal(false);
                    setQuickCustomerPets([]);
                    setActiveCustomerModalTab('customer');
                  }}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                    backgroundColor: 'white', color: '#475569', fontSize: '0.88rem', fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={createCustomerMutation.isPending}
                  onClick={async () => {
                    if (!quickCustomerName.trim()) {
                      alert('Vui lòng nhập họ tên khách hàng');
                      setActiveCustomerModalTab('customer');
                      return;
                    }
                    if (!quickCustomerPhone.trim()) {
                      alert('Vui lòng nhập số điện thoại');
                      setActiveCustomerModalTab('customer');
                      return;
                    }
                    
                    // If user was typing a pet but forgot to click "+ Thêm vào danh sách", offer to add it or remind them
                    if (tempPetName.trim()) {
                      const confirmAdd = window.confirm(`Bạn đang nhập dở thông tin thú cưng "${tempPetName}". Bạn có muốn thêm thú cưng này vào luôn không?`);
                      if (confirmAdd) {
                        quickCustomerPets.push({
                          name: tempPetName.trim(),
                          species: tempPetSpecies,
                          breed: tempPetBreed.trim() || undefined,
                          weight: tempPetWeight ? Number(tempPetWeight) : undefined,
                          gender: tempPetGender,
                          notes: tempPetNotes.trim() || undefined
                        });
                        
                        // Clear subform inputs
                        setTempPetName('');
                        setTempPetBreed('');
                        setTempPetWeight('');
                        setTempPetGender('male');
                        setTempPetNotes('');
                      }
                    }

                    await createCustomerMutation.mutateAsync({
                      fullName: quickCustomerName.trim(),
                      phone: quickCustomerPhone.trim(),
                      address: quickCustomerAddress.trim() || undefined,
                      email: quickCustomerEmail.trim() || undefined
                    });
                  }}
                  style={{
                    flex: 2, padding: '0.65rem', borderRadius: '0.5rem', border: 'none',
                    backgroundColor: '#8b5cf6', color: 'white', fontSize: '0.88rem', fontWeight: '600',
                    cursor: createCustomerMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: createCustomerMutation.isPending ? 0.7 : 1, transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)'
                  }}
                >
                  {createCustomerMutation.isPending 
                    ? 'Đang tạo...' 
                    : quickCustomerPets.length > 0 
                      ? `Tạo khách hàng & ${quickCustomerPets.length} thú cưng` 
                      : 'Tạo khách hàng'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Quick Add Pet Modal */}
      {showQuickPetModal && selectedCustomer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem', animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '580px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Thêm nhanh thú cưng</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                  Chủ nuôi: <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{selectedCustomer.fullName}</span>
                </p>
              </div>
              <button onClick={() => setShowQuickPetModal(false)} style={{ padding: '0.4rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!quickPetName.trim()) {
                alert('Vui lòng nhập tên thú cưng');
                return;
              }
              await createPetMutation.mutateAsync({
                name: quickPetName.trim(),
                species: quickPetSpecies,
                breed: quickPetBreed.trim() || undefined,
                weight: quickPetWeight ? Number(quickPetWeight) : undefined,
                gender: quickPetGender,
                notes: quickPetNotes.trim() || undefined,
                barcode: quickPetBarcode.trim() || undefined,
                ageType: quickPetAgeType,
                ageYears: quickPetAgeYears ? Number(quickPetAgeYears) : undefined,
                ageMonths: quickPetAgeMonths ? Number(quickPetAgeMonths) : undefined,
                ageDays: quickPetAgeDays ? Number(quickPetAgeDays) : undefined,
                furColor: quickPetFurColor.trim() || undefined,
                neutered: quickPetNeutered || undefined,
                isCrossBreed: quickPetIsCrossBreed,
                habitat: quickPetHabitat.trim() || undefined,
                avatarUrl: quickPetAvatarUrl.trim() || undefined,
                ownerId: selectedCustomer.id,
                branchId: branchId
              });
            }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {renderPetFormFields({
                name: quickPetName, setName: setQuickPetName,
                species: quickPetSpecies, setSpecies: setQuickPetSpecies,
                breed: quickPetBreed, setBreed: setQuickPetBreed,
                weight: quickPetWeight, setWeight: setQuickPetWeight,
                gender: quickPetGender, setGender: setQuickPetGender,
                notes: quickPetNotes, setNotes: setQuickPetNotes,
                barcode: quickPetBarcode, setBarcode: setQuickPetBarcode,
                ageType: quickPetAgeType, setAgeType: setQuickPetAgeType,
                ageYears: quickPetAgeYears, setAgeYears: setQuickPetAgeYears,
                ageMonths: quickPetAgeMonths, setAgeMonths: setQuickPetAgeMonths,
                ageDays: quickPetAgeDays, setAgeDays: setQuickPetAgeDays,
                furColor: quickPetFurColor, setFurColor: setQuickPetFurColor,
                neutered: quickPetNeutered, setNeutered: setQuickPetNeutered,
                isCrossBreed: quickPetIsCrossBreed, setIsCrossBreed: setQuickPetIsCrossBreed,
                habitat: quickPetHabitat, setHabitat: setQuickPetHabitat,
                avatarUrl: quickPetAvatarUrl, setAvatarUrl: setQuickPetAvatarUrl,
              })}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickPetModal(false)}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1',
                    backgroundColor: 'white', color: '#475569', fontSize: '0.85rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createPetMutation.isPending}
                  style={{
                    flex: 2, padding: '0.6rem', borderRadius: '0.5rem', border: 'none',
                    backgroundColor: '#8b5cf6', color: 'white', fontSize: '0.85rem', fontWeight: '600',
                    cursor: createPetMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: createPetMutation.isPending ? 0.7 : 1, transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)'
                  }}
                >
                  {createPetMutation.isPending ? 'Đang thêm...' : 'Thêm thú cưng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webcam Capture Modal Overlay */}
      {showWebcamModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem', animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', overflow: 'hidden',
            border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>Chụp ảnh thú cưng</h3>
                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                  Sử dụng camera của thiết bị để chụp ảnh trực tiếp
                </p>
              </div>
              <button 
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
                      startCamera(cameraTarget);
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
                        await handleUploadImage(capturedBlob, cameraTarget);
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
      {/* Admit Pet Modal */}
      {isAdmitPetModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.5rem', width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Header Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', position: 'relative', paddingRight: '2.5rem' }}>
              <button
                type="button"
                onClick={() => setAdmitActiveTab('info')}
                style={{
                  flex: 1, padding: '1rem', border: 'none', backgroundColor: admitActiveTab === 'info' ? 'white' : '#f3f4f6',
                  color: admitActiveTab === 'info' ? '#10b981' : '#9ca3af', fontWeight: '600', cursor: 'pointer',
                  outline: 'none', borderTop: admitActiveTab === 'info' ? '3px solid #10b981' : '3px solid transparent'
                }}
              >
                Chọn thông tin
              </button>
              <button
                type="button"
                onClick={() => setAdmitActiveTab('time')}
                style={{
                  flex: 1, padding: '1rem', border: 'none', backgroundColor: admitActiveTab === 'time' ? 'white' : '#f3f4f6',
                  color: admitActiveTab === 'time' ? '#10b981' : '#9ca3af', fontWeight: '600', cursor: 'pointer',
                  outline: 'none', borderTop: admitActiveTab === 'time' ? '3px solid #10b981' : '3px solid transparent'
                }}
              >
                Thời gian lưu chuồng
              </button>
              <button type="button" onClick={() => setIsAdmitPetModalOpen(false)} style={{
                position: 'absolute', right: '0.5rem', top: '0.5rem', padding: '0.5rem',
                border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer'
              }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit}>
              <div style={{ padding: '1.5rem', minHeight: '260px' }}>
                {admitActiveTab === 'info' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#1e293b' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Thú cưng:</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--foreground)' }}>
                        {customerPets.find((p: any) => p.id === selectedPetId)?.name || 'Thú cưng'}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#475569' }}>
                        Chọn phòng / Khu vực:
                      </label>
                      <select
                        value={selectedAdmitRoomId}
                        onChange={(e) => handleAdmitRoomChange(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.85rem' }}
                      >
                        {admitRooms.map(room => (
                          <option key={room.id} value={room.id}>
                            {room.name} ({room.cages?.filter((c: any) => c.status === CageStatus.AVAILABLE).length || 0} chuồng trống)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#475569' }}>
                        Chọn chuồng trống:
                      </label>
                      <select
                        value={selectedAdmitCageId}
                        onChange={(e) => setSelectedAdmitCageId(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontSize: '0.85rem' }}
                      >
                        {availableCages.length === 0 ? (
                          <option value="">-- Không có chuồng trống --</option>
                        ) : (
                          availableCages.map(cage => (
                            <option key={cage.id} value={cage.id}>{cage.name} - Trống</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Service Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#10b981', marginBottom: '0.5rem' }}>
                        Dịch vụ:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                          type="text"
                          placeholder="Tìm gói tiền áp dụng"
                          style={{
                            width: '100%', padding: '0.65rem 1rem 0.65rem 2.2rem', fontSize: '0.85rem',
                            border: '1px solid #e5e7eb', borderRadius: '4px', outline: 'none', color: '#374151'
                          }}
                        />
                      </div>
                    </div>

                    {/* Check-in Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#10b981', marginBottom: '0.5rem' }}>
                        Ngày nhập chuồng:
                      </label>
                      <input
                        type="datetime-local"
                        defaultValue={new Date().toISOString().slice(0,16)}
                        style={{
                          width: '100%', padding: '0.65rem 1rem', fontSize: '0.85rem',
                          border: '1px solid #e5e7eb', borderRadius: '4px', outline: 'none', color: '#374151'
                        }}
                      />
                    </div>

                    {/* Check-out Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#10b981', marginBottom: '0.5rem' }}>
                        Ngày xuất chuồng:
                      </label>
                      <input
                        type="datetime-local"
                        disabled={admitSameDay}
                        style={{
                          width: '100%', padding: '0.65rem 1rem', fontSize: '0.85rem',
                          border: '1px solid #e5e7eb', borderRadius: '4px', outline: 'none', color: '#9ca3af',
                          backgroundColor: admitSameDay ? '#f9fafb' : 'white'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
              }}>
                {admitActiveTab === 'time' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>
                    <input
                      type="checkbox"
                      checked={admitSameDay}
                      onChange={(e) => setAdmitSameDay(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                    />
                    <span>Lưu trong ngày</span>
                  </label>
                ) : <div />}
                
                <button type="submit" disabled={admitPetMutation.isPending || !selectedAdmitCageId} style={{
                  padding: '0.55rem 1.25rem', borderRadius: '4px', border: 'none',
                  background: (!selectedAdmitCageId || admitPetMutation.isPending) ? '#9ca3af' : 'linear-gradient(to right, #34d399, #14b8a6)', color: 'white',
                  fontWeight: '600', cursor: (!selectedAdmitCageId || admitPetMutation.isPending) ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '0.85rem'
                }}>
                  {admitPetMutation.isPending ? 'Đang thực hiện...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pet Details Modal */}
      {isPetDetailsModalOpen && (() => {
        const pet = customerPets.find((p: any) => p.id === selectedPetId);
        if (!pet) return null;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#3b82f6', color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={18} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Chi tiết thú cưng</h3>
                </div>
                <button onClick={() => setIsPetDetailsModalOpen(false)} style={{ padding: '0.25rem', borderRadius: '50%', color: 'white', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                
                {/* Header Profile Section */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px dashed #e2e8f0' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#0284c7', flexShrink: 0,
                    boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.15)', overflow: 'hidden'
                  }}>
                    {pet.avatarUrl ? (
                      <img src={pet.avatarUrl} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>🐾</span>
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>{pet.name}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                        {pet.species || 'Khác'}
                      </span>
                      {pet.breed && (
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          Giống: {pet.breed}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', color: '#334155', fontSize: '0.85rem' }}>
                  
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>GIỚI TÍNH</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {pet.gender === 'male' ? '♂️ Đực' : pet.gender === 'female' ? '♀️ Cái' : 'Chưa rõ'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>CÂN NẶNG</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {pet.weight ? `${pet.weight} KG` : 'Chưa nhập'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>TRIỆT SẢN</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {pet.neutered || 'Chưa rõ'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>MÀU LÔNG</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {pet.furColor || 'Chưa rõ'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>MÔI TRƯỜNG SỐNG</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {pet.habitat || 'Chưa rõ'}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>MÃ VẠCH (BARCODE)</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {pet.barcode || 'N/A'}
                    </span>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>CHỦ NUÔI</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {selectedCustomer?.fullName} - SĐT: {selectedCustomer?.phone || 'N/A'}
                    </span>
                  </div>

                  {pet.notes && (
                    <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', borderLeft: '3px solid #3b82f6' }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '600', marginBottom: '0.15rem' }}>GHI CHÚ SỨC KHỎE</span>
                      <span style={{ color: '#334155', fontStyle: 'italic' }}>{pet.notes}</span>
                    </div>
                  )}

                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMedicalRecordPet(pet);
                      setIsMedicalRecordModalOpen(true);
                    }}
                    style={{
                      padding: '0.55rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600',
                      backgroundColor: '#f97316', color: 'white', border: 'none', cursor: 'pointer',
                      fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    <FileText size={16} /> Bệnh án
                  </button>
                  <button type="button" onClick={() => setIsPetDetailsModalOpen(false)} style={{ padding: '0.55rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', backgroundColor: '#64748b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedProductForDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '650px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={20} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>Chi tiết sản phẩm</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForDetails(null)}
                style={{
                  border: 'none', backgroundColor: 'transparent', color: '#64748b',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.25rem', borderRadius: '50%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Product Title and Basic Info */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '90px', height: '90px', borderRadius: '0.5rem',
                  backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#64748b', flexShrink: 0
                }}>
                  {selectedProductForDetails.imageUrl ? (
                    <img src={selectedProductForDetails.imageUrl} alt={selectedProductForDetails.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} />
                  ) : (
                    <ShoppingCart size={36} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.4rem' }}>
                    {selectedProductForDetails.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: '600' }}>MÃ SẢN PHẨM</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                        {selectedProductForDetails.productCode || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: '600' }}>BARCODE</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                        {selectedProductForDetails.barcode || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: '600' }}>ĐƠN VỊ TÍNH</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                        {selectedProductForDetails.unit?.name || 'Đơn vị'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>DANH MỤC</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>
                    {selectedProductForDetails.category?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>NHÓM SẢN PHẨM</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>
                    {selectedProductForDetails.itemGroup?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>PHÂN LOẠI KHÁC</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>
                    {selectedProductForDetails.classification?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>NHÀ SẢN XUẤT</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>
                    {selectedProductForDetails.manufacturer || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>GIÁ NIÊM YẾT (CƠ BẢN)</span>
                  <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.95rem' }}>
                    {formatCurrency(selectedProductForDetails.basePrice || 0)}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>TỔNG TỒN KHO CHI NHÁNH</span>
                  <span style={{ fontWeight: '700', color: (stockMap[selectedProductForDetails.id] || 0) > 0 ? '#10b981' : '#ef4444', fontSize: '0.95rem' }}>
                    {stockMap[selectedProductForDetails.id] || 0}
                  </span>
                </div>
              </div>

              {/* Usage block */}
              {selectedProductForDetails.usage && (
                <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #3b82f6' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '700', marginBottom: '0.25rem' }}>HƯỚNG DẪN SỬ DỤNG / MÔ TẢ</span>
                  <div 
                    style={{ color: '#1e3a8a', fontSize: '0.85rem', lineHeight: '1.4' }}
                    dangerouslySetInnerHTML={{ __html: selectedProductForDetails.usage }}
                  />
                </div>
              )}

              {/* Batches block */}
              <div>
                <h5 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                  Chi tiết lô hàng (Hạn sử dụng)
                </h5>
                {selectedProductBatches.length === 0 ? (
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '0.375rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    Không có lô hàng khả dụng tại chi nhánh này.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#475569' }}>Hạn sử dụng</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Số lượng tồn</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#475569' }}>Tên hóa đơn / Nguồn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProductBatches.map((batch: any) => {
                          const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                          return (
                            <tr key={batch.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem 0.75rem', color: isExpired ? '#ef4444' : '#334155', fontWeight: isExpired ? '600' : 'normal' }}>
                                {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('vi-VN') : 'Không có'}
                                {isExpired && <span style={{ color: '#ef4444', fontSize: '0.7rem', marginLeft: '0.4rem', fontWeight: '700' }}>[HẾT HẠN]</span>}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '600', color: '#0f172a' }}>
                                {batch.currentQuantity}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                                {batch.invoiceName || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
              padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setSelectedProductForDetails(null)}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '0.375rem', fontSize: '0.85rem',
                  fontWeight: '600', border: '1px solid #cbd5e1', backgroundColor: 'white',
                  color: '#475569', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProductForDetails);
                  setSelectedProductForDetails(null);
                }}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '0.375rem', fontSize: '0.85rem',
                  fontWeight: '600', border: 'none', backgroundColor: '#3b82f6',
                  color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                <Plus size={16} /> Chọn mua
              </button>
            </div>
          </div>
        </div>
      )}
      {isMedicalRecordModalOpen && (
        <MedicalRecordModal
          isOpen={isMedicalRecordModalOpen}
          onClose={() => {
            setIsMedicalRecordModalOpen(false);
            setSelectedMedicalRecordPet(null);
          }}
          pet={selectedMedicalRecordPet}
          onUpdateSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['pets', selectedCustomer?.id] });
          }}
        />
      )}
    </div>
  );
};

export default POSPage;
