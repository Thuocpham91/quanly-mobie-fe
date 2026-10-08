import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Minus, 
  User, 
  Phone, 
  FileText, 
  Link2, 
  AlertCircle, 
  Check, 
  X, 
  Menu,
  ChevronDown,
  Navigation,
  Loader2,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CloudOff
} from 'lucide-react';
import { searchCustomers, createCustomer, type Customer } from '../api/customers';
import { getUsers } from '../api/users';
import { createOrder, type CreateOrderPayload } from '../api/orders';
import LocationSelector from '../components/LocationSelector';
import type { LocationItem } from '../api/locations';
import { 
  saveOfflineOrder, 
  getOfflinePendingOrders, 
  removeOfflineOrder, 
  saveFormDraft, 
  getFormDraft, 
  clearFormDraft, 
  getLocalQRCache,
  cacheQRBase64,
  type CachedFormData 
} from '../utils/offlineStorage';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Generate random ID / Order Code
const generateRandomId = (length = 8) => {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const POSPage: React.FC = () => {
  const queryClient = useQueryClient();
  // Generated IDs
  const [formId] = useState(() => generateRandomId(8));
  const [orderCode, setOrderCode] = useState(() => generateRandomId(8));

  // Customer search & fields
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Quick Add Customer states
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState('');
  const [quickCustomerLocation, setQuickCustomerLocation] = useState('http://');

  // Date and Time fields
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [appointmentTime, setAppointmentTime] = useState('00:00:00');
  const [deadline, setDeadline] = useState(() => new Date().toISOString().substring(0, 10));

  // Text inputs
  const [address, setAddress] = useState('');
  const [customerLocation, setCustomerLocation] = useState('http://');
  const [jobDescription, setJobDescription] = useState('');
  const [completedItems, setCompletedItems] = useState('');
  const [failReason, setFailReason] = useState('');

  // Numeric fields
  const [quotedAmount, setQuotedAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [costPrice, setCostPrice] = useState(0);

  // Order Type Toggle ('Dịch Vụ' | 'Bán Hàng' | 'Bảo Hành')
  const [orderType, setOrderType] = useState<'Dịch Vụ' | 'Bán Hàng' | 'Bảo Hành'>('Dịch Vụ');

  // Dynamic dropdown options
  const [workStatusOptions, setWorkStatusOptions] = useState([
    'Chờ xử lý',
    'Đang tiến hành',
    'Hoàn thành',
    'Đã hủy'
  ]);
  const [selectedWorkStatus, setSelectedWorkStatus] = useState('Chờ xử lý');

  const [warrantyTimeOptions, setWarrantyTimeOptions] = useState([
    'Không bảo hành',
    '1 tháng',
    '3 tháng',
    '6 tháng',
    '12 tháng',
    '24 tháng'
  ]);
  const [selectedWarrantyTime, setSelectedWarrantyTime] = useState('Không bảo hành');

  const [customerSourceOptions, setCustomerSourceOptions] = useState([
    'Facebook',
    'Hotline',
    'Zalo',
    'Website',
    'Khách giới thiệu'
  ]);
  const [selectedCustomerSource, setSelectedCustomerSource] = useState('Facebook');

  const [priorityOptions, setPriorityOptions] = useState([
    'Thấp',
    'Trung bình',
    'Cao',
    'Khẩn cấp'
  ]);
  const [selectedPriority, setSelectedPriority] = useState('Trung bình');

  // Users for CS and Technical roles
  const [csStaffOptions, setCsStaffOptions] = useState<string[]>([]);
  const [selectedCsStaff, setSelectedCsStaff] = useState('');

  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // Modal / Custom Option Dialog states
  const [isCustomOptionModalOpen, setIsCustomOptionModalOpen] = useState(false);
  const [customOptionField, setCustomOptionField] = useState<string>('');
  const [customOptionValue, setCustomOptionValue] = useState('');
  
  // Location selector modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // --- Offline & Cache Local States ---
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [offlineOrders, setOfflineOrders] = useState<CachedFormData[]>(() => getOfflinePendingOrders());
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [localQR, setLocalQR] = useState(() => getLocalQRCache());
  const [saveStatusMessage, setSaveStatusMessage] = useState<string>('');

  // Lắng nghe trạng thái mạng Online / Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto cache QR preview
      const qr = getLocalQRCache();
      cacheQRBase64(qr.bank, qr.account, qr.accountName, qr.memo);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache QR
    const qr = getLocalQRCache();
    if (navigator.onLine && qr.account) {
      cacheQRBase64(qr.bank, qr.account, qr.accountName, qr.memo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Đọc lại danh sách cache khi mở lại hoặc thay đổi
  const reloadOfflineList = () => {
    setOfflineOrders(getOfflinePendingOrders());
  };

  // Khôi phục form nháp dở dang từ LocalStorage nếu có
  useEffect(() => {
    const draft = getFormDraft();
    if (draft && draft.formId) {
      if (draft.appointmentDate) setAppointmentDate(draft.appointmentDate);
      if (draft.appointmentTime) setAppointmentTime(draft.appointmentTime);
      if (draft.deadline) setDeadline(draft.deadline);
      if (draft.customerName) setCustomerName(draft.customerName);
      if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
      if (draft.address) setAddress(draft.address);
      if (draft.customerLocation) setCustomerLocation(draft.customerLocation);
      if (draft.jobDescription) setJobDescription(draft.jobDescription);
      if (draft.completedItems) setCompletedItems(draft.completedItems);
      if (draft.quotedAmount !== undefined) setQuotedAmount(draft.quotedAmount);
      if (draft.discount !== undefined) setDiscount(draft.discount);
      if (draft.paidAmount !== undefined) setPaidAmount(draft.paidAmount);
      if (draft.costPrice !== undefined) setCostPrice(draft.costPrice);
      if (draft.orderType) setOrderType(draft.orderType);
      if (draft.workStatus) setSelectedWorkStatus(draft.workStatus);
      if (draft.failReason) setFailReason(draft.failReason);
      if (draft.warrantyTime) setSelectedWarrantyTime(draft.warrantyTime);
      if (draft.customerSource) setSelectedCustomerSource(draft.customerSource);
      if (draft.priority) setSelectedPriority(draft.priority);
      if (draft.orderCode) setOrderCode(draft.orderCode);
    }
  }, []);

  // Tự động lưu bản nháp vào LocalStorage mỗi khi trường dữ liệu thay đổi
  useEffect(() => {
    const draft: Partial<CachedFormData> = {
      formId,
      orderCode,
      orderType,
      appointmentDate,
      appointmentTime,
      deadline,
      customerName,
      customerPhone,
      address,
      customerLocation,
      jobDescription,
      completedItems,
      quotedAmount,
      discount,
      paidAmount,
      costPrice,
      workStatus: selectedWorkStatus,
      failReason,
      warrantyTime: selectedWarrantyTime,
      customerSource: selectedCustomerSource,
      csStaff: selectedCsStaff,
      assignee: selectedAssignee,
      priority: selectedPriority,
      selectedCustomerId: selectedCustomer?.id,
    };
    saveFormDraft(draft);
  }, [
    formId,
    orderCode,
    orderType,
    appointmentDate,
    appointmentTime,
    deadline,
    customerName,
    customerPhone,
    address,
    customerLocation,
    jobDescription,
    completedItems,
    quotedAmount,
    discount,
    paidAmount,
    costPrice,
    selectedWorkStatus,
    failReason,
    selectedWarrantyTime,
    selectedCustomerSource,
    selectedCsStaff,
    selectedAssignee,
    selectedPriority,
    selectedCustomer
  ]);

  // API Queries & Mutations
  const { data: customerData } = useQuery({
    queryKey: ['searchCustomersPOS', customerSearch],
    queryFn: () => searchCustomers(customerSearch, undefined, 1, 10),
    enabled: customerSearch.trim().length > 1,
  });
  const matchedCustomers = customerData?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ['usersListPOS'],
    queryFn: () => getUsers(undefined, 1, 100),
  });

  // Populate CS Staff and Assignee from Users
  useEffect(() => {
    if (usersData?.data) {
      const names = usersData.data.map(u => u.fullName);
      setCsStaffOptions(names);
      setAssigneeOptions(names);
      if (names.length > 0) {
        setSelectedCsStaff(names[0]);
        setSelectedAssignee(names[0]);
      }
    }
  }, [usersData]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.fullName);
    setCustomerPhone(customer.phone);
    setCustomerSearch('');
  };

  // Adjust number helper
  const handleAdjustNumber = (
    value: number,
    setValue: React.Dispatch<React.SetStateAction<number>>,
    delta: number
  ) => {
    setValue(prev => Math.max(0, prev + delta));
  };

  // Open custom option dialog
  const openCustomOptionDialog = (fieldName: string) => {
    setCustomOptionField(fieldName);
    setCustomOptionValue('');
    setIsCustomOptionModalOpen(true);
  };

  // Confirm custom option
  const handleAddCustomOption = () => {
    if (!customOptionValue.trim()) return;
    const value = customOptionValue.trim();

    if (customOptionField === 'workStatus') {
      setWorkStatusOptions(prev => [...prev, value]);
      setSelectedWorkStatus(value);
    } else if (customOptionField === 'warrantyTime') {
      setWarrantyTimeOptions(prev => [...prev, value]);
      setSelectedWarrantyTime(value);
    } else if (customOptionField === 'customerSource') {
      setCustomerSourceOptions(prev => [...prev, value]);
      setSelectedCustomerSource(value);
    } else if (customOptionField === 'priority') {
      setPriorityOptions(prev => [...prev, value]);
      setSelectedPriority(value);
    } else if (customOptionField === 'csStaff') {
      setCsStaffOptions(prev => [...prev, value]);
      setSelectedCsStaff(value);
    } else if (customOptionField === 'assignee') {
      setAssigneeOptions(prev => [...prev, value]);
      setSelectedAssignee(value);
    }

    setIsCustomOptionModalOpen(false);
  };

  // Location selector change handler
  const handleLocationChange = (loc: {
    province?: LocationItem;
    district?: LocationItem;
    ward?: LocationItem;
    fullAddress?: string;
  }) => {
    const parts = [
      loc.fullAddress,
      loc.ward?.name,
      loc.district?.name,
      loc.province?.name
    ].filter(Boolean);
    const fullAddrStr = parts.join(', ');
    
    if (isQuickAddCustomerOpen) {
      setQuickCustomerAddress(fullAddrStr);
    } else {
      setAddress(fullAddrStr);
    }
  };

  // Quick Add Customer API mutation
  const createCustomerMutation = useMutation({
    mutationFn: (newCustomer: Partial<Customer>) => createCustomer(newCustomer),
    onSuccess: (data) => {
      setSelectedCustomer(data);
      setCustomerName(data.fullName);
      setCustomerPhone(data.phone);
      setAddress(data.address || '');
      // If notes has location prefix
      if (data.notes && data.notes.startsWith('Location: ')) {
        setCustomerLocation(data.notes.replace('Location: ', ''));
      }
      setIsQuickAddCustomerOpen(false);
      setQuickCustomerName('');
      setQuickCustomerPhone('');
      setQuickCustomerAddress('');
      setQuickCustomerLocation('http://');
      alert('Đã thêm nhanh khách hàng thành công!');
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thêm khách hàng.');
    }
  });

  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerName.trim() || !quickCustomerPhone.trim()) {
      alert('Vui lòng điền đầy đủ tên và số điện thoại!');
      return;
    }
    
    const payload: Partial<Customer> = {
      fullName: quickCustomerName,
      phone: quickCustomerPhone,
      address: quickCustomerAddress,
      notes: quickCustomerLocation ? `Location: ${quickCustomerLocation}` : undefined
    };
    
    createCustomerMutation.mutate(payload);
  };

  // Form submission mutation (creates an Order as technical form)
  const createOrderMutation = useMutation({
    mutationFn: (payload: CreateOrderPayload & any) => createOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      clearFormDraft();
      alert(`Đã lưu Form Kỹ Thuật thành công! Mã đơn hàng: ${data.orderCode || orderCode}`);
      // Clear form except IDs
      setCustomerSearch('');
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setCustomerLocation('http://');
      setJobDescription('');
      setCompletedItems('');
      setFailReason('');
      setQuotedAmount(0);
      setDiscount(0);
      setPaidAmount(0);
      setCostPrice(0);
    },
    onError: (err: any) => {
      console.error(err);
      // Nếu lỗi do mạng, tự động lưu offline vào máy
      if (!navigator.onLine || err.code === 'ERR_NETWORK' || !err.response) {
        saveCurrentFormOffline();
      } else {
        alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu biểu mẫu.');
      }
    }
  });

  // Lưu form vào Local Storage khi mất mạng
  const saveCurrentFormOffline = () => {
    const offlineItem: CachedFormData = {
      formId,
      orderCode,
      orderType,
      appointmentDate,
      appointmentTime,
      deadline,
      customerName,
      customerPhone,
      address,
      customerLocation,
      jobDescription,
      completedItems,
      quotedAmount,
      discount,
      paidAmount,
      costPrice,
      workStatus: selectedWorkStatus,
      failReason,
      warrantyTime: selectedWarrantyTime,
      customerSource: selectedCustomerSource,
      csStaff: selectedCsStaff,
      assignee: selectedAssignee,
      priority: selectedPriority,
      selectedCustomerId: selectedCustomer?.id,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    saveOfflineOrder(offlineItem);
    reloadOfflineList();
    clearFormDraft();
    setSaveStatusMessage('Đã lưu dữ liệu vào bộ nhớ máy (Offline) thành công!');
    setTimeout(() => setSaveStatusMessage(''), 5000);
    alert(`Không có kết nối mạng! Dữ liệu lịch trình đơn #${orderCode} đã được lưu tạm an toàn vào LocalStorage máy của bạn. Khi có mạng trở lại, bạn có thể bấm "Đồng bộ" để gửi lên server.`);
  };

  // Đồng bộ các đơn hàng lưu trong local lên server
  const handleSyncPendingOrders = async () => {
    if (!navigator.onLine) {
      alert('Hiện tại vẫn chưa có kết nối mạng internet. Vui lòng kiểm tra lại kết nối!');
      return;
    }
    const pending = getOfflinePendingOrders();
    if (pending.length === 0) {
      alert('Không có dữ liệu chờ đồng bộ trong bộ nhớ local.');
      return;
    }

    setIsSyncingOffline(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pending) {
      try {
        const payload: CreateOrderPayload & any = {
          orderCode: item.orderCode,
          customerId: item.selectedCustomerId || undefined,
          invoiceTotal: item.quotedAmount,
          discount: item.discount,
          status: 'PENDING',
          paymentMethod: item.paidAmount > 0 ? 'CASH' : 'CASH',
          notes: JSON.stringify({
            formId: item.formId,
            appointmentDate: item.appointmentDate,
            appointmentTime: item.appointmentTime,
            deadline: item.deadline,
            address: item.address,
            customerLocation: item.customerLocation,
            jobDescription: item.jobDescription,
            completedItems: item.completedItems,
            paidAmount: item.paidAmount,
            orderType: item.orderType,
            workStatus: item.workStatus,
            failReason: item.failReason,
            warrantyTime: item.warrantyTime,
            customerSource: item.customerSource,
            csStaff: item.csStaff,
            assignee: item.assignee,
            costPrice: item.costPrice,
            priority: item.priority,
            customerName: item.customerName,
            customerPhone: item.customerPhone,
          }),
          items: [],
          createdAt: item.appointmentDate ? new Date(item.appointmentDate).toISOString() : undefined,
        };
        await createOrder(payload);
        removeOfflineOrder(item.formId);
        successCount++;
      } catch (e) {
        console.error('Lỗi sync đơn offline:', item.orderCode, e);
        failCount++;
      }
    }

    setIsSyncingOffline(false);
    reloadOfflineList();
    queryClient.invalidateQueries({ queryKey: ['salesOrders'] });

    if (failCount === 0) {
      alert(`Đồng bộ thành công tất cả ${successCount} đơn hàng kỹ thuật lên hệ thống!`);
      setShowOfflineModal(false);
    } else {
      alert(`Đã đồng bộ ${successCount} đơn thành công, còn lại ${failCount} đơn chưa đồng bộ được.`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate) {
      alert('Vui lòng điền ngày hẹn!');
      return;
    }

    // Nếu người dùng đang ngoại tuyến, trực tiếp lưu vào local
    if (!navigator.onLine) {
      saveCurrentFormOffline();
      return;
    }

    const createDto: CreateOrderPayload & any = {
      orderCode,
      customerId: selectedCustomer?.id || undefined,
      invoiceTotal: quotedAmount,
      discount,
      status: 'PENDING',
      paymentMethod: paidAmount > 0 ? 'CASH' : 'CASH',
      notes: JSON.stringify({
        formId,
        appointmentDate,
        appointmentTime,
        deadline,
        address,
        customerLocation,
        jobDescription,
        completedItems,
        paidAmount,
        orderType,
        workStatus: selectedWorkStatus,
        failReason,
        warrantyTime: selectedWarrantyTime,
        customerSource: selectedCustomerSource,
        csStaff: selectedCsStaff,
        assignee: selectedAssignee,
        costPrice,
        priority: selectedPriority,
        customerName,
        customerPhone,
      }),
      items: [],
      createdAt: appointmentDate ? new Date(appointmentDate).toISOString() : undefined,
    };

    createOrderMutation.mutate(createDto);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Outfit", "Inter", sans-serif'
    }}>
      {/* Header (Pink background, matching the screenshot) */}
      <header style={{
        backgroundColor: '#d81b60',
        color: 'white',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            type="button"
            onClick={() => window.history.back()}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 style={{
              fontSize: '1.15rem',
              fontWeight: '700',
              margin: 0
            }}>KyThuat Form</h1>
            <div style={{ fontSize: '0.72rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isOnline ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#bbf7d0' }}>
                  <Wifi size={12} /> Trực tuyến
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#fef08a', fontWeight: 'bold' }}>
                  <WifiOff size={12} /> Ngoại tuyến (Đang lưu local)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons: QR & Offline Queue Modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Quick QR Payment Generator Button */}
          <button
            type="button"
            onClick={() => {
              setLocalQR(getLocalQRCache());
              setShowQRModal(true);
            }}
            title="Mở mã QR thanh toán (dùng được cả khi không có mạng)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <QrCode size={16} />
            <span style={{ display: 'inline' }}>Mã QR</span>
          </button>

          {/* Pending Offline Queue Button */}
          <button
            type="button"
            onClick={() => {
              reloadOfflineList();
              setShowOfflineModal(true);
            }}
            title="Xem danh sách đơn lưu tạm offline trong máy"
            style={{
              backgroundColor: offlineOrders.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)',
              border: 'none',
              color: offlineOrders.length > 0 ? '#78350f' : 'white',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <Database size={16} />
            <span>Đơn Local ({offlineOrders.length})</span>
          </button>
        </div>
      </header>

      {/* Save status notification banner */}
      {saveStatusMessage && (
        <div style={{
          backgroundColor: '#ecfdf5',
          borderBottom: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '0.6rem 1rem',
          fontSize: '0.85rem',
          textAlign: 'center',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <Check size={16} color="#059669" />
          {saveStatusMessage}
        </div>
      )}

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          color: '#92400e',
          padding: '0.5rem 1rem',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <CloudOff size={16} />
          <span>Mất kết nối mạng. Toàn bộ dữ liệu bạn nhập sẽ được tự động lưu cục bộ (Local Cache) và có thể đồng bộ khi có mạng.</span>
        </div>
      )}

      {/* Form Content Container */}
      <main style={{
        flex: 1,
        width: '100%',
        maxWidth: '640px',
        margin: '0 auto',
        padding: '1.5rem 1.25rem 5rem 1.25rem',
        boxSizing: 'border-box'
      }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* ID (Readonly) */}
          <div>
            <label style={labelStyle}>
              ID <span style={{ color: '#e91e63' }}>*</span>
            </label>
            <input 
              type="text" 
              value={formId} 
              disabled 
              style={disabledInputStyle}
            />
          </div>

          {/* Order Type (Loại đơn hàng) */}
          <div>
            <label style={labelStyle}>Loại đơn hàng</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setOrderType('Dịch Vụ')}
                  style={orderType === 'Dịch Vụ' ? activeToggleStyle : inactiveToggleStyle}
                >
                  Dịch Vụ
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('Bán Hàng')}
                  style={orderType === 'Bán Hàng' ? activeToggleStyle : inactiveToggleStyle}
                >
                  Bán Hàng
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOrderType('Bảo Hành')}
                style={orderType === 'Bảo Hành' ? activeToggleStyle : inactiveToggleStyle}
              >
                Bảo Hành
              </button>
            </div>
          </div>

          {/* Customer Search & Name */}
          <div>
            <label style={labelStyle}>Tên khách hàng</label>
            <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Tìm hoặc nhập tên khách hàng..." 
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerSearch(e.target.value);
                  }}
                  style={inputStyle}
                />
                {/* Autocomplete dropdown */}
                {customerSearch.trim().length > 1 && matchedCustomers.length > 0 && (
                  <div style={autocompleteContainerStyle}>
                    {matchedCustomers.map((c: any) => (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectCustomer(c)}
                        style={autocompleteItemStyle}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <User size={14} style={{ color: '#d81b60', marginRight: '0.5rem' }} />
                        <span style={{ fontWeight: '600' }}>{c.fullName}</span>
                        <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.8rem' }}>({c.phone})</span>
                        <span style={{ color: '#6366f1', marginLeft: 'auto', fontSize: '0.75rem', fontWeight: '500' }}>
                          {c.lastPurchaseDate 
                            ? `Ngày mua: ${new Date(c.lastPurchaseDate).toLocaleDateString('vi-VN')}` 
                            : (c.createdAt ? `Ngày tạo: ${new Date(c.createdAt).toLocaleDateString('vi-VN')}` : 'Mới')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddCustomerOpen(true)}
                style={plusButtonStyle}
                title="Thêm nhanh khách hàng mới"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Customer Details Box (Only when selectedCustomer is active) */}
          {selectedCustomer ? (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.9rem',
              color: '#334155'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>Thông tin khách hàng:</span>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerName('');
                    setCustomerPhone('');
                    setAddress('');
                    setCustomerLocation('http://');
                  }} 
                  style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                >
                  Gỡ bỏ
                </button>
              </div>
              <div><strong>Số điện thoại:</strong> {customerPhone}</div>
              
              {/* Address input inside customer info management */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <strong>Địa chỉ khách hàng:</strong>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Địa chỉ..." 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ ...inputStyle, padding: '0.5rem 0.75rem', fontSize: '0.9rem', flex: 1 }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setIsLocationModalOpen(true)}
                    style={{ ...plusButtonStyle, padding: '0.5rem' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Location URL input inside customer info management */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <strong>Vị trí (Google Maps link):</strong>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={customerLocation}
                    onChange={(e) => setCustomerLocation(e.target.value)}
                    style={{ ...inputStyle, padding: '0.5rem 0.75rem 0.5rem 2rem', fontSize: '0.9rem' }}
                  />
                  <Link2 size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                </div>
              </div>
            </div>
          ) : (
            /* Phone Number Input (Only shown if no customer is selected) */
            <div>
              <label style={labelStyle}>Số điện thoại</label>
              <input 
                type="tel" 
                placeholder="Nhập số điện thoại..." 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Order ID */}
          <div>
            <label style={labelStyle}>Mã Đơn Hàng</label>
            <input 
              type="text" 
              value={orderCode} 
              onChange={(e) => setOrderCode(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Appointment Date */}
          <div>
            <label style={labelStyle}>
              Ngày hẹn <span style={{ color: '#e91e63' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="date" 
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
                style={inputStyle}
              />
              <Calendar size={18} style={inputIconStyle} />
            </div>
          </div>

          {/* Appointment Time */}
          <div>
            <label style={labelStyle}>Giờ Hẹn</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="time" 
                step="1"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                style={inputStyle}
              />
              <Clock size={18} style={inputIconStyle} />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label style={labelStyle}>Deadline</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={inputStyle}
              />
              <Calendar size={18} style={inputIconStyle} />
            </div>
          </div>



          {/* Job Description */}
          <div>
            <label style={labelStyle}>Mô tả công việc</label>
            <textarea 
              rows={3}
              placeholder="Nhập mô tả công việc..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={textareaStyle}
            />
          </div>

          {/* Items Done */}
          <div>
            <label style={labelStyle}>Hạng mục đã làm</label>
            <textarea 
              rows={3}
              placeholder="Nhập hạng mục đã thực hiện..."
              value={completedItems}
              onChange={(e) => setCompletedItems(e.target.value)}
              style={textareaStyle}
            />
          </div>

          {/* Quoted Total with adjustment buttons */}
          <div>
            <label style={labelStyle}>
              Đã báo giá/ Tổng cộng <span style={{ color: '#e91e63' }}>*</span>
            </label>
            <MoneyInputField value={quotedAmount} onChange={setQuotedAmount} step={50000} />
          </div>

          {/* Discount with adjustment buttons */}
          <div>
            <label style={labelStyle}>Chiết khấu</label>
            <MoneyInputField value={discount} onChange={setDiscount} step={10000} />
          </div>

          {/* Paid Amount with adjustment buttons & QR trigger */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Đã thanh toán</label>
              <button
                type="button"
                onClick={() => {
                  setLocalQR(getLocalQRCache());
                  setShowQRModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  color: '#d81b60',
                  background: 'none',
                  border: '1px dashed #d81b60',
                  borderRadius: '0.375rem',
                  padding: '0.2rem 0.5rem',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={14} />
                Quét QR Chuyển Khoản
              </button>
            </div>
            <MoneyInputField value={paidAmount} onChange={setPaidAmount} step={50000} />
          </div>



          {/* Work Status (Trạng thái công việc) */}
          <div>
            <label style={labelStyle}>Trạng thái công việc</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={selectedWorkStatus}
                  onChange={(e) => setSelectedWorkStatus(e.target.value)}
                  style={selectStyle}
                >
                  {workStatusOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={selectIconStyle} />
              </div>
              <button 
                type="button" 
                onClick={() => openCustomOptionDialog('workStatus')}
                style={plusButtonStyle}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Fail / Reschedule reason */}
          <div>
            <label style={labelStyle}>Lý do Fail/ Chuyển lịch</label>
            <input 
              type="text" 
              placeholder="Nhập lý do nếu công việc thất bại hoặc chuyển lịch..." 
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Warranty Duration */}
          <div>
            <label style={labelStyle}>Thời gian bảo hành</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={selectedWarrantyTime}
                  onChange={(e) => setSelectedWarrantyTime(e.target.value)}
                  style={selectStyle}
                >
                  {warrantyTimeOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={selectIconStyle} />
              </div>
              <button 
                type="button" 
                onClick={() => openCustomOptionDialog('warrantyTime')}
                style={plusButtonStyle}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Customer Source (Nguồn khách) */}
          <div>
            <label style={labelStyle}>Nguồn khách</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={selectedCustomerSource}
                  onChange={(e) => setSelectedCustomerSource(e.target.value)}
                  style={selectStyle}
                >
                  {customerSourceOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={selectIconStyle} />
              </div>
              <button 
                type="button" 
                onClick={() => openCustomOptionDialog('customerSource')}
                style={plusButtonStyle}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* CS Staff */}
          <div>
            <label style={labelStyle}>Nhân viên CS/ chốt đơn</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={selectedCsStaff}
                  onChange={(e) => setSelectedCsStaff(e.target.value)}
                  style={selectStyle}
                >
                  {csStaffOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={selectIconStyle} />
              </div>
              <button 
                type="button" 
                onClick={() => openCustomOptionDialog('csStaff')}
                style={plusButtonStyle}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label style={labelStyle}>Người phụ trách</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  style={selectStyle}
                >
                  {assigneeOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={selectIconStyle} />
              </div>
              <button 
                type="button" 
                onClick={() => openCustomOptionDialog('assignee')}
                style={plusButtonStyle}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Cost Price */}
          <div>
            <label style={labelStyle}>Giá vốn</label>
            <MoneyInputField value={costPrice} onChange={setCostPrice} step={50000} />
          </div>

          {/* Priority Level */}
          <div>
            <label style={labelStyle}>Mức ưu tiên</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select 
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  style={selectStyle}
                >
                  {priorityOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={selectIconStyle} />
              </div>
              <button 
                type="button" 
                onClick={() => openCustomOptionDialog('priority')}
                style={plusButtonStyle}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Footer Actions (Cancel and Save in Pink style) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 0',
            marginTop: '1.5rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn hủy biểu mẫu này?')) {
                  window.history.back();
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '0.5rem 1rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrderMutation.isPending}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#d81b60',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {createOrderMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Save
            </button>
          </div>

        </form>
      </main>

      {/* Custom Option Modal Dialog */}
      {isCustomOptionModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Thêm lựa chọn mới</h3>
              <button 
                type="button" 
                onClick={() => setIsCustomOptionModalOpen(false)}
                style={closeModalButtonStyle}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <input 
                type="text" 
                placeholder="Nhập giá trị..." 
                value={customOptionValue}
                onChange={(e) => setCustomOptionValue(e.target.value)}
                style={inputStyle}
                autoFocus
              />
            </div>
            <div style={modalFooterStyle}>
              <button 
                type="button" 
                onClick={() => setIsCustomOptionModalOpen(false)}
                style={cancelModalButtonStyle}
              >
                Hủy
              </button>
              <button 
                type="button" 
                onClick={handleAddCustomOption}
                style={confirmModalButtonStyle}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Selector Modal */}
      {isLocationModalOpen && (
        <div style={{ ...modalOverlayStyle, zIndex: 1200 }}>
          <div style={{ ...modalContentStyle, maxWidth: '480px' }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Navigation size={18} color="#d81b60" />
                Chọn địa chỉ chi tiết
              </h3>
              <button 
                type="button" 
                onClick={() => setIsLocationModalOpen(false)}
                style={closeModalButtonStyle}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <LocationSelector 
                onLocationChange={handleLocationChange} 
              />
            </div>
            <div style={modalFooterStyle}>
              <button 
                type="button" 
                onClick={() => setIsLocationModalOpen(false)}
                style={confirmModalButtonStyle}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isQuickAddCustomerOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '460px' }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Thêm nhanh khách hàng mới</h3>
              <button 
                type="button" 
                onClick={() => setIsQuickAddCustomerOpen(false)}
                style={closeModalButtonStyle}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomerSubmit}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Tên khách hàng *</label>
                  <input 
                    type="text" 
                    placeholder="Nhập họ tên khách hàng..." 
                    value={quickCustomerName}
                    onChange={(e) => setQuickCustomerName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Số điện thoại *</label>
                  <input 
                    type="tel" 
                    placeholder="Nhập số điện thoại..." 
                    value={quickCustomerPhone}
                    onChange={(e) => setQuickCustomerPhone(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Địa chỉ</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Địa chỉ khách hàng..." 
                      value={quickCustomerAddress}
                      onChange={(e) => setQuickCustomerAddress(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsLocationModalOpen(true)}
                      style={plusButtonStyle}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Vị trí khách hàng (Google Maps link)</label>
                  <input 
                    type="url" 
                    value={quickCustomerLocation}
                    onChange={(e) => setQuickCustomerLocation(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={modalFooterStyle}>
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddCustomerOpen(false)}
                  style={cancelModalButtonStyle}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={createCustomerMutation.isPending}
                  style={confirmModalButtonStyle}
                >
                  {createCustomerMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offline Pending Orders Modal */}
      {showOfflineModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '580px', maxHeight: '85vh' }}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={20} color="#d81b60" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
                  Đơn hàng lưu tạm trong máy (Offline)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowOfflineModal(false)}
                style={closeModalButtonStyle}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
                color: '#64748b',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Tổng cộng: <strong>{offlineOrders.length}</strong> đơn lưu cục bộ</span>
                <span style={{ 
                  color: isOnline ? '#059669' : '#d97706', 
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem' 
                }}>
                  {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {isOnline ? 'Đã có mạng (sẵn sàng đồng bộ)' : 'Chưa có mạng'}
                </span>
              </div>

              {offlineOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                  <Database size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Hiện không có đơn hàng nào lưu offline.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {offlineOrders.map((ord) => (
                    <div 
                      key={ord.formId}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        padding: '0.85rem',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>
                            Mã: #{ord.orderCode}
                          </span>
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '0.25rem',
                            backgroundColor: '#fee2e2',
                            color: '#e11d48',
                            fontWeight: '600'
                          }}>
                            {ord.orderType}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(ord.createdAt).toLocaleTimeString('vi-VN')} {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                        Khách: <strong>{ord.customerName || 'Chưa có tên'}</strong> - SĐT: {ord.customerPhone || '---'}
                      </div>
                      {ord.address && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Đ/c: {ord.address}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: '700' }}>
                          Báo giá: {formatCurrency(ord.quotedAmount)}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              // Tải lại dữ liệu đơn này vào form
                              setAppointmentDate(ord.appointmentDate || '');
                              setAppointmentTime(ord.appointmentTime || '00:00:00');
                              setDeadline(ord.deadline || '');
                              setCustomerName(ord.customerName || '');
                              setCustomerPhone(ord.customerPhone || '');
                              setAddress(ord.address || '');
                              setCustomerLocation(ord.customerLocation || 'http://');
                              setJobDescription(ord.jobDescription || '');
                              setCompletedItems(ord.completedItems || '');
                              setQuotedAmount(ord.quotedAmount || 0);
                              setDiscount(ord.discount || 0);
                              setPaidAmount(ord.paidAmount || 0);
                              setCostPrice(ord.costPrice || 0);
                              setOrderType(ord.orderType || 'Dịch Vụ');
                              setSelectedWorkStatus(ord.workStatus || 'Chờ xử lý');
                              setFailReason(ord.failReason || '');
                              setSelectedWarrantyTime(ord.warrantyTime || 'Không bảo hành');
                              setSelectedCustomerSource(ord.customerSource || 'Facebook');
                              setSelectedPriority(ord.priority || 'Trung bình');
                              setOrderCode(ord.orderCode);
                              setShowOfflineModal(false);
                            }}
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              color: '#475569'
                            }}
                          >
                            Đưa vào form
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn xóa bản ghi offline của đơn #${ord.orderCode}?`)) {
                                removeOfflineOrder(ord.formId);
                                reloadOfflineList();
                              }
                            }}
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#fee2e2',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              color: '#dc2626'
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                style={cancelModalButtonStyle}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSyncPendingOrders}
                disabled={offlineOrders.length === 0 || isSyncingOffline || !isOnline}
                style={{
                  ...confirmModalButtonStyle,
                  backgroundColor: isOnline && offlineOrders.length > 0 ? '#059669' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: isOnline && offlineOrders.length > 0 && !isSyncingOffline ? 'pointer' : 'not-allowed'
                }}
              >
                {isSyncingOffline ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Đồng bộ lên Server ({offlineOrders.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline QR Code Modal */}
      {showQRModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '420px', textAlign: 'center' }}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={20} color="#d81b60" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
                  QR Thanh Toán (Hỗ trợ Offline)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQRModal(false)}
                style={closeModalButtonStyle}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
              }}>
                {localQR.cachedDataUrl ? (
                  <img
                    src={localQR.cachedDataUrl}
                    alt="VietQR Offline"
                    style={{ width: '220px', height: '220px', display: 'block', objectFit: 'contain' }}
                  />
                ) : (
                  <img
                    src={`https://img.vietqr.io/image/${localQR.bank}-${(localQR.account || '').trim()}-compact2.png?amount=${paidAmount || quotedAmount || 0}&addInfo=${encodeURIComponent(localQR.memo || 'Thanh toan')}&accountName=${encodeURIComponent((localQR.accountName || '').trim().toUpperCase())}`}
                    alt="VietQR"
                    style={{ width: '220px', height: '220px', display: 'block', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>

              {/* Amount info */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Số tiền thanh toán:</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#059669', margin: '0.2rem 0' }}>
                  {formatCurrency(paidAmount > 0 ? paidAmount : (quotedAmount > 0 ? quotedAmount : 0))}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                  {localQR.bank} - {localQR.account || 'Chưa cấu hình tài khoản'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#d81b60', fontWeight: '600' }}>
                  {(localQR.accountName || '').toUpperCase()}
                </div>
                {localQR.memo && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Nội dung: <strong>{localQR.memo} #{orderCode}</strong>
                  </div>
                )}
              </div>

              {!isOnline && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#92400e',
                  backgroundColor: '#fef3c7',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <WifiOff size={14} />
                  <span>Đang hoạt động ở chế độ Offline. Khách hàng vẫn có thể quét mã chuyển khoản bình thường!</span>
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                style={{ ...confirmModalButtonStyle, width: '100%', backgroundColor: '#d81b60' }}
              >
                Xác nhận đã xem QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MoneyInputFieldProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
}

const MoneyInputField: React.FC<MoneyInputFieldProps> = ({ value, onChange, step = 50000 }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    if (!isFocused) {
      setTempValue(value === 0 ? '0' : value.toString());
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^\d]/g, '');
    const numVal = rawVal ? parseInt(rawVal, 10) : 0;
    setTempValue(rawVal);
    onChange(numVal);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTempValue(value.toString());
  };

  const displayValue = isFocused ? tempValue : new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

  return (
    <div style={numberInputContainerStyle}>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: '1rem',
          fontWeight: '600',
          color: '#1e293b',
          width: '70%',
          backgroundColor: 'transparent',
          padding: 0
        }}
      />
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button 
          type="button" 
          onClick={() => onChange(Math.max(0, value - step))}
          style={adjustButtonStyle}
        >
          <Minus size={16} />
        </button>
        <button 
          type="button" 
          onClick={() => onChange(value + step)}
          style={adjustButtonStyle}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

// Styling Object definitions to keep code clean and maintain rich aesthetics
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '0.5rem'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  border: '1px solid #cbd5e1',
  borderRadius: '0.5rem',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const disabledInputStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  cursor: 'not-allowed',
  border: '1px solid #e2e8f0'
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'inherit',
  resize: 'vertical'
};

const inputIconStyle: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#64748b',
  pointerEvents: 'none'
};

const plusButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '0.5rem',
  color: '#475569',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const numberInputContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  border: '1px solid #cbd5e1',
  borderRadius: '0.5rem',
  backgroundColor: 'white',
  boxSizing: 'border-box'
};

const numberPrefixStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: '600',
  color: '#1e293b'
};

const adjustButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '0.25rem',
  color: '#475569',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const activeToggleStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  fontWeight: '600',
  backgroundColor: 'rgba(216, 27, 96, 0.1)',
  border: '2px solid #d81b60',
  color: '#d81b60',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center'
};

const inactiveToggleStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  fontWeight: '500',
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  color: '#475569',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  paddingRight: '2.5rem'
};

const selectIconStyle: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#64748b',
  pointerEvents: 'none'
};

// Modal styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  backdropFilter: 'blur(4px)',
  padding: '1rem'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '0.75rem',
  width: '100%',
  maxWidth: '400px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  borderBottom: '1px solid #f1f5f9'
};

const closeModalButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '0.25rem',
  display: 'flex',
  alignItems: 'center'
};

const modalFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  padding: '1rem',
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #f1f5f9'
};

const cancelModalButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'white',
  border: '1px solid #cbd5e1',
  borderRadius: '0.375rem',
  color: '#475569',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer'
};

const confirmModalButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#d81b60',
  border: 'none',
  borderRadius: '0.375rem',
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer'
};

const autocompleteContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5e1',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  maxHeight: '200px',
  overflowY: 'auto',
  zIndex: 10,
  marginTop: '0.25rem'
};

const autocompleteItemStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.9rem',
  borderBottom: '1px solid #f1f5f9',
  transition: 'background-color 0.2s'
};

export default POSPage;
