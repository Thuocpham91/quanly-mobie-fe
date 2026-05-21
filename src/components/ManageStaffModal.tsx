import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, Check, Plus, Loader2 } from 'lucide-react';
import usersApi, { type User } from '../api/users';
import { getRoles } from '../api/roles';

interface ManageStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
}

const ManageStaffModal: React.FC<ManageStaffModalProps> = ({ isOpen, onClose, branchId, branchName }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: paginatedUsers, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(undefined, 1, 100),
    enabled: isOpen
  });

  const users = paginatedUsers?.data || [];

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    enabled: isOpen
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, branchRoleAssignments }: { id: string; branchRoleAssignments: { branchId: string; roleId: string }[] }) => 
      usersApi.updateUser(id, { branchRoleAssignments } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const toggleUserAssignment = (user: User) => {
    const currentAssignments = user.userBranchRoles?.map(ubr => ({
      branchId: ubr.branchId,
      roleId: ubr.roleId
    })) || [];
    
    const isAssigned = currentAssignments.some(a => a.branchId === branchId);
    
    let newAssignments: { branchId: string; roleId: string }[];
    if (isAssigned) {
      newAssignments = currentAssignments.filter(a => a.branchId !== branchId);
    } else {
      const defaultRoleId = roles[0]?.id || '';
      newAssignments = [...currentAssignments, { branchId, roleId: defaultRoleId }];
    }
    
    updateMutation.mutate({ id: user.id, branchRoleAssignments: newAssignments });
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u: User) => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Quản lý nhân sự</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{branchName}</p>
          </div>
          <button onClick={onClose} style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            color: '#64748b',
            backgroundColor: 'transparent'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Tìm nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem 0.625rem 2.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        {/* User List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          ) : filteredUsers.map((user: User) => {
            const isAssigned = user.userBranchRoles?.some(ubr => ubr.branchId === branchId);
            const isUpdating = updateMutation.isPending && updateMutation.variables?.id === user.id;
            
            return (
              <div 
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => !isUpdating && toggleUserAssignment(user)}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{user.fullName}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {user.userBranchRoles?.[0]?.role?.name || 'Staff'} • {user.email}
                  </span>
                </div>
                
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isAssigned ? 'var(--primary)' : '#f1f5f9',
                  color: isAssigned ? 'white' : '#94a3b8',
                  border: isAssigned ? 'none' : '1px solid var(--border)'
                }}>
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : isAssigned ? <Check size={14} /> : <Plus size={14} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem' }}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageStaffModal;
