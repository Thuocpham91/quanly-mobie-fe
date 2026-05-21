import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Edit2, Trash2, Box, Info } from 'lucide-react';
import { getRooms, createRoom, updateRoom, deleteRoom, createCage, updateCage, deleteCage, type Room, type Cage, CageStatus } from '../api/boarding';
import { useBranchContext } from '../context/BranchContext';
import RoomModal from '../components/RoomModal';
import CageModal from '../components/CageModal';
import CageDetailView from '../components/CageDetailView';
import { getUserPermissions } from '../guards/permissions';

const BoardingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranchContext();

  const perms = getUserPermissions(selectedBranchId);
  const isAdminOrHasAll = perms.includes('*');
  const canManage = isAdminOrHasAll || perms.includes('boarding.manage');
  const canDelete = isAdminOrHasAll || perms.includes('boarding.delete');

  const [filterMode, setFilterMode] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  
  const [isCageModalOpen, setIsCageModalOpen] = useState(false);
  const [editingCage, setEditingCage] = useState<Cage | undefined>();
  const [targetRoomIdForCage, setTargetRoomIdForCage] = useState<string>('');


  const [selectedCageForDetails, setSelectedCageForDetails] = useState<Cage | null>(null);

  const isValidUuid = (id?: string) => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const cleanBranchId = isValidUuid(selectedBranchId) ? selectedBranchId : undefined;

  // Fetch Rooms with relations (cages)
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', cleanBranchId],
    queryFn: () => getRooms(cleanBranchId),
  });

  // Calculate stats
  const stats = useMemo(() => {
    let total = 0, empty = 0, occupied = 0, overdue = 0, dirty = 0, checkout = 0, deposited = 0;
    rooms.forEach(room => {
      (room.cages || []).forEach(cage => {
        total++;
        if (cage.status === CageStatus.AVAILABLE) empty++;
        if (cage.status === CageStatus.OCCUPIED) occupied++;
        if (cage.status === CageStatus.MAINTENANCE) dirty++;
        if (cage.status === CageStatus.CHECKOUT) checkout++;
        if (cage.status === CageStatus.OVERDUE) overdue++;
        if (cage.status === CageStatus.DEPOSITED) deposited++;
      });
    });
    return { total, empty, occupied, overdue, dirty, checkout, deposited };
  }, [rooms]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Mutations
  const roomMutation = useMutation({
    mutationFn: (data: Partial<Room>) => {
      if (editingRoom) {
        const { name, description } = data;
        return updateRoom(editingRoom.id, { name, description });
      }
      const finalBranchId = isValidUuid(selectedBranchId) ? selectedBranchId : data.branchId;
      return createRoom({ name: data.name, description: data.description, branchId: finalBranchId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });

  const deleteRoomMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });

  const cageMutation = useMutation({
    mutationFn: (data: Partial<Cage>) => {
      if (editingCage) {
        const { name, status, notes, petId } = data;
        return updateCage(editingCage.id, { name, status, notes, petId });
      }
      return createCage({ name: data.name, status: data.status, notes: data.notes, roomId: targetRoomIdForCage });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }) // We invalidate rooms because cages are fetched via rooms now
  });

  const deleteCageMutation = useMutation({
    mutationFn: deleteCage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });

  // Handlers
  const handleRoomSubmit = async (data: Partial<Room>) => {
    await roomMutation.mutateAsync(data);
  };

  const handleCageSubmit = async (data: Partial<Cage>) => {
    await cageMutation.mutateAsync(data);
  };

  const handleAddRoom = () => {
    setEditingRoom(undefined);
    setIsRoomModalOpen(true);
  };

  const handleAddCage = (roomId: string) => {
    setEditingCage(undefined);
    setTargetRoomIdForCage(roomId);
    setIsCageModalOpen(true);
  };

  const handleUpdateCageDetails = async (cageId: string, data: Partial<Cage>) => {
    const updated = await updateCage(cageId, data);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    setSelectedCageForDetails(prev => prev ? { ...prev, ...data } : null);
    return updated;
  };

  if (selectedCageForDetails) {
    return (
      <CageDetailView
        cage={selectedCageForDetails}
        onBack={() => setSelectedCageForDetails(null)}
        onUpdateCage={handleUpdateCageDetails}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#f3f4f6', padding: '1rem' }}>
      
      {/* Search and Top Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="Tìm kiếm SĐT người nuôi/mã vạch thú cưng..." 
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            borderRadius: '0.25rem',
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select 
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            style={{ padding: '0.6rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem', outline: 'none' }}
          >
            <option value="all">Tất cả phòng</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {canManage && (
            <button className="btn-primary" onClick={handleAddRoom} style={{ padding: '0.6rem 1.5rem', backgroundColor: '#2dd4bf', border: 'none', borderRadius: '0.25rem', color: 'white', fontWeight: '500' }}>
              Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Statistics / Filter Bar */}
      <div style={{ 
        display: 'flex', 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        overflow: 'hidden'
      }}>
        <FilterTab label={`Tất cả (${stats.total})`} active={filterMode === 'all'} onClick={() => setFilterMode('all')} color="#374151" />
        <FilterTab label={`Trống (${stats.empty})`} active={filterMode === 'empty'} onClick={() => setFilterMode('empty')} color="#6b7280" />
        <FilterTab label={`Xuất chuồng (${stats.checkout})`} active={filterMode === 'checkout'} onClick={() => setFilterMode('checkout')} color="#eab308" />
        <FilterTab label={`Đang ở (${stats.occupied})`} active={filterMode === 'occupied'} onClick={() => setFilterMode('occupied')} color="#10b981" />
        <FilterTab label={`Quá hạn (${stats.overdue})`} active={filterMode === 'overdue'} onClick={() => setFilterMode('overdue')} color="#ef4444" />
        <FilterTab label={`Đã cọc (${stats.deposited})`} active={filterMode === 'deposited'} onClick={() => setFilterMode('deposited')} color="#3b82f6" />
        <FilterTab label={`Bẩn (${stats.dirty})`} active={filterMode === 'dirty'} onClick={() => setFilterMode('dirty')} color="#475569" />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {rooms
            .filter(room => selectedRoomFilter === 'all' || room.id === selectedRoomFilter)
            .map(room => (
            <div key={room.id} style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Room Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151', margin: 0 }}>
                    {room.name} ({room.cages?.length || 0})
                  </h3>
                  {(canManage || canDelete) && (
                    <div style={{ position: 'relative' }}>
                      <Settings 
                        size={18} 
                        color="#6b7280" 
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === `room-${room.id}` ? null : `room-${room.id}`);
                        }}
                      />
                      {/* Room Dropdown Menu */}
                      {activeDropdown === `room-${room.id}` && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem',
                          backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.25rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, width: '140px'
                        }}>
                          {canManage && <DropdownItem icon={<Plus size={14} />} label="Thêm mới" onClick={() => handleAddCage(room.id)} />}
                          {canManage && <DropdownItem icon={<Edit2 size={14} />} label="Cập nhật" onClick={() => { setEditingRoom(room); setIsRoomModalOpen(true); }} />}
                          {canDelete && <DropdownItem icon={<Trash2 size={14} />} label="Xóa" onClick={() => {
                            if (window.confirm('Bạn có chắc muốn xóa phòng này?')) deleteRoomMutation.mutate(room.id);
                          }} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Cages Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '1rem' 
              }}>
                {(room.cages || [])
                  .filter(cage => {
                    if (filterMode === 'all') return true;
                    if (filterMode === 'empty') return cage.status === CageStatus.AVAILABLE;
                    if (filterMode === 'checkout') return cage.status === CageStatus.CHECKOUT;
                    if (filterMode === 'occupied') return cage.status === CageStatus.OCCUPIED;
                    if (filterMode === 'overdue') return cage.status === CageStatus.OVERDUE;
                    if (filterMode === 'deposited') return cage.status === CageStatus.DEPOSITED;
                    if (filterMode === 'dirty') return cage.status === CageStatus.MAINTENANCE;
                    return true;
                  })
                  .map(cage => {
                    // Determine header color
                    const getHeaderColor = (status: CageStatus) => {
                      switch (status) {
                        case CageStatus.AVAILABLE:
                          return '#9ca3af'; // Trống
                        case CageStatus.OCCUPIED:
                          return '#10b981'; // Đang ở
                        case CageStatus.CHECKOUT:
                          return '#eab308'; // Xuất chuồng
                        case CageStatus.OVERDUE:
                          return '#ef4444'; // Quá hạn
                        case CageStatus.DEPOSITED:
                          return '#3b82f6'; // Đã cọc
                        case CageStatus.MAINTENANCE:
                          return '#475569'; // Bẩn
                        default:
                          return '#9ca3af';
                      }
                    };

                    const getStatusText = (status: CageStatus) => {
                      switch (status) {
                        case CageStatus.AVAILABLE:
                          return 'Trống';
                        case CageStatus.MAINTENANCE:
                          return 'Bảo trì / Đang dọn';
                        case CageStatus.CHECKOUT:
                          return 'Chuẩn bị xuất chuồng';
                        case CageStatus.DEPOSITED:
                          return 'Đã nhận cọc';
                        case CageStatus.OVERDUE:
                          return 'Lưu trú quá hạn!';
                        default:
                          return 'Trống';
                      }
                    };

                    const hasPet = cage.status !== CageStatus.AVAILABLE && cage.status !== CageStatus.MAINTENANCE && cage.pet;

                    return (
                      <div key={cage.id} 
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '140px',
                          cursor: 'pointer',
                          transition: 'transform 0.1s, box-shadow 0.1s'
                        }}
                        onClick={() => {
                          setSelectedCageForDetails(cage);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Cage Header */}
                        <div style={{ 
                          backgroundColor: getHeaderColor(cage.status),
                          color: 'white',
                          padding: '0.4rem 0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          <span>{cage.name}</span>
                          {(canManage || canDelete) && (
                            <div style={{ position: 'relative' }}>
                              <Settings 
                                size={14} 
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === `cage-${cage.id}` ? null : `cage-${cage.id}`);
                                }}
                              />
                              {/* Cage Dropdown Menu */}
                              {activeDropdown === `cage-${cage.id}` && (
                                <div style={{
                                  position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem',
                                  backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.25rem',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, width: '120px',
                                  color: '#374151', fontWeight: 'normal'
                                }}>
                                  {canManage && <DropdownItem icon={<Edit2 size={14} />} label="Cập nhật" onClick={() => {
                                    setEditingCage(cage); setTargetRoomIdForCage(room.id); setIsCageModalOpen(true);
                                  }} />}
                                  <DropdownItem icon={<Info size={14} />} label="Chi tiết" onClick={() => {
                                     setSelectedCageForDetails(cage);
                                   }} />
                                  {canManage && cage.status === CageStatus.AVAILABLE && (
                                    <DropdownItem icon={<Box size={14} />} label="Nhập chuồng" onClick={() => {
                                       setSelectedCageForDetails(cage);
                                    }} />
                                  )}
                                  {canDelete && <DropdownItem icon={<Trash2 size={14} />} label="Xóa" onClick={() => {
                                    if (window.confirm('Bạn có chắc muốn xóa chuồng này?')) deleteCageMutation.mutate(cage.id);
                                  }} />}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Cage Body */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
                          {hasPet ? (
                            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ width: '40px', height: '40px', backgroundColor: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                                <Box size={24} />
                              </div>
                              <div style={{ flex: 1, fontSize: '0.75rem', color: '#4b5563' }}>
                                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>{cage.pet.owner?.fullName || 'Khách hàng'}</div>
                                <div>{cage.pet.name} - {cage.pet.species || 'Chó/Mèo'} - {cage.pet.weight || '--'}kg</div>
                                <div>Ngày lưu: {cage.updatedAt ? new Date(cage.updatedAt).toLocaleDateString() : '--'}</div>
                                <div style={{ fontWeight: cage.status === CageStatus.OVERDUE ? '700' : 'normal', color: cage.status === CageStatus.OVERDUE ? '#ef4444' : '#4b5563' }}>
                                  Trạng thái: {cage.status === CageStatus.OVERDUE ? 'QUÁ HẠN!' : cage.status === CageStatus.DEPOSITED ? 'ĐÃ CỌC' : cage.status === CageStatus.CHECKOUT ? 'XUẤT CHUỒNG' : 'ĐANG Ở'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontWeight: '500', fontSize: '0.875rem' }}>
                              {getStatusText(cage.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        room={editingRoom}
        onSubmit={handleRoomSubmit}
      />

      {targetRoomIdForCage && (
        <CageModal
          isOpen={isCageModalOpen}
          onClose={() => setIsCageModalOpen(false)}
          cage={editingCage}
          roomId={targetRoomIdForCage}
          onSubmit={handleCageSubmit}
        />
      )}

    </div>
  );
};

// UI Components
const FilterTab: React.FC<{ label: string; active: boolean; onClick: () => void; color: string }> = ({ label, active, onClick, color }) => (
  <button 
    onClick={onClick}
    style={{ 
      flex: 1, 
      padding: '0.75rem', 
      backgroundColor: 'white', 
      border: 'none', 
      borderRight: '1px solid #e5e7eb',
      borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
      color: active ? color : '#6b7280',
      fontWeight: active ? '600' : '500',
      fontSize: '0.875rem',
      cursor: 'pointer',
      outline: 'none'
    }}
  >
    {label}
  </button>
);

const DropdownItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{
      padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
      fontSize: '0.875rem', cursor: 'pointer',
      borderBottom: '1px solid #f3f4f6'
    }}
    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
  >
    {icon}
    {label}
  </div>
);

export default BoardingPage;
