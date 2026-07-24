import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, Building2, SlidersHorizontal } from 'lucide-react';
import { getDistributors, createDistributor, updateDistributor, deleteDistributor, type Distributor } from '../api/distributors';
import { useTranslation } from 'react-i18next';
import DistributorModal from '../components/DistributorModal';
import SearchDrawer from '../components/SearchDrawer';

const DistributorsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | undefined>();

  const activeFilterCount = (searchTerm ? 1 : 0) + (addressFilter ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm('');
    setAddressFilter('');
  };

  const { data: distributors = [], isLoading } = useQuery<Distributor[]>({
    queryKey: ['distributors'],
    queryFn: getDistributors,
  });

  const filteredDistributors = distributors.filter(d => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.name.toLowerCase().includes(q) || 
      (d.phone && d.phone.includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q));

    const matchesAddress = !addressFilter || (d.address && d.address.toLowerCase().includes(addressFilter.toLowerCase()));

    return matchesSearch && matchesAddress;
  });

  const createMutation = useMutation({
    mutationFn: createDistributor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Distributor> }) => updateDistributor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDistributor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors'] });
    }
  });

  const handleSubmit = async (data: Partial<Distributor>) => {
    if (selectedDistributor) {
      await updateMutation.mutateAsync({ id: selectedDistributor.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedDistributor(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('distributors.delete_confirm'))) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete distributor:', error);
      }
    }
  };

  return (
    <div style={{ paddingTop: '0.25rem' }}>
      {/* Header section with buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>{t('distributors.title')}</h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, marginTop: '0.1rem' }}>{t('distributors.subtitle')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Header Search input */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('distributors.search_placeholder')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsSearchDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <SlidersHorizontal size={16} color="#6366f1" />
            Menu tìm kiếm
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '0.05rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <button className="btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.375rem' }}>
            <Plus size={16} />
            {t('distributors.add_new')}
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{t('distributors.table_name')}</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{t('distributors.table_contact')}</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{t('distributors.table_address')}</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>{t('distributors.table_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{t('distributors.fetching')}</td>
                </tr>
              ) : filteredDistributors.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{t('distributors.no_distributors')}</td>
                </tr>
              ) : filteredDistributors.map((distributor) => (
                <tr key={distributor.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '0.375rem', 
                        backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <Building2 size={18} />
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{distributor.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {distributor.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <Phone size={13} color="#64748b" />
                          {distributor.phone}
                        </div>
                      )}
                      {distributor.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
                          <Mail size={13} />
                          {distributor.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <MapPin size={13} />
                      {distributor.address || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <button onClick={() => handleEdit(distributor)} style={{ padding: '0.35rem', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', border: 'none' }}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(distributor.id)} style={{ padding: '0.35rem', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', border: 'none' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DistributorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        distributor={selectedDistributor}
        onSubmit={handleSubmit}
      />

      {/* Right Search Drawer */}
      <SearchDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        title="Lọc nhà phân phối"
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>
              Từ khóa tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tên nhà phân phối, SĐT, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem' }}>
              Địa chỉ
            </label>
            <input
              type="text"
              placeholder="Tìm theo tỉnh thành, đường, địa chỉ..."
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </SearchDrawer>
    </div>
  );
};

export default DistributorsPage;
