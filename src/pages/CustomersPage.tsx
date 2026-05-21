import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, Eye } from 'lucide-react';
import { getCustomers, searchCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from '../api/customers';
import { type PaginatedResponse } from '../api/client';
import { useBranchContext } from '../context/BranchContext';
import Pagination from '../components/Pagination';
import CustomerModal from '../components/CustomerModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import { useTranslation } from 'react-i18next';

const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { selectedBranchId } = useBranchContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | undefined>();

  const { data: paginatedData, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', selectedBranchId, page, searchTerm],
    queryFn: async () => {
      if (searchTerm) {
        return searchCustomers(searchTerm, selectedBranchId, page, 10);
      }
      return getCustomers(selectedBranchId, page, 10);
    },
  });

  const customers = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Reset page when search term or branch changes
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedBranchId]);


  const createMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => {
      const payload: any = { ...data };
      if (selectedBranchId) payload.branchId = selectedBranchId;
      return createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const handleSubmit = async (data: Partial<Customer>) => {
    if (selectedCustomer) {
      await updateMutation.mutateAsync({ id: selectedCustomer.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(undefined);
    setIsModalOpen(true);
  };

  const handleViewDetails = (customer: Customer) => {
    setDetailCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('customers.delete_confirm'))) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete customer:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>{t('customers.title')}</h1>
          <p style={{ color: '#64748b' }}>{t('customers.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          {t('customers.add_new')}
        </button>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('customers.search_placeholder')} 
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
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('customers.table_name')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('customers.table_contact')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('customers.table_address')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem' }}>{t('customers.table_created')}</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b', fontSize: '0.875rem', textAlign: 'right' }}>{t('customers.table_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{t('customers.fetching')}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>{t('customers.no_customers')}</td>
                </tr>
              ) : customers.map((customer: Customer) => (
                <tr key={customer.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div 
                        onClick={() => handleViewDetails(customer)}
                        style={{ fontWeight: '650', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {customer.fullName}
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '0.15rem 0.4rem',
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
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <Phone size={14} color="#64748b" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                          <Mail size={14} />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                      <MapPin size={14} />
                      {customer.address || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => handleViewDetails(customer)} title="Xem chi tiết" style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#6366f1', cursor: 'pointer', border: 'none' }}>
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(customer)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', border: 'none' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(customer.id)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', border: 'none' }}>
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

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
        onSubmit={handleSubmit}
      />

      {detailCustomer && (
        <CustomerDetailsModal
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setDetailCustomer(undefined); }}
          customer={detailCustomer}
        />
      )}
    </div>
  );
};

export default CustomersPage;
