import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Dog, User, Phone, CheckCircle, XCircle, Trash2, Clock, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon } from 'lucide-react';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, type Appointment } from '../api/appointments';
import { useBranchContext } from '../context/BranchContext';
import Pagination from '../components/Pagination';
import AppointmentModal from '../components/AppointmentModal';
import { getUserPermissions } from '../guards/permissions';

const AppointmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const { selectedBranchId } = useBranchContext();

  // Kiểm tra quyền
  const perms = getUserPermissions(selectedBranchId);
  const canManage = perms.includes('*') || perms.includes('appointments.manage');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | undefined>();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch appointments for List View
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['appointments', selectedBranchId, page, statusFilter],
    queryFn: () => getAppointments(selectedBranchId, page, 10),
  });

  const appointments = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Filter locally by search term & status
  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch = 
      appt.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appt.pet && appt.pet.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.customer && appt.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appt.customer && appt.customer.phone.includes(searchTerm));
      
    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Reset page when branch or filter changes
  React.useEffect(() => {
    setPage(1);
  }, [selectedBranchId, statusFilter]);

  // Fetch appointments for Calendar View (limit 1000 to get a large set)
  const { data: calendarData, isLoading: isCalendarLoading } = useQuery({
    queryKey: ['appointments_calendar', selectedBranchId],
    queryFn: () => getAppointments(selectedBranchId, 1, 1000),
    enabled: viewMode === 'calendar'
  });

  const calendarAppointments = calendarData?.data || [];
  const filteredCalendarAppts = calendarAppointments.filter((appt) => {
    const apptDate = new Date(appt.dateTime);
    const matchesMonth = apptDate.getFullYear() === currentMonth.getFullYear() && apptDate.getMonth() === currentMonth.getMonth();
    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchesMonth && matchesStatus;
  });

  // Calendar Helpers
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon = 0
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  // Mutations
  const apptMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const payload = {
        ...data,
        branchId: selectedBranchId || data.branchId || undefined,
      };
      if (id) {
        return updateAppointment(id, payload);
      } else {
        return createAppointment(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const handleSubmit = async (data: any) => {
    await apptMutation.mutateAsync({ id: selectedAppt?.id, data });
  };

  const handleAdd = () => {
    setSelectedAppt(undefined);
    setIsModalOpen(true);
  };

  const handleStatusChange = (id: string, status: string) => {
    apptMutation.mutate({ id, data: { status } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuộc hẹn này?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>Quản lý công việc</h1>
          <p style={{ color: '#64748b' }}>Quản lý và đặt lịch khám dịch vụ cho thú cưng.</p>
        </div>
        {canManage && (
          <button onClick={handleAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Tạo công việc
          </button>
        )}
      </div>

      {/* Filters Section */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '0.375rem',
                border: 'none', backgroundColor: viewMode === 'list' ? 'white' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary)' : '#64748b', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <ListIcon size={16} /> Danh sách
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '0.375rem',
                border: 'none', backgroundColor: viewMode === 'calendar' ? 'white' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--primary)' : '#64748b', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <LayoutGrid size={16} /> Lịch tháng
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm theo thú cưng, khách hàng, số điện thoại..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            {[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'PENDING', label: 'Chờ khám' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
              { value: 'CANCELLED', label: 'Đã hủy' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '2rem',
                  border: statusFilter === tab.value ? 'none' : '1px solid var(--border)',
                  backgroundColor: statusFilter === tab.value ? 'var(--primary)' : 'white',
                  color: statusFilter === tab.value ? 'white' : '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="card" style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Thời gian</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Thú cưng & Chủ nuôi</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Dịch vụ hẹn / Lý do</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách công việc...</td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy công việc nào.</td>
                </tr>
              ) : filteredAppointments.map((appt) => {
                const { date, time } = formatDateTime(appt.dateTime);
                const statusColors = {
                  PENDING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', label: 'Chờ khám' },
                  COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', label: 'Hoàn thành' },
                  CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', label: 'Đã hủy' },
                  NO_SHOW: { bg: 'rgba(107, 114, 128, 0.1)', text: '#4b5563', label: 'Không đến' },
                }[appt.status] || { bg: '#f1f5f9', text: '#475569', label: appt.status };

                return (
                  <tr key={appt.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    {/* Time */}
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontWeight: '750', fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={15} color="var(--primary)" />
                          {time}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                          {date}
                        </div>
                      </div>
                    </td>
                    
                    {/* Pet & Customer */}
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Dog size={16} color="#6366f1" />
                          {appt.pet?.name || 'Thú cưng đã xóa'} 
                          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#94a3b8' }}>
                            ({appt.pet?.species === 'Cat' ? 'Mèo' : 'Chó'})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={13} color="#94a3b8" />
                          {appt.customer?.fullName || 'Khách vãng lai'}
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <Phone size={11} color="#94a3b8" />
                          {appt.customer?.phone || 'N/A'}
                        </div>
                      </div>
                    </td>

                    {/* Purpose & Notes */}
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                          {appt.purpose}
                        </div>
                        {appt.user && (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                            <span style={{ fontWeight: '600' }}>Phụ trách:</span> {appt.user.fullName}
                          </div>
                        )}
                        {appt.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <span style={{ fontWeight: '600' }}>Ghi chú:</span>
                            <div dangerouslySetInnerHTML={{ __html: appt.notes }} className="html-notes-preview" style={{ display: 'inline', margin: 0 }} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '2rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        display: 'inline-block'
                      }}>
                        {statusColors.label}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {appt.status === 'PENDING' && canManage && (
                          <>
                            <button
                              onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                              title="Hoàn thành"
                              style={{ padding: '0.4rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', display: 'flex', alignItems: 'center' }}
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                              title="Hủy lịch"
                              style={{ padding: '0.4rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDelete(appt.id)}
                            title="Xóa công việc"
                            style={{ padding: '0.4rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', backgroundColor: 'transparent', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <Pagination 
            currentPage={meta.page} 
            totalPages={meta.totalPages} 
            onPageChange={setPage} 
            totalItems={meta.total}
          />
        )}
      </div>
      ) : (
        <div className="card" style={{ padding: '0' }}>
          {/* Calendar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
            <button onClick={prevMonth} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'white', cursor: 'pointer' }}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}</h2>
            <button onClick={nextMonth} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'white', cursor: 'pointer' }}>
              <ChevronRight size={20} />
            </button>
          </div>
          
          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
              <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: '#64748b' }}>{day}</div>
            ))}
          </div>
          
          {isCalendarLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải lịch tháng...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--border)', gap: '1px' }}>
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ backgroundColor: '#f8fafc', minHeight: '120px' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = i + 1;
                const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), date);
                // check if it's today
                const isToday = new Date().toDateString() === cellDate.toDateString();
                
                const dayAppts = filteredCalendarAppts.filter(appt => {
                  const d = new Date(appt.dateTime);
                  return d.getDate() === date;
                });
                
                // sort by time
                dayAppts.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
                
                return (
                  <div 
                    key={`day-${date}`} 
                    style={{ 
                      backgroundColor: isToday ? '#f0fdf4' : 'white', 
                      minHeight: '120px', 
                      padding: '0.5rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!canManage) return; // Không có quyền → không mở modal tạo
                      setSelectedAppt(undefined);
                      setIsModalOpen(true);
                    }}
                  >
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem', 
                      color: isToday ? '#16a34a' : '#334155', 
                      marginBottom: '0.25rem',
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      textAlign: 'center',
                      lineHeight: '24px',
                      borderRadius: isToday ? '50%' : '0',
                      backgroundColor: isToday ? '#dcfce7' : 'transparent'
                    }}>
                      {date}
                    </div>
                    {dayAppts.map(appt => {
                      const statusColors = {
                        PENDING: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#d97706' },
                        COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: '#059669' },
                        CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#dc2626' },
                        NO_SHOW: { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#4b5563' },
                      }[appt.status] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' };
                      
                      return (
                        <div 
                          key={appt.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppt(appt);
                            setIsModalOpen(true);
                          }}
                          style={{ 
                            backgroundColor: statusColors.bg, borderLeft: `3px solid ${statusColors.border}`, 
                            padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                          }}
                          title={`${new Date(appt.dateTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${appt.purpose} (${appt.pet?.name})${appt.user ? ` - Phụ trách: ${appt.user.fullName}` : ''}`}
                        >
                          <span style={{ fontWeight: '700', color: statusColors.text }}>{new Date(appt.dateTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>{' '}
                          {appt.pet?.name}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {/* Fill remaining cells */}
              {Array.from({ length: (7 - ((startingDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
                <div key={`empty-end-${i}`} style={{ backgroundColor: '#f8fafc', minHeight: '120px' }} />
              ))}
            </div>
          )}
        </div>
      )}

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedAppt(undefined); }}
        onSubmit={handleSubmit}
        appointment={selectedAppt}
      />
    </div>
  );
};

export default AppointmentsPage;
