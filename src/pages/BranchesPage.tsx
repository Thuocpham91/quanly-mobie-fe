import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Home, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Users,
  UserPlus
} from 'lucide-react';
import branchesApi, { type Branch } from '../api/branches';
import usersApi from '../api/users';
import BranchModal from '../components/BranchModal';
import UserModal from '../components/UserModal';
import ManageStaffModal from '../components/ManageStaffModal';
import Pagination from '../components/Pagination';
import { type PaginatedResponse } from '../api/client';

const BranchesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [branchForNewUser, setBranchForNewUser] = useState<string | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffBranch, setStaffBranch] = useState<{id: string, name: string} | null>(null);

  const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<Branch>>({
    queryKey: ['branches', page],
    queryFn: () => branchesApi.getBranches(page, 10),
  });

  const branches = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  const createMutation = useMutation({
    mutationFn: branchesApi.createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      alert(t('common.error') + ': ' + (error.response?.data?.message || error.message));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => branchesApi.updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsModalOpen(false);
      setSelectedBranch(null);
    },
    onError: (error: any) => {
      alert(t('common.error') + ': ' + (error.response?.data?.message || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: branchesApi.deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error: any) => {
      alert(t('common.error') + ': ' + (error.response?.data?.message || error.message));
    }
  });

  const createUserMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsUserModalOpen(false);
      setBranchForNewUser(null);
    },
  });

  const handleCreateOrUpdate = (data: any) => {
    if (selectedBranch) {
      updateMutation.mutate({ id: selectedBranch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('branches.delete_confirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setSelectedBranch(null);
    setIsModalOpen(true);
  };

   const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsModalOpen(true);
  };

  const openAddUserModal = (branchId: string) => {
    setBranchForNewUser(branchId);
    setIsUserModalOpen(true);
  };

  const openManageStaffModal = (branch: Branch) => {
    setStaffBranch({ id: branch.id, name: branch.name });
    setIsStaffModalOpen(true);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '0.25rem' }}>
            {t('branches.title')}
          </h1>
          <p style={{ color: '#64748b' }}>
            {t('branches.subtitle')}
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.75rem 1.25rem'
          }}
        >
          <Plus size={18} />
          {t('branches.add_new')}
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('branches.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('branches.table_name')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('branches.table_contact')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('branches.table_address')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('branches.table_status')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    {t('branches.fetching')}
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    {t('branches.no_branches')}
                  </td>
                </tr>
              ) : filteredBranches.map((branch) => (
                <tr key={branch.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '0.5rem', 
                        backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <Home size={18} />
                      </div>
                      <div style={{ fontWeight: '600' }}>{branch.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      {branch.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Phone size={14} color="#64748b" />
                          {branch.phone}
                        </div>
                      )}
                      {branch.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                          <Mail size={14} />
                          {branch.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={14} />
                      {branch.address || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {branch.isActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.875rem' }}>
                        <CheckCircle size={16} />
                        {t('users.active')}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
                        <XCircle size={16} />
                        {t('users.inactive')}
                      </div>
                    )}
                  </td>
                   <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        onClick={() => openManageStaffModal(branch)} 
                        title="Quản lý nhân sự"
                        style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.5rem' }}
                      >
                        <Users size={18} />
                      </button>
                      <button 
                        onClick={() => openAddUserModal(branch.id)} 
                        title={t('users.add_new')}
                        style={{ padding: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem' }}
                      >
                        <UserPlus size={18} />
                      </button>
                      <button onClick={() => openEditModal(branch)} style={{ padding: '0.5rem', backgroundColor: 'transparent', color: '#64748b' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(branch.id)} style={{ padding: '0.5rem', backgroundColor: 'transparent', color: '#ef4444' }}>
                        <Trash2 size={18} />
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

       <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        isLoading={createMutation.isPending || updateMutation.isPending}
        branch={selectedBranch}
      />

       <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={(data) => createUserMutation.mutate(data)}
        isLoading={createUserMutation.isPending}
        initialBranchId={branchForNewUser || undefined}
      />

      {staffBranch && (
        <ManageStaffModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          branchId={staffBranch.id}
          branchName={staffBranch.name}
        />
      )}
    </div>
  );
};

export default BranchesPage;
