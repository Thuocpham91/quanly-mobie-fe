import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, Building2 } from 'lucide-react';
import { getDistributors, createDistributor, updateDistributor, deleteDistributor, type Distributor } from '../api/distributors';
import { useTranslation } from 'react-i18next';
import DistributorModal from '../components/DistributorModal';

const DistributorsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | undefined>();

  const { data: distributors = [], isLoading } = useQuery<Distributor[]>({
    queryKey: ['distributors'],
    queryFn: getDistributors,
  });

  const filteredDistributors = distributors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.phone && d.phone.includes(searchTerm)) ||
    (d.email && d.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>{t('distributors.title')}</h1>
          <p style={{ color: '#64748b' }}>{t('distributors.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          {t('distributors.add_new')}
        </button>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('distributors.search_placeholder')} 
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
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('distributors.table_name')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('distributors.table_contact')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('distributors.table_address')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>{t('distributors.table_actions')}</th>
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
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '0.5rem', 
                        backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <Building2 size={20} />
                      </div>
                      <div style={{ fontWeight: '600' }}>{distributor.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {distributor.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                          <Phone size={14} color="#64748b" />
                          {distributor.phone}
                        </div>
                      )}
                      {distributor.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                          <Mail size={14} />
                          {distributor.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                      <MapPin size={14} />
                      {distributor.address || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(distributor)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(distributor.id)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
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
    </div>
  );
};

export default DistributorsPage;
