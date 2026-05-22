import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Search, Calendar, Edit2, User, Phone, FileText, Activity, DollarSign, RefreshCw, LogOut, MessageSquare, Clipboard, X, Plus, Trash2, Upload, CalendarPlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../api/client';
import { type Cage, CageStatus, getRooms, type Room } from '../api/boarding';
import { topUpWallet } from '../api/customers';
import BoardingEntryModal from './BoardingEntryModal';
import MedicalRecordModal from './MedicalRecordModal';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  dateOfBirth: string;
  owner?: {
    fullName: string;
    phone: string;
  };
}

interface CageDetailViewProps {
  cage: Cage;
  onBack: () => void;
  onUpdateCage: (cageId: string, data: Partial<Cage>) => Promise<any>;
}

const CageDetailView: React.FC<CageDetailViewProps> = ({ cage, onBack, onUpdateCage }) => {
  const queryClient = useQueryClient();
  const [searchVal, setSearchVal] = useState('');
  const [isEditingExpectedDate, setIsEditingExpectedDate] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pets list
  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ['petsForCageSearch'],
    queryFn: async () => {
      const response = await api.get('/pets?page=1&limit=200');
      return response.data?.data || [];
    }
  });

  const customerId = cage.pet?.owner?.id;

  const { data: customerDetails, refetch: refetchCustomer } = useQuery({
    queryKey: ['boardingCustomerDetails', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const response = await api.get(`/customers/${customerId}`);
      return response.data || null;
    },
    enabled: !!customerId
  });

  // Filter 10 pets based on search value, or show first 10 when empty
  const filteredPets = useMemo(() => {
    if (!searchVal) {
      return pets.slice(0, 10);
    }
    const cleanSearch = searchVal.toLowerCase();
    return pets
      .filter(p => {
        const petName = (p.name || '').toLowerCase();
        const ownerName = (p.owner?.fullName || '').toLowerCase();
        const ownerPhone = (p.owner?.phone || '').toLowerCase();
        return petName.includes(cleanSearch) || ownerName.includes(cleanSearch) || ownerPhone.includes(cleanSearch);
      })
      .slice(0, 10);
  }, [pets, searchVal]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedPetForEntry, setSelectedPetForEntry] = useState<Pet | null>(null);

  const handleSelectPet = (pet: Pet) => {
    setIsDropdownOpen(false);
    setSearchVal('');
    setSelectedPetForEntry(pet);
    setIsEntryModalOpen(true);
  };

  const handleConfirmEntry = async (services: any[], expectedCheckout?: string, notesText?: string) => {
    if (!selectedPetForEntry) return;
    try {
      const firstDailyNote = notesText && notesText.trim() !== '' ? [
        {
          id: Date.now().toString(),
          date: new Date().toISOString().slice(0, 10),
          content: notesText
        }
      ] : [];

      // Store initial services inside notes JSON
      const initialNotes = JSON.stringify({
        text: notesText || `Dự kiến trả: ${expectedCheckout || 'Chưa hẹn'}`,
        services: services,
        roomPrice: 100000,
        dailyNotes: firstDailyNote
      });
      await onUpdateCage(cage.id, {
        status: CageStatus.OCCUPIED,
        petId: selectedPetForEntry.id,
        notes: initialNotes
      });
      alert(`Nhập chuồng thành công cho bé ${selectedPetForEntry.name}!`);
      setIsEntryModalOpen(false);
    } catch (err) {
      alert('Có lỗi xảy ra khi nhập chuồng.');
    }
  };
  
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [roomPrice, setRoomPrice] = useState('');

  const getNotesData = (rawNotes?: string) => {
    if (!rawNotes) return { text: '', services: [] as any[], roomPrice: 100000, dailyNotes: [] as any[], deposits: [] as any[] };
    try {
      if (rawNotes.trim().startsWith('{')) {
        const parsed = JSON.parse(rawNotes);
        return {
          text: parsed.text || '',
          services: parsed.services || [],
          roomPrice: Number(parsed.roomPrice) || 100000,
          dailyNotes: parsed.dailyNotes || [],
          deposits: parsed.deposits || []
        };
      }
    } catch (e) {
      // Fallback
    }
    return { text: rawNotes, services: [] as any[], roomPrice: 100000, dailyNotes: [] as any[], deposits: [] as any[] };
  };

  const currentNotesData = useMemo(() => getNotesData(cage.notes), [cage.notes]);

  const dailyNotesList = useMemo(() => {
    const list = [...(currentNotesData.dailyNotes || [])];
    if (list.length === 0 && currentNotesData.text && currentNotesData.text.trim() !== '') {
      list.push({
        id: 'legacy',
        date: cage.pet?.createdAt ? cage.pet.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        content: currentNotesData.text
      });
    }
    return list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentNotesData.dailyNotes, currentNotesData.text, cage.pet?.createdAt]);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const totalServiceCost = useMemo(() => {
    return currentNotesData.services.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  }, [currentNotesData.services]);

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const [localDailyNotes, setLocalDailyNotes] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteDate, setEditingNoteDate] = useState('');
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteImages, setEditingNoteImages] = useState<string[]>([]);
  const [isUploadingNoteImage, setIsUploadingNoteImage] = useState(false);

  const [quickTaskModalData, setQuickTaskModalData] = useState<{ isOpen: boolean, initialNotes: string }>({ isOpen: false, initialNotes: '' });

  useEffect(() => {
    if (isNotesModalOpen) {
      setLocalDailyNotes(dailyNotesList);
      setEditingNoteId(null);
    }
  }, [isNotesModalOpen, dailyNotesList]);


  useEffect(() => {
    setRoomPrice(String(currentNotesData.roomPrice || 100000));
  }, [currentNotesData.roomPrice]);

  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [localServices, setLocalServices] = useState<any[]>([]);

  // Keep localServices in sync with notes services when modal opens
  useEffect(() => {
    if (isServicesModalOpen) {
      setLocalServices(currentNotesData.services || []);
      setServiceSearch('');
    }
  }, [isServicesModalOpen, currentNotesData.services]);

  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);

  // Step 1 health check & items
  const [checkoutHealthStatus, setCheckoutHealthStatus] = useState('good'); // good | watch | other
  const [checkoutHealthNotes, setCheckoutHealthNotes] = useState('');
  const [checkedItemsReturn, setCheckedItemsReturn] = useState(false);
  const [checkedCareInstructions, setCheckedCareInstructions] = useState(false);

  // Step 2 payment method
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash | transfer | card
  const [walletPaidAmount, setWalletPaidAmount] = useState<number>(0);

  // States for Deposits (Tạm ứng)
  const [isDepositsModalOpen, setIsDepositsModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [depositNote, setDepositNote] = useState('');

  // States for Transferring Cage
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTargetCageId, setSelectedTargetCageId] = useState<string>('');

  // States for Medical Record (Bệnh án)
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false);

  // Calculate billing parameters dynamically
  const billingInfo = useMemo(() => {
    if (!cage.pet?.createdAt) return { days: 0, pricePerDay: 100000, boardingCost: 0, totalCost: 0 };
    const diffMs = new Date().getTime() - new Date(cage.pet.createdAt).getTime();
    // round up to nearest day
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const pricePerDay = Number(roomPrice) || 100000;
    const boardingCost = days * pricePerDay;
    const totalCost = boardingCost + totalServiceCost;
    return {
      days,
      pricePerDay,
      boardingCost,
      totalCost
    };
  }, [cage.pet?.createdAt, roomPrice, totalServiceCost]);

  // Automatically default wallet paid amount to max possible wallet balance when checkout opens
  useEffect(() => {
    if (isCheckoutModalOpen) {
      const maxPossibleWallet = customerDetails ? Math.min(Number(customerDetails.walletBalance) || 0, billingInfo.totalCost) : 0;
      setWalletPaidAmount(maxPossibleWallet);
    } else {
      setWalletPaidAmount(0);
    }
  }, [isCheckoutModalOpen, customerDetails?.walletBalance, billingInfo.totalCost]);

  // Total deposits (tổng tạm ứng)
  const totalDeposits = useMemo(() => {
    return (currentNotesData.deposits || []).reduce((sum: number, dep: any) => sum + (Number(dep.amount) || 0), 0);
  }, [currentNotesData.deposits]);

  // Remaining payment (tiền còn lại cần thanh toán)
  const remainingPayment = Math.max(0, billingInfo.totalCost - walletPaidAmount);

  // Fetch products list for service search
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['productsForServiceSearch'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data?.data || response.data || [];
    }
  });

  // Filter top 5 product suggestions matching search
  const filteredProductsForService = useMemo(() => {
    if (!serviceSearch) return [];
    const clean = serviceSearch.toLowerCase();
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(clean) || 
      (p.productCode || '').toLowerCase().includes(clean)
    ).slice(0, 5);
  }, [products, serviceSearch]);

  // Fetch rooms list for Transfer cage
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['roomsForTransfer'],
    queryFn: () => getRooms(),
    enabled: isTransferModalOpen
  });

  // Filter available cages for transfer
  const availableCages = useMemo(() => {
    const list: { roomName: string; cage: Cage }[] = [];
    rooms.forEach(room => {
      (room.cages || []).forEach(c => {
        if (c.status === CageStatus.AVAILABLE && c.id !== cage.id) {
          list.push({ roomName: room.name, cage: c });
        }
      });
    });
    return list;
  }, [rooms, cage.id]);
  const handleAddService = (prod: any) => {
    const existingIdx = localServices.findIndex(s => s.productId === prod.id);
    if (existingIdx > -1) {
      const updated = [...localServices];
      updated[existingIdx] = {
        ...updated[existingIdx],
        qty: updated[existingIdx].qty + 1
      };
      setLocalServices(updated);
    } else {
      setLocalServices([
        ...localServices,
        {
          productId: prod.id,
          name: prod.name,
          price: Number(prod.basePrice) || 0,
          qty: 1,
          addedAt: new Date().toISOString()
        }
      ]);
    }
    setServiceSearch('');
  };

  const handleUpdateQty = (productId: string, amount: number) => {
    const updated = localServices.map(s => {
      if (s.productId === productId) {
        const newQty = s.qty + amount;
        return newQty > 0 ? { ...s, qty: newQty } : null;
      }
      return s;
    }).filter(Boolean) as any[];
    setLocalServices(updated);
  };

  const handleRemoveService = (productId: string) => {
    setLocalServices(localServices.filter(s => s.productId !== productId));
  };

  const handleSaveServices = async () => {
    try {
      const updatedNotes = JSON.stringify({
        ...currentNotesData,
        services: localServices
      });
      await onUpdateCage(cage.id, { notes: updatedNotes });
      setIsServicesModalOpen(false);
      alert('Đã cập nhật dịch vụ thành công!');
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu dịch vụ.');
    }
  };

  const handleSaveRoomPrice = async () => {
    try {
      const updatedNotes = JSON.stringify({
        ...currentNotesData,
        roomPrice: Number(roomPrice) || 100000
      });
      await onUpdateCage(cage.id, { notes: updatedNotes });
      setIsEditingPrice(false);
      alert('Đã cập nhật giá phòng thành công!');
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu giá phòng.');
    }
  };

  const handleFinalCheckout = async () => {
    if (!customerId) {
      alert('Không tìm thấy thông tin chủ nuôi để khấu trừ ví!');
      return;
    }
    try {
      // Khấu trừ số tiền thanh toán bằng ví khỏi ví khách hàng
      if (walletPaidAmount > 0) {
        await topUpWallet(customerId, -walletPaidAmount);
      }

      // 3. Giải phóng chuồng
      await onUpdateCage(cage.id, {
        status: CageStatus.AVAILABLE,
        petId: undefined,
        notes: ''
      });
      setIsCheckoutModalOpen(false);
      alert(`Xuất chuồng thành công cho bé ${cage.pet?.name}!`);
      onBack();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi thực hiện xuất chuồng.');
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTargetCageId) {
      alert('Vui lòng chọn chuồng muốn chuyển đến!');
      return;
    }
    try {
      // 1. Chuyển thông tin sang chuồng mới
      await onUpdateCage(selectedTargetCageId, {
        status: CageStatus.OCCUPIED,
        petId: cage.petId,
        notes: cage.notes
      });

      // 2. Giải phóng chuồng cũ
      await onUpdateCage(cage.id, {
        status: CageStatus.AVAILABLE,
        petId: undefined,
        notes: ''
      });

      setIsTransferModalOpen(false);
      alert('Chuyển chuồng thành công!');
      onBack();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi thực hiện chuyển chuồng.');
    }
  };

  // Calculate actual boarding duration
  const [actualDuration, setActualDuration] = useState('0 ngày 0 giờ');

  useEffect(() => {
    if (cage.pet?.createdAt) {
      const calculateDuration = () => {
        const checkIn = new Date(cage.pet.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - checkIn.getTime();
        
        if (diffMs < 0) {
          setActualDuration('0 ngày 0 giờ');
          return;
        }

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setActualDuration(`${diffDays} ngày ${diffHours} giờ`);
      };

      calculateDuration();
      const interval = setInterval(calculateDuration, 1000 * 60); // update every minute
      return () => clearInterval(interval);
    } else {
      setActualDuration('--');
    }
  }, [cage.pet?.createdAt]);

  const hasPet = cage.status !== CageStatus.AVAILABLE && cage.status !== CageStatus.MAINTENANCE && cage.pet;



  const handleAddNewNote = () => {
    setEditingNoteId('new');
    setEditingNoteDate(new Date().toISOString().slice(0, 10));
    setEditingNoteContent('');
    setEditingNoteImages([]);
  };

  const handleEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteDate(note.date);
    setEditingNoteContent(note.content);
    setEditingNoteImages(note.images || []);
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mục nhật ký này?')) {
      setLocalDailyNotes(localDailyNotes.filter(n => n.id !== noteId));
    }
  };

  const handleUploadNoteImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setIsUploadingNoteImage(true);
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data && response.data.url) {
        setEditingNoteImages(prev => [...prev, response.data.url]);
      }
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingNoteImage(false);
      e.target.value = '';
    }
  };

  const handleSaveSubNote = () => {
    if (!editingNoteContent.trim() || editingNoteContent === '<p><br></p>') {
      alert('Vui lòng nhập nội dung ghi chú.');
      return;
    }
    if (editingNoteId === 'new') {
      const newNote = {
        id: Date.now().toString(),
        date: editingNoteDate || new Date().toISOString().slice(0, 10),
        content: editingNoteContent,
        images: editingNoteImages
      };
      setLocalDailyNotes([newNote, ...localDailyNotes]);
    } else {
      const updated = localDailyNotes.map(n => {
        if (n.id === editingNoteId) {
          return { ...n, date: editingNoteDate, content: editingNoteContent, images: editingNoteImages };
        }
        return n;
      });
      setLocalDailyNotes(updated);
    }
    setEditingNoteId(null);
  };

  const handleSaveNotesFromModal = async () => {
    try {
      const newestNote = localDailyNotes[0];
      const legacyText = newestNote ? newestNote.content : '';

      const updatedNotes = JSON.stringify({
        ...currentNotesData,
        text: legacyText,
        dailyNotes: localDailyNotes
      });
      await onUpdateCage(cage.id, { notes: updatedNotes });
      setIsNotesModalOpen(false);
      alert('Đã cập nhật nhật ký ghi chú thành công!');
    } catch (err) {
      alert('Lỗi cập nhật ghi chú.');
    }
  };

  const handleAddDeposit = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      alert('Vui lòng nhập số tiền tạm ứng hợp lệ!');
      return;
    }
    if (!customerId) {
      alert('Không tìm thấy thông tin chủ nuôi để ghi nhận ví!');
      return;
    }

    try {
      const newDep = {
        id: Date.now().toString(),
        date: new Date().toISOString().slice(0, 10),
        amount: amt,
        method: depositMethod,
        note: depositNote
      };

      const updatedDeposits = [...(currentNotesData.deposits || []), newDep];
      const updatedNotes = JSON.stringify({
        ...currentNotesData,
        deposits: updatedDeposits
      });

      // 1. Cập nhật notes của chuồng
      await onUpdateCage(cage.id, { notes: updatedNotes });
      
      // 2. Cộng tiền vào ví khách hàng
      await topUpWallet(customerId, amt);
      
      // 3. Tải lại thông tin ví khách và reset form
      refetchCustomer();
      setDepositAmount('');
      setDepositNote('');
      alert('Đã thêm tiền tạm ứng và cộng vào ví khách hàng thành công!');
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi thêm tiền tạm ứng.');
    }
  };

  const handleRemoveDeposit = async (depId: string, amount: number) => {
    if (!confirm('Bạn có chắc muốn xóa khoản tạm ứng này? Số tiền trong ví của khách hàng cũng sẽ bị trừ tương ứng.')) {
      return;
    }
    if (!customerId) {
      alert('Không tìm thấy thông tin chủ nuôi!');
      return;
    }

    try {
      const updatedDeposits = (currentNotesData.deposits || []).filter((d: any) => d.id !== depId);
      const updatedNotes = JSON.stringify({
        ...currentNotesData,
        deposits: updatedDeposits
      });

      // 1. Cập nhật notes của chuồng
      await onUpdateCage(cage.id, { notes: updatedNotes });

      // 2. Trừ tiền khỏi ví khách hàng
      await topUpWallet(customerId, -amount);

      // 3. Tải lại thông tin ví khách
      refetchCustomer();
      alert('Đã xóa khoản tạm ứng và khấu trừ ví khách hàng thành công!');
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xóa khoản tạm ứng.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      
      {/* Top Navigation Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#475569',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft size={18} />
          <span>Danh sách phòng</span>
        </button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', margin: 0, textTransform: 'lowercase' }}>
          {cage.name}
        </h2>
        
        <div style={{ width: '120px' }}></div> {/* Spacer for symmetry */}
      </div>

      {/* Search and Top Action Buttons Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Nhập ID hoặc SĐT/Tên thú cưng để tìm kiếm..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              fontSize: '0.875rem',
              outline: 'none',
              color: '#334155'
            }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />

          {/* Search Dropdown list */}
          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 9999,
              maxHeight: '300px',
              overflowY: 'auto',
              marginTop: '0.25rem'
            }}>
              {filteredPets.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Không tìm thấy thú cưng nào phù hợp.
                </div>
              ) : (
                filteredPets.map(pet => (
                  <div
                    key={pet.id}
                    onClick={() => handleSelectPet(pet)}
                    style={{
                      padding: '0.65rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>🐾 {pet.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                        {pet.species === 'dog' ? 'Chó' : pet.species === 'cat' ? 'Mèo' : pet.species} {pet.breed ? `- ${pet.breed}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', fontSize: '0.8rem', color: '#64748b', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {pet.owner?.fullName || 'Khách lẻ'}
                      </span>
                      {pet.owner?.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={12} /> {pet.owner.phone}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button style={{
          backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem',
          width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <Search size={18} />
        </button>
        <button 
          onClick={() => setIsEntryModalOpen(true)}
          style={{
          backgroundColor: '#5eead4', color: '#115e59', border: 'none', borderRadius: '0.375rem',
          padding: '0.65rem 1rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          + Đặt phòng
        </button>
        <button style={{
          backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '0.375rem',
          padding: '0.65rem 1rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          + Khách/Pet mới
        </button>
      </div>

      {/* Main Boarding Detail Card */}
      {hasPet ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
            {/* Left: Brand logo / Placeholder */}
            <div style={{
              width: '180px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              flexShrink: 0
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  {cage.pet?.avatarUrl ? (
                    <img src={cage.pet.avatarUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  ) : (
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ecfdf5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981',
                      border: '2px solid #a7f3d0'
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem', letterSpacing: '0.5px' }}>GPET VET</div>
              </div>
            </div>

            {/* Right: Key-Value parameters grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', fontSize: '0.875rem' }}>
              
              {/* Column 1 of grid */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Tên chủ nuôi:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{cage.pet?.owner?.fullName || 'Khách lẻ'}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Tên thú cưng:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{cage.pet?.name || 'Chưa cập nhật'}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Giống:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{cage.pet?.breed || '--'}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Ngày lưu chuồng:</span>
                  <span style={{ fontWeight: '700', color: '#ef4444' }}>
                    {cage.pet?.createdAt ? new Date(cage.pet.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '--'}
                  </span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Số ngày thực tế:</span>
                  <span style={{ fontWeight: '700', color: '#334155' }}>{actualDuration}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Tổng tiền lưu trú:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{formatVND(billingInfo.boardingCost)}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Tổng tiền dịch vụ:</span>
                  <span style={{ fontWeight: '700', color: '#10b981' }}>{formatVND(totalServiceCost)}</span>
                </div>
              </div>

              {/* Column 2 of grid */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Số điện thoại:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{cage.pet?.owner?.phone || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Loài:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{cage.pet?.species === 'dog' ? 'Chó' : cage.pet?.species === 'cat' ? 'Mèo' : cage.pet?.species || 'Khác'}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Số kg:</span>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{cage.pet?.weight ? `${cage.pet.weight} kg` : '--'}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Ngày xuất chuồng dự kiến:</span>
                    <span style={{ fontWeight: '600', color: '#334155' }}>
                      {expectedDate ? expectedDate : 'Chưa xác định'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditingExpectedDate(!isEditingExpectedDate)}
                    style={{ border: 'none', backgroundColor: 'transparent', color: '#10b981', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <Calendar size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Giá phòng:</span>
                    <span style={{ fontWeight: '600', color: '#334155' }}>{roomPrice ? `${roomPrice}đ` : '--'}</span>
                  </div>
                  <button
                    onClick={() => setIsEditingPrice(!isEditingPrice)}
                    style={{ border: 'none', backgroundColor: 'transparent', color: '#f59e0b', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Tiền ứng còn lại:</span>
                  <span style={{ fontWeight: '600', color: '#10b981' }}>{formatVND(totalDeposits)}</span>
                </div>
                <div style={{ display: 'flex', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: '180px', color: '#64748b', fontWeight: '500' }}>Số dư ví khách hàng:</span>
                  <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{formatVND(Number(customerDetails?.walletBalance) || 0)}</span>
                </div>
              </div>

              {/* Full width Ghi chú row */}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', padding: '1rem', backgroundColor: '#fafaf9', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#475569', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MessageSquare size={16} style={{ color: '#c084fc' }} /> Nhật ký theo dõi hàng ngày:
                  </span>
                  <button
                    onClick={() => setIsNotesModalOpen(true)}
                    style={{
                      border: 'none', backgroundColor: '#e2e8f0', color: '#475569', cursor: 'pointer',
                      padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                      display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}
                  >
                    <Edit2 size={12} /> Cập nhật nhật ký
                  </button>
                </div>
                
                {dailyNotesList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1rem', marginLeft: '0.5rem', marginTop: '0.25rem' }}>
                    {dailyNotesList.map((item: any, index: number) => (
                      <div key={item.id || index} style={{ position: 'relative' }}>
                        {/* Timeline Bullet */}
                        <div style={{
                          position: 'absolute', left: '-1.375rem', top: '0.25rem',
                          width: '10px', height: '10px', borderRadius: '50%',
                          backgroundColor: '#c084fc', border: '2px solid white',
                          boxShadow: '0 0 0 2px rgba(192, 132, 252, 0.2)'
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.15rem' }}>
                            {new Date(item.date).toLocaleDateString('vi-VN')}
                          </span>
                          <div 
                            className="ql-editor"
                            style={{ 
                              color: '#334155', fontSize: '0.875rem', wordBreak: 'break-word', 
                              backgroundColor: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px',
                              border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap'
                            }}
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa có ghi chú nhật ký theo dõi</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (!hasPet) {
                  alert('Vui lòng nhập chuồng cho thú cưng trước khi quản lý dịch vụ.');
                  return;
                }
                setIsServicesModalOpen(true);
              }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                backgroundColor: '#2dd4bf', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              <Clipboard size={16} /> Dịch vụ
            </button>
            <button
              onClick={() => {
                if (!hasPet) {
                  alert('Vui lòng nhập chuồng cho thú cưng trước khi xem bệnh án.');
                  return;
                }
                setIsMedicalRecordModalOpen(true);
              }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                backgroundColor: '#f97316', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              <FileText size={16} /> Bệnh án
            </button>
            <button 
              onClick={() => {
                if (!hasPet) {
                  alert('Vui lòng nhập chuồng cho thú cưng trước khi viết ghi chú.');
                  return;
                }
                setIsNotesModalOpen(true);
              }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                backgroundColor: '#c084fc', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              <MessageSquare size={16} /> Ghi chú
            </button>
            <button style={{
              padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
              backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', fontSize: '0.85rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
            }}>
              <Activity size={16} /> Tình trạng
            </button>
            <button
              onClick={() => {
                if (!hasPet) {
                  alert('Vui lòng nhập chuồng cho thú cưng trước khi đăng ký tạm ứng.');
                  return;
                }
                setIsDepositsModalOpen(true);
              }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                backgroundColor: '#0ea5e9', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              <DollarSign size={16} /> Tạm ứng
            </button>
            <button
              onClick={() => {
                if (!hasPet) {
                  alert('Vui lòng nhập chuồng cho thú cưng trước khi thực hiện chuyển chuồng.');
                  return;
                }
                setSelectedTargetCageId('');
                setIsTransferModalOpen(true);
              }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                backgroundColor: '#f59e0b', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              <RefreshCw size={16} /> Chuyển
            </button>
            <button
              onClick={() => {
                setCheckoutStep(1);
                setCheckoutHealthStatus('good');
                setCheckoutHealthNotes('');
                setCheckedItemsReturn(false);
                setCheckedCareInstructions(false);
                setPaymentMethod('cash');
                setIsCheckoutModalOpen(true);
              }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                backgroundColor: '#ef4444', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                marginLeft: 'auto'
              }}
            >
              <LogOut size={16} /> Xuất chuồng
            </button>
          </div>

        </div>
      ) : (
        <div style={{
          backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0',
          padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: '1rem'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#cbd5e1' }}>
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <line x1="9" x2="15" y1="9" y2="9"/>
            <line x1="9" x2="15" y1="13" y2="13"/>
            <line x1="9" x2="15" y1="17" y2="17"/>
          </svg>
          <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Chuồng hiện tại trống hoặc đang bảo trì.</span>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Vui lòng thực hiện nhập chuồng tại danh sách phòng hoặc chuyển thú cưng vào.</span>
        </div>
      )}

      {/* Modals for edits inside detail page */}
      {isEditingExpectedDate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', width: '320px' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#334155' }}>Hạn xuất dự kiến</h4>
            <input
              type="datetime-local"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', marginBottom: '1rem', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setIsEditingExpectedDate(false)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={() => setIsEditingExpectedDate(false)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '0.25rem', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer' }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingPrice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', width: '320px' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#334155' }}>Giá lưu trú phòng</h4>
            <input
              type="number"
              placeholder="Nhập giá tiền..."
              value={roomPrice}
              onChange={(e) => setRoomPrice(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', marginBottom: '1rem', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setIsEditingPrice(false)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveRoomPrice}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '0.25rem', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer' }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Services Management Modal */}
      {isServicesModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clipboard size={20} style={{ color: '#2dd4bf' }} />
                Quản lý dịch vụ - Bé {cage.pet?.name || 'thú cưng'}
              </h3>
              <button
                onClick={() => setIsServicesModalOpen(false)}
                style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Product / Service Catalog Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                  Thêm dịch vụ / sản phẩm sử dụng:
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm dịch vụ (Tắm, tỉa lông, hạt, sữa...)"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 1rem 0.6rem 2.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: '0.875rem',
                      color: '#334155'
                    }}
                  />
                  
                  {/* Search suggestions */}
                  {filteredProductsForService.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      zIndex: 10001,
                      marginTop: '0.25rem'
                    }}>
                      {filteredProductsForService.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddService(prod)}
                          style={{
                            padding: '0.6rem 1rem',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.875rem' }}>{prod.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã: {prod.productCode || '--'}</div>
                          </div>
                          <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.875rem' }}>
                            {formatVND(Number(prod.basePrice) || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Service list table */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                  Danh sách dịch vụ đã dùng trong đợt nội trú này:
                </label>
                
                {localServices.length === 0 ? (
                  <div style={{
                    padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '0.375rem',
                    fontSize: '0.875rem', fontStyle: 'italic'
                  }}>
                    Chưa có dịch vụ nào được thêm. Vui lòng tìm kiếm dịch vụ ở trên để thêm.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600' }}>Tên dịch vụ</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600', width: '100px', textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600', width: '120px', textAlign: 'center' }}>Số lượng</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600', width: '120px', textAlign: 'right' }}>Thành tiền</th>
                          <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {localServices.map(item => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: '#334155' }}>{item.name}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569' }}>{formatVND(item.price)}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleUpdateQty(item.productId, -1)}
                                  style={{
                                    width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #cbd5e1',
                                    backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ width: '20px', textAlign: 'center', fontWeight: '600' }}>{item.qty}</span>
                                <button
                                  onClick={() => handleUpdateQty(item.productId, 1)}
                                  style={{
                                    width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #cbd5e1',
                                    backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                              {formatVND(item.price * item.qty)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleRemoveService(item.productId)}
                                style={{
                                  border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer',
                                  padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total amount bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '0.375rem',
                border: '1px solid #bbf7d0'
              }}>
                <span style={{ fontWeight: '600', color: '#166534', fontSize: '0.95rem' }}>Tổng tiền dịch vụ:</span>
                <span style={{ fontWeight: '800', color: '#15803d', fontSize: '1.25rem' }}>
                  {formatVND(localServices.reduce((sum, item) => sum + (item.price * item.qty), 0))}
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setIsServicesModalOpen(false)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveServices}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                Lưu dịch vụ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-step Checkout Modal */}
      {isCheckoutModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>
                Quy trình xuất chuồng: Bé {cage.pet?.name}
              </h3>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Stepper Bar */}
            <div style={{
              display: 'flex',
              padding: '1rem 1.5rem',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: checkoutStep >= 1 ? 1 : 0.5 }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: checkoutStep === 1 ? '#ef4444' : '#10b981',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '0.8rem'
                }}>1</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Kiểm tra sức khỏe & đồ</span>
              </div>
              <div style={{ flex: 1, height: '2px', backgroundColor: checkoutStep > 1 ? '#10b981' : '#cbd5e1', margin: '0 1rem' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: checkoutStep >= 2 ? 1 : 0.5 }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: checkoutStep === 2 ? '#ef4444' : checkoutStep > 2 ? '#10b981' : '#64748b',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '0.8rem'
                }}>2</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Thanh toán chi phí</span>
              </div>
              <div style={{ flex: 1, height: '2px', backgroundColor: checkoutStep > 2 ? '#10b981' : '#cbd5e1', margin: '0 1rem' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: checkoutStep >= 3 ? 1 : 0.5 }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: checkoutStep === 3 ? '#ef4444' : '#64748b',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '0.8rem'
                }}>3</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Bàn giao hoàn tất</span>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* STEP 1 */}
              {checkoutStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    1. Khảo sát & Đánh giá sức khỏe của bé
                  </h4>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                      Tình trạng sức khỏe hiện tại:
                    </label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="radio"
                          name="healthStatus"
                          value="good"
                          checked={checkoutHealthStatus === 'good'}
                          onChange={() => setCheckoutHealthStatus('good')}
                        />
                        Sức khỏe tốt / Bình thường
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="radio"
                          name="healthStatus"
                          value="watch"
                          checked={checkoutHealthStatus === 'watch'}
                          onChange={() => setCheckoutHealthStatus('watch')}
                        />
                        Cần theo dõi thêm
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="radio"
                          name="healthStatus"
                          value="other"
                          checked={checkoutHealthStatus === 'other'}
                          onChange={() => setCheckoutHealthStatus('other')}
                        />
                        Khác
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                      Ghi chú chi tiết khi xuất chuồng:
                    </label>
                    <textarea
                      placeholder="Bé khỏe mạnh, ăn uống bình thường, năng động, đã tắm rửa thơm tho..."
                      value={checkoutHealthNotes}
                      onChange={(e) => setCheckoutHealthNotes(e.target.value)}
                      style={{
                        width: '100%', height: '80px', padding: '0.5rem', border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem', outline: 'none', resize: 'none', fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <h4 style={{ margin: '1rem 0 0 0', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    2. Danh sách kiểm tra bàn giao đồ dùng
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={checkedItemsReturn}
                        onChange={(e) => setCheckedItemsReturn(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span>Đã kiểm tra và bàn giao lại đầy đủ đồ dùng cá nhân (quần áo, đồ chơi, balo, thức ăn còn dư...) mang theo của bé.</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={checkedCareInstructions}
                        onChange={(e) => setCheckedCareInstructions(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span>Đã dặn dò, tư vấn và hướng dẫn kỹ lưỡng cho chủ nuôi về chế độ ăn uống, chăm sóc bé tại nhà sau đợt nội trú.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {checkoutStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ margin: 0, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    Chi tiết hóa đơn dịch vụ lưu chuồng
                  </h4>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600' }}>Khoản mục thanh toán</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600', textAlign: 'center', width: '100px' }}>Số lượng</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#334155' }}>
                            Phí lưu trú phòng ({cage.name})
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569' }}>
                            {formatVND(billingInfo.pricePerDay)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569' }}>
                            {billingInfo.days} ngày
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                            {formatVND(billingInfo.boardingCost)}
                          </td>
                        </tr>
                        {currentNotesData.services.map((item: any) => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                              ⚡ Dịch vụ: {item.name}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569' }}>
                              {formatVND(item.price)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569' }}>
                              {item.qty}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                              {formatVND(item.price * item.qty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#64748b' }}>Phí lưu trú:</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{formatVND(billingInfo.boardingCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#64748b' }}>Tổng dịch vụ sử dụng:</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{formatVND(totalServiceCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: '700', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ color: '#0f172a' }}>Tổng cộng cần thanh toán:</span>
                      <span style={{ color: '#0f172a' }}>
                        {formatVND(billingInfo.totalCost)}
                      </span>
                    </div>
                  </div>

                  {customerDetails && (Number(customerDetails.walletBalance) > 0) ? (
                    <div style={{
                      backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '0.75rem 1rem',
                      display: 'flex', flexDirection: 'column', gap: '0.5rem'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '700', color: '#6d28d9', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={walletPaidAmount > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const payVal = Math.min(Number(customerDetails.walletBalance) || 0, billingInfo.totalCost);
                              setWalletPaidAmount(payVal);
                            } else {
                              setWalletPaidAmount(0);
                            }
                          }}
                          style={{ accentColor: '#7c3aed' }}
                        />
                        Dùng ví / Tiền tạm ứng để thanh toán (Số dư: {formatVND(Number(customerDetails.walletBalance) || 0)})
                      </label>
                      {walletPaidAmount > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#6d28d9', display: 'flex', justifyContent: 'space-between', paddingLeft: '1.5rem' }}>
                          <span>Trừ ví/tạm ứng: <strong>-{formatVND(walletPaidAmount)}</strong></span>
                          <span>Còn lại cần thu ngoài: <strong>{formatVND(remainingPayment)}</strong></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                      Khách hàng không có số dư ví / tạm ứng khả dụng.
                    </div>
                  )}

                  {remainingPayment > 0 ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                        Phương thức thanh toán phần chênh lệch còn lại ({formatVND(remainingPayment)}):
                      </label>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cash"
                            checked={paymentMethod === 'cash'}
                            onChange={() => setPaymentMethod('cash')}
                          />
                          Tiền mặt (Cash)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="transfer"
                            checked={paymentMethod === 'transfer'}
                            onChange={() => setPaymentMethod('transfer')}
                          />
                          Chuyển khoản (Transfer)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="card"
                            checked={paymentMethod === 'card'}
                            onChange={() => setPaymentMethod('card')}
                          />
                          Thanh toán Thẻ
                        </label>
                      </div>
                    </div>
                  ) : billingInfo.totalCost > 0 && walletPaidAmount > 0 ? (
                    <div style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      ✓ Đã chọn thanh toán hoàn toàn bằng số dư ví. Không cần thu thêm tiền mặt/chuyển khoản/thẻ.
                    </div>
                  ) : null}
                </div>
              )}

              {/* STEP 3 */}
              {checkoutStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', padding: '1rem 0' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a',
                    marginBottom: '0.5rem'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>

                  <h3 style={{ margin: 0, color: '#1e293b', textAlign: 'center' }}>Xác nhận hoàn tất xuất chuồng</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', maxWidth: '400px', margin: 0 }}>
                    Bạn chuẩn bị xác nhận hoàn tất thủ tục bàn giao bé <strong>{cage.pet?.name}</strong> cho chủ nuôi <strong>{cage.pet?.owner?.fullName || 'Khách lẻ'}</strong>.
                  </p>

                  <div style={{
                    width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.375rem',
                    padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    fontSize: '0.875rem', backgroundColor: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Trạng thái sức khỏe:</span>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>
                        {checkoutHealthStatus === 'good' ? '🐾 Sức khỏe tốt / Bình thường' : checkoutHealthStatus === 'watch' ? '⚠️ Cần theo dõi thêm' : 'Khác'}
                      </span>
                    </div>
                    {checkoutHealthNotes && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>Chi tiết sức khỏe bàn giao:</span>
                        <span style={{ color: '#475569', fontStyle: 'italic' }}>"{checkoutHealthNotes}"</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <span style={{ color: '#64748b' }}>Đồ dùng cá nhân:</span>
                      <span style={{ fontWeight: '600', color: '#16a34a' }}>Đã bàn giao đầy đủ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <span style={{ color: '#64748b' }}>Đã thu thanh toán:</span>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>{formatVND(billingInfo.totalCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <span style={{ color: '#64748b' }}>Phương thức:</span>
                      <span style={{ fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>
                        {paymentMethod === 'cash' ? 'Tiền mặt' : paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thẻ ngân hàng'}
                      </span>
                    </div>
                  </div>

                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
                    * Hành động này sẽ cập nhật chuồng <strong>{cage.name}</strong> về trạng thái Trống (AVAILABLE).
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => {
                  if (checkoutStep > 1) {
                    setCheckoutStep(checkoutStep - 1);
                  } else {
                    setIsCheckoutModalOpen(false);
                  }
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {checkoutStep === 1 ? 'Hủy bỏ' : 'Quay lại'}
              </button>

              <button
                onClick={() => {
                  if (checkoutStep === 1) {
                    if (!checkedItemsReturn || !checkedCareInstructions) {
                      alert('Vui lòng kiểm tra và tích chọn xác nhận bàn giao đồ dùng & dặn dò trước khi tiếp tục.');
                      return;
                    }
                    setCheckoutStep(2);
                  } else if (checkoutStep === 2) {
                    setCheckoutStep(3);
                  } else {
                    handleFinalCheckout();
                  }
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: checkoutStep === 3 ? '#ef4444' : '#10b981',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {checkoutStep === 1 ? 'Tiếp tục: Thanh toán' : checkoutStep === 2 ? 'Tiếp tục: Bàn giao' : 'Xác nhận xuất chuồng'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Deposits (Tạm ứng) Modal */}
      {isDepositsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', width: '650px', maxWidth: '100%',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0ea5e9', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} />
                Quản lý tạm ứng & Ví tiền dư
              </h3>
              <button onClick={() => setIsDepositsModalOpen(false)} style={{ border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              {/* Wallet Info Summary Card */}
              <div style={{
                backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>SỐ DƯ VÍ KHÁCH HÀNG (HIỆN TẠI)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#15803d', marginTop: '0.25rem' }}>
                    {formatVND(Number(customerDetails?.walletBalance) || 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                    Chủ nuôi: <strong>{cage.pet?.owner?.fullName || 'Khách lẻ'}</strong> - SĐT: {cage.pet?.owner?.phone || 'N/A'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: '600' }}>TỔNG TIỀN TẠM ỨNG CỦA PHÒNG</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0284c7', marginTop: '0.25rem', textAlign: 'right' }}>
                    {formatVND(totalDeposits)}
                  </div>
                </div>
              </div>

              {/* Form to Register New Deposit */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fafafa' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', margin: '0 0 0.75rem 0' }}>ĐĂNG KÝ KHOẢN TẠM ỨNG MỚI</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Số tiền tạm ứng (VND):</label>
                    <input
                      type="number"
                      placeholder="Ví dụ: 500000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Phương thức thanh toán:</label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value as any)}
                      style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white' }}
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản</option>
                      <option value="card">Thẻ</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Ghi chú tạm ứng:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tạm ứng trước 3 ngày..."
                      value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    onClick={handleAddDeposit}
                    style={{
                      padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px',
                      backgroundColor: '#0ea5e9', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Xác nhận tạm ứng & Cộng ví
                  </button>
                </div>
              </div>

              {/* Deposit History List */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', margin: '0 0 0.5rem 0' }}>
                  LỊCH SỬ TẠM ỨNG CỦA PHÒNG ({ (currentNotesData.deposits || []).length })
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Ngày</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Số tiền</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Hình thức</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Ghi chú</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600', textAlign: 'center' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentNotesData.deposits || []).length > 0 ? (
                        (currentNotesData.deposits || []).map((dep: any) => (
                          <tr key={dep.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#334155' }}>
                              {new Date(dep.date).toLocaleDateString('vi-VN')}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: '700', color: '#0f172a' }}>
                              {formatVND(dep.amount)}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>
                              {dep.method === 'cash' ? 'Tiền mặt' : dep.method === 'transfer' ? 'Chuyển khoản' : 'Thẻ'}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                              {dep.note || '--'}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleRemoveDeposit(dep.id, dep.amount)}
                                style={{
                                  padding: '0.2rem 0.4rem', border: 'none', backgroundColor: '#ef4444',
                                  color: 'white', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer'
                                }}
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chưa ghi nhận khoản tạm ứng nào cho đợt lưu trú này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 0.75rem 0.75rem' }}>
              <button
                onClick={() => setIsDepositsModalOpen(false)}
                style={{ padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Notes Editor Modal */}
      {isNotesModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '0.75rem', width: '600px', maxWidth: '100%',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} style={{ color: '#c084fc' }} />
                {editingNoteId !== null ? 'Biên tập ghi chú ngày' : 'Nhật ký ghi chú theo ngày'}
              </h3>
              <button onClick={() => setIsNotesModalOpen(false)} style={{ border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              {editingNoteId === null ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>CÁC NGÀY THEO DÕI ({localDailyNotes.length})</span>
                    <button
                      onClick={handleAddNewNote}
                      style={{
                        padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px',
                        backgroundColor: '#10b981', color: 'white', fontSize: '0.8rem',
                        fontWeight: '600', cursor: 'pointer'
                      }}
                    >
                      + Thêm ghi chú mới
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px', maxHeight: '420px', overflowY: 'auto' }}>
                    {localDailyNotes.length > 0 ? (
                      localDailyNotes.map((note) => (
                        <div key={note.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', backgroundColor: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#334155' }}>
                              Ngày: {new Date(note.date).toLocaleDateString('vi-VN')}
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleEditNote(note)}
                                style={{ padding: '0.2rem 0.5rem', border: 'none', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer' }}
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                style={{ padding: '0.2rem 0.5rem', border: 'none', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer' }}
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                          <div 
                            className="ql-editor"
                            style={{ fontSize: '0.85rem', color: '#475569', backgroundColor: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #f1f5f9', minHeight: '40px', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: note.content }}
                          />
                          {note.images && note.images.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                              {note.images.map((img: string, i: number) => (
                                <a key={i} href={img} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                  <img src={img} alt="Note Attachment" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '2rem 0' }}>
                        <span>Chưa có nhật ký ghi chú nào. Hãy thêm một ghi chú ngày mới!</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: 'auto', minHeight: '350px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Chọn ngày ghi chú:</label>
                    <input 
                      type="date"
                      value={editingNoteDate}
                      onChange={(e) => setEditingNoteDate(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid #cbd5e1', flex: 1 }}>
                    <ReactQuill 
                      theme="snow" 
                      value={editingNoteContent} 
                      onChange={setEditingNoteContent}
                      placeholder="Nhập chi tiết theo dõi ngày hôm nay (ăn uống, đi ngoài, triệu chứng...)"
                      modules={{
                        toolbar: [
                          ['bold', 'italic', 'underline'],
                          [{ 'color': [] }],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['clean']
                        ]
                      }}
                      style={{
                        height: '240px',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Ảnh đính kèm:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        {isUploadingNoteImage ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                        {isUploadingNoteImage ? 'Đang tải...' : 'Tải ảnh lên'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadNoteImage} disabled={isUploadingNoteImage} />
                      </label>
                    </div>
                    {editingNoteImages.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {editingNoteImages.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <img src={img} alt="Uploaded" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            <button 
                              onClick={() => setEditingNoteImages(editingNoteImages.filter((_, i) => i !== idx))}
                              style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 0.75rem 0.75rem' }}>
              {editingNoteId === null ? (
                <>
                  <button
                    onClick={() => setIsNotesModalOpen(false)}
                    style={{ padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleSaveNotesFromModal}
                    style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.375rem', backgroundColor: '#c084fc', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Lưu tất cả thay đổi
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingNoteId(null)}
                    style={{ padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleSaveSubNote}
                    style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.375rem', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Xác nhận mục này
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column',
            maxHeight: '85vh', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} style={{ color: '#f59e0b' }} /> Chuyển phòng / chuồng
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#b45309' }}>
                Bạn đang thực hiện chuyển bé <strong>{cage.pet?.name}</strong> từ chuồng <strong>{cage.name}</strong> sang một chuồng mới. Toàn bộ tiền tạm ứng, dịch vụ, giá phòng và nhật ký chăm sóc sẽ được tự động chuyển sang chuồng mới.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  Chọn chuồng trống đích:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', padding: '2px' }}>
                  {availableCages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                      Không tìm thấy chuồng trống nào khả dụng để chuyển.
                    </div>
                  ) : (
                    availableCages.map(({ roomName, cage: targetCage }) => (
                      <button
                        key={targetCage.id}
                        onClick={() => setSelectedTargetCageId(targetCage.id)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.85rem 1.25rem', borderRadius: '8px',
                          border: selectedTargetCageId === targetCage.id ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          backgroundColor: selectedTargetCageId === targetCage.id ? '#fffbeb' : '#f8fafc',
                          cursor: 'pointer', textAlign: 'left', outline: 'none', transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: selectedTargetCageId === targetCage.id ? '#b45309' : '#1e293b', fontSize: '0.95rem' }}>
                            {targetCage.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                            Phòng: {roomName}
                          </div>
                        </div>
                        {selectedTargetCageId === targetCage.id && (
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            Đã chọn
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                style={{
                  padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px',
                  backgroundColor: 'white', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={!selectedTargetCageId}
                style={{
                  padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px',
                  backgroundColor: selectedTargetCageId ? '#f59e0b' : '#cbd5e1',
                  color: 'white', fontWeight: '600', cursor: selectedTargetCageId ? 'pointer' : 'not-allowed', fontSize: '0.875rem'
                }}
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEDICAL RECORD (BỆNH ÁN) MODAL */}
      {isMedicalRecordModalOpen && cage.pet && (
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
                <FileText size={20} style={{ color: '#f97316' }} /> Hồ sơ Bệnh án & Lịch sử khám: {cage.pet.name}
              </h3>
              <button
                onClick={() => setIsMedicalRecordModalOpen(false)}
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
                        weight: cage.pet?.weight ? String(cage.pet.weight) : '',
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                          <FileText size={48} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                          <span>Vui lòng chọn một ngày khám bên trái hoặc tạo bệnh án mới!</span>
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
                                <th style={{ padding: '0.5rem', textAlign: 'left', width: '15%', border: '1px solid #cbd5e1' }}>Đơn vị</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', width: '15%', border: '1px solid #cbd5e1' }}>Liều lượng</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', width: '15%', border: '1px solid #cbd5e1' }}>Cách dùng</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', width: '15%', border: '1px solid #cbd5e1' }}>Ghi chú</th>
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
                                <th style={{ padding: '0.5rem', textAlign: 'left', width: '15%', border: '1px solid #cbd5e1' }}>Ghi chú</th>
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
                          <div style={{ fontSize: '0.85rem' }}>
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
                onClick={() => setIsMedicalRecordModalOpen(false)}
                style={{
                  padding: '0.5rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px',
                  backgroundColor: 'white', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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

      {quickTaskModalData.isOpen && cage.pet && (cage.pet.ownerId || cage.pet.owner?.id) && (
        <AppointmentModal
          isOpen={true}
          onClose={() => setQuickTaskModalData({ isOpen: false, initialNotes: '' })}
          onSubmit={async (data) => {
            await createAppointment(data);
            alert('Tạo công việc thành công!');
          }}
          customerId={cage.pet.ownerId || cage.pet.owner?.id}
          initialNotes={quickTaskModalData.initialNotes}
        />
      )}

      <BoardingEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        cageName={cage.name}
        petName={selectedPetForEntry?.name}
        ownerName={selectedPetForEntry?.owner?.fullName}
        onConfirm={handleConfirmEntry}
      />
    </div>
  );
};

export default CageDetailView;
