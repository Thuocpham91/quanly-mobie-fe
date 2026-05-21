import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Dog, User, Calendar, Edit2, Trash2, Tag } from 'lucide-react';
import { getPets, createPet, updatePet, deletePet } from '../api/pets';
import { useBranchContext } from '../context/BranchContext';
import Pagination from '../components/Pagination';
import PetModal from '../components/PetModal';

const PetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { selectedBranchId } = useBranchContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['pets', selectedBranchId, page, searchTerm],
    queryFn: () => getPets(selectedBranchId, page, 10),
  });

  const pets = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Filter locally based on search term
  const filteredPets = pets.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.owner && p.owner.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset page when branch changes
  React.useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  const petMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const payload = {
        ...data,
        branchId: selectedBranchId || undefined,
      };
      if (id) {
        return updatePet(id, payload);
      } else {
        return createPet(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });

  const handleSubmit = async (data: any) => {
    await petMutation.mutateAsync({ id: selectedPet?.id, data });
  };

  const handleEdit = (pet: any) => {
    setSelectedPet(pet);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPet(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thú cưng ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>Quản lý thú cưng</h1>
          <p style={{ color: '#64748b' }}>Quản lý danh sách bệnh nhân và lịch sử bệnh lý.</p>
        </div>
        <button onClick={handleAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          Đăng ký thú cưng
        </button>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm thú cưng hoặc chủ nuôi..." 
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
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Thú cưng</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Loài & Giống</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Chủ nuôi</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>Ngày sinh / Tuổi</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách thú cưng...</td>
                </tr>
              ) : filteredPets?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy thú cưng nào.</td>
                </tr>
              ) : filteredPets?.map((pet) => (
                <tr key={pet.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '0.75rem', 
                        backgroundColor: pet.species === 'Cat' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: pet.species === 'Cat' ? '#10b981' : 'var(--primary)'
                      }}>
                        <Dog size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{pet.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Giới tính: {pet.gender === 'male' ? 'Đực' : pet.gender === 'female' ? 'Cái' : 'Chưa rõ'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{pet.species === 'Cat' ? 'Mèo' : pet.species === 'Dog' ? 'Chó' : pet.species}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Tag size={12} />
                        {pet.breed || 'Chưa rõ giống'}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                        <User size={14} color="#64748b" />
                        {pet.owner?.fullName || 'Chưa rõ'}
                      </div>
                      {pet.owner?.phone && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '1.2rem' }}>
                          SĐT: {pet.owner.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} />
                      {pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa rõ'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(pet)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', border: 'none' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(pet.id, pet.name)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', border: 'none' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      <PetModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedPet(null); }}
        onSubmit={handleSubmit}
        pet={selectedPet}
      />
    </div>
  );
};

export default PetsPage;
