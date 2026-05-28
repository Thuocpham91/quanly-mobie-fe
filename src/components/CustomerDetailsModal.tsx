import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Phone, Mail, MapPin, Wallet, Plus, Calendar, Dog, Edit, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { type Customer, topUpWallet } from '../api/customers';
import { getCustomerAppointments, createAppointment, updateAppointment } from '../api/appointments';
import { getOrders } from '../api/orders';
import AppointmentModal from './AppointmentModal';
import { ClipboardList } from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ isOpen, onClose, customer }) => {
  const { selectedBranchId } = useBranchContext();
  const [activeTab, setActiveTab] = useState<'pets' | 'appointments' | 'services'>('appointments');
  const queryClient = useQueryClient();
  const customerId = customer.id;

  // Modals visibility
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  // Topup variable
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');

  // Queries
  const { data: appointments, isLoading: loadingAppts } = useQuery({
    queryKey: ['customerAppointments', customerId],
    queryFn: () => getCustomerAppointments(customerId),
    enabled: isOpen,
  });

  const { data: serviceOrders, isLoading: loadingServices } = useQuery({
    queryKey: ['customerServices', customerId],
    queryFn: async () => {
      const res = await getOrders(1, 100, undefined, customerId);
      // Filter orders that have at least one service item
      return res.data.filter(order => order.items?.some((i: any) => i.product?.isService));
    },
    enabled: isOpen,
  });

  // Mutations
  const topupMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => topUpWallet(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerDetails', customerId] });
      setShowTopup(false);
      setCustBalance(prev => prev + Number(topupAmount));
      setTopupAmount('');
    },
  });

  const [custBalance, setCustBalance] = useState(customer.walletBalance);

  // We should keep the balance updated when customer changes
  React.useEffect(() => {
    setCustBalance(customer.walletBalance);
  }, [customer]);

  const apptMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      if (id) {
        return updateAppointment(id, data);
      } else {
        return createAppointment(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerAppointments', customerId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  if (!isOpen) return null;

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    topupMutation.mutate({ id: customerId, amount });
  };



  const handleApptSubmit = async (data: any) => {
    await apptMutation.mutateAsync({ id: selectedAppt?.id, data });
  };

  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '950px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>{customer.fullName}</h2>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
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
              <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>Mã KH: {customerId.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '50%', color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.15)', cursor: 'pointer', border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          
          {/* Side Info Panel */}
          <div style={{
            width: '320px', borderRight: '1px solid var(--border)', padding: '2rem',
            backgroundColor: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: 0, borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
              Thông tin chi tiết
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', color: '#475569' }}>
                <User size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#6366f1' }} />
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Phân loại khách</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{customer.customerType || 'Khách lẻ'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', color: '#475569' }}>
                <Phone size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#6366f1' }} />
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Số điện thoại</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{customer.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', color: '#475569' }}>
                <Mail size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#6366f1' }} />
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Email</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', wordBreak: 'break-all' }}>{customer.email || 'Chưa cung cấp'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', color: '#475569' }}>
                <MapPin size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#6366f1' }} />
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Địa chỉ</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{customer.address || 'Chưa cung cấp'}</div>
                </div>
              </div>
            </div>

            {/* Wallet Section */}
            <div style={{
              backgroundColor: 'white', borderRadius: '1rem', padding: '1.25rem',
              border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                <Wallet size={18} color="#059669" />
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Ví thành viên</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669' }}>
                {formatCurrency(custBalance)}
              </div>
              
              {showTopup ? (
                <form onSubmit={handleTopup} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    placeholder="Số tiền..."
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    required
                    style={{
                      flex: 1, padding: '0.5rem', fontSize: '0.875rem',
                      border: '1px solid var(--border)', borderRadius: '0.5rem', outline: 'none'
                    }}
                  />
                  <button type="submit" disabled={topupMutation.isPending} style={{
                    padding: '0.5rem 0.8rem', backgroundColor: '#059669', color: 'white', border: 'none',
                    borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600'
                  }}>
                    Nạp
                  </button>
                  <button type="button" onClick={() => setShowTopup(false)} style={{
                    padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none',
                    borderRadius: '0.5rem', cursor: 'pointer'
                  }}>
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowTopup(true)}
                  style={{
                    width: '100%', padding: '0.6rem', border: '1px dashed #059669',
                    borderRadius: '0.75rem', backgroundColor: 'rgba(5, 150, 105, 0.03)',
                    color: '#059669', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.03)'; }}
                >
                  Nạp tiền vào ví
                </button>
              )}
            </div>

            {/* Notes Section */}
            {customer.notes && (
              <div style={{ backgroundColor: '#f1f5f9', borderRadius: '0.75rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', marginBottom: '0.25rem' }}>GHI CHÚ</div>
                <div style={{ fontSize: '0.875rem', color: '#475569', fontStyle: 'italic' }}>{customer.notes}</div>
              </div>
            )}
          </div>

          {/* Main Tabs Area */}
          <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Tabs Selector */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
              {/*
              <button
                onClick={() => setActiveTab('pets')}
                style={{
                  padding: '0.75rem 1rem', border: 'none', backgroundColor: 'transparent',
                  fontWeight: '700', fontSize: '1rem', cursor: 'pointer',
                  color: activeTab === 'pets' ? 'var(--primary)' : '#64748b',
                  borderBottom: activeTab === 'pets' ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Dog size={18} />
                Thú cưng ({pets?.length || 0})
              </button>
              */}
              <button
                onClick={() => setActiveTab('appointments')}
                style={{
                  padding: '0.75rem 1rem', border: 'none', backgroundColor: 'transparent',
                  fontWeight: '700', fontSize: '1rem', cursor: 'pointer',
                  color: activeTab === 'appointments' ? 'var(--primary)' : '#64748b',
                  borderBottom: activeTab === 'appointments' ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Calendar size={18} />
                Công việc ({appointments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('services')}
                style={{
                  padding: '0.75rem 1rem', border: 'none', backgroundColor: 'transparent',
                  fontWeight: '700', fontSize: '1rem', cursor: 'pointer',
                  color: activeTab === 'services' ? 'var(--primary)' : '#64748b',
                  borderBottom: activeTab === 'services' ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <ClipboardList size={18} />
                Lịch sử dịch vụ ({serviceOrders?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/*
              {activeTab === 'pets' && (
                ... (Pets listing code hidden)
              )}
              */}
              {activeTab === 'appointments' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Lịch trình cuộc hẹn</h4>
                    <button
                      onClick={() => { setSelectedAppt(null); setIsApptModalOpen(true); }}
                      className="btn-primary"
                      disabled={false}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      <Plus size={16} />
                      Tạo công việc mới
                    </button>
                  </div>

                  {loadingAppts ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải công việc...</div>
                  ) : !appointments || appointments.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8',
                      border: '2px dashed var(--border)', borderRadius: '1rem'
                    }}>
                      <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontWeight: '500' }}>Khách hàng này chưa có công việc nào.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {appointments.map((appt) => {
                        const apptDate = new Date(appt.dateTime);
                        const statusColors = {
                          PENDING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', label: 'Chờ khám' },
                          COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', label: 'Đã hoàn thành' },
                          CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', label: 'Đã hủy' },
                          NO_SHOW: { bg: 'rgba(107, 114, 128, 0.1)', text: '#4b5563', label: 'Không đến' },
                        }[appt.status] || { bg: '#f1f5f9', text: '#475569', label: appt.status };

                        return (
                          <div key={appt.id} style={{
                            border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.25rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{
                                width: '50px', height: '50px', borderRadius: '0.75rem', backgroundColor: '#f1f5f9',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid var(--border)'
                              }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                                  Th{apptDate.getMonth() + 1}
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.1 }}>
                                  {apptDate.getDate()}
                                </div>
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: '700', color: '#1e293b' }}>
                                    {apptDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    {appt.endDateTime && ` - ${new Date(appt.endDateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                  </span>
                                  <span style={{ color: '#94a3b8' }}>•</span>
                                  <span style={{ hour: '2-digit', minute: '2-digit' } as any}></span>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.15rem' }}>
                                  Lý do: <strong>{appt.purpose}</strong>
                                </div>
                                {appt.notes && (
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.25rem', display: 'flex', gap: '0.25rem' }}>
                                    <span style={{ fontWeight: '600' }}>Ghi chú:</span>
                                    <div dangerouslySetInnerHTML={{ __html: appt.notes }} className="html-notes-preview" style={{ display: 'inline', margin: 0 }} />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{
                                padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: '700',
                                backgroundColor: statusColors.bg, color: statusColors.text
                              }}>
                                {statusColors.label}
                              </span>

                              {appt.status === 'PENDING' && (
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => apptMutation.mutate({ id: appt.id, data: { status: 'COMPLETED' } })}
                                    title="Hoàn thành cuộc hẹn"
                                    style={{
                                      padding: '0.4rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', display: 'flex', alignItems: 'center'
                                    }}
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => apptMutation.mutate({ id: appt.id, data: { status: 'CANCELLED' } })}
                                    title="Hủy lịch"
                                    style={{
                                      padding: '0.4rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center'
                                    }}
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'services' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Lịch sử dịch vụ</h4>
                  </div>

                  {loadingServices ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải lịch sử dịch vụ...</div>
                  ) : !serviceOrders || serviceOrders.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8',
                      border: '2px dashed var(--border)', borderRadius: '1rem'
                    }}>
                      <ClipboardList size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontWeight: '500' }}>Khách hàng này chưa sử dụng dịch vụ nào.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {serviceOrders.map((order) => {
                        const orderDate = new Date(order.createdAt);
                        const serviceItems = order.items.filter((i: any) => i.product?.isService);
                        
                        return (
                          <div key={order.id} style={{
                            border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.25rem',
                            backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed var(--border)', paddingBottom: '0.75rem' }}>
                              <div>
                                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>Ngày: {orderDate.toLocaleDateString('vi-VN')}</div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Mã HĐ: {order.orderCode}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700',
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669'
                                }}>
                                  Đã hoàn thành
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Các dịch vụ đã sử dụng:</div>
                              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#334155' }}>
                                {serviceItems.map((item: any, idx: number) => (
                                  <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                    <strong>{item.product?.name}</strong>
                                    {item.quantity > 1 ? ` (x${item.quantity})` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Appointment Creation Modal */}
      <AppointmentModal
        isOpen={isApptModalOpen}
        onClose={() => { setIsApptModalOpen(false); setSelectedAppt(null); }}
        onSubmit={handleApptSubmit}
        customerId={customerId}
        appointment={selectedAppt}
      />

    </div>
  );
};

export default CustomerDetailsModal;
