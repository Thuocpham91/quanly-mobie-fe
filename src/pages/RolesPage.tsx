import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Edit2, Trash2, 
  ChevronRight, 
  X, Save, Users as UsersIcon
} from 'lucide-react';
import { getRoles, getPermissions, createRole, updateRole, deleteRole, removeUserFromBranch } from '../api/roles';
import branchesApi from '../api/branches';
import type { Role, Permission } from '../api/roles';
import { useTranslation } from 'react-i18next';

import { useSearchParams } from 'react-router-dom';
import usersApi from '../api/users';
import { assignUserBranchRole } from '../api/roles';

const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  
  const [activeTab, setActiveTab] = useState<'permissions' | 'timing' | 'logs'>('permissions');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId);

  // Fetch Users
  const { data: usersPaginated } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(undefined, 1, 100)
  });
  const allUsers = usersPaginated?.data || [];

  // Fetch Target User details
  const { data: targetUser } = useQuery({
    queryKey: ['user', currentUserId],
    queryFn: () => usersApi.getUsers(undefined, 1, 100).then(res => res.data.find(u => u.id === currentUserId)),
    enabled: !!currentUserId
  });

  // Modals / State for creating/editing role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');

  // Fetch Data
  const { data: branchesPaginated } = useQuery({ 
    queryKey: ['branches'], 
    queryFn: () => branchesApi.getBranches(1, 50) 
  });
  const branches = branchesPaginated?.data || [];

  const { data: roles = [] } = useQuery({ 
    queryKey: ['roles'], 
    queryFn: getRoles 
  });

  // Update selected role based on user's assignment for selected branch
  React.useEffect(() => {
    if (currentUserId && targetUser && selectedBranchId) {
      const assignment = targetUser.userBranchRoles?.find(ubr => ubr.branchId === selectedBranchId);
      if (assignment) {
        setSelectedRoleId(assignment.roleId);
      } else {
        setSelectedRoleId('');
      }
    }
  }, [currentUserId, targetUser, selectedBranchId]);

  const { data: groupedPermissions = {} } = useQuery({ 
    queryKey: ['permissions'], 
    queryFn: getPermissions 
  });

  // Current selected role object
  const currentRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  // Initial role selection
  React.useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  // Initial branch selection
  React.useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Permissions state (local to current selection)
  const [localPermissionIds, setLocalPermissionIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (currentRole) {
      setLocalPermissionIds(currentRole.permissions.map(p => p.id));
    } else {
      setLocalPermissionIds([]);
    }
  }, [currentRole]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: { permissionIds: string[] }) => updateRole(selectedRoleId, { permissionIds: data.permissionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsRoleModalOpen(false);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      if (roles.length > 1) setSelectedRoleId(roles[0].id);
    }
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: () => removeUserFromBranch(selectedBranchId, currentUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', currentUserId] });
      alert('Đã gỡ vai trò của nhân viên tại chi nhánh này!');
      setSelectedRoleId('');
    }
  });

  const handleDeleteAction = () => {
    if (currentUserId) {
      if (window.confirm('Gỡ vai trò của nhân viên tại chi nhánh này?')) {
        removeAssignmentMutation.mutate();
      }
    } else {
      if (window.confirm('Xóa hoàn toàn định nghĩa vai trò này khỏi hệ thống?')) {
        deleteRoleMutation.mutate(selectedRoleId);
      }
    }
  };

  const handleTogglePermission = (id: string) => {
    setLocalPermissionIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    
    if (currentUserId) {
      // Assign role to user for selected branch
      assignUserBranchRole(selectedBranchId, currentUserId, selectedRoleId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['user', currentUserId] });
        alert('Đã cập nhật vai trò cho nhân viên!');
      });
    } else {
      // Update the role definition itself
      updateMutation.mutate({ permissionIds: localPermissionIds });
    }
  };

  const handleOpenRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDesc(role.description);
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleDesc('');
    }
    setIsRoleModalOpen(true);
  };

  // Helper to detect hierarchy within a module
  // If a permission name contains a dot and there is a shorter name with same prefix, it might be a child.
  // Actually, we'll just group them by module as in the image.
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f1f5f9' }}>
      
      {/* Page Header & Tabs */}
      <div style={{ backgroundColor: 'white', padding: '1rem 1.5rem 0 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f97316', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {t('roles.title')}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff7ed', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #ffedd5' }}>
            <UsersIcon size={16} />
            <select
              value={currentUserId || ''}
              onChange={(e) => setCurrentUserId(e.target.value || null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#c2410c',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Chọn nhân viên --</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>
        </h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button 
            onClick={() => setActiveTab('permissions')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              borderBottom: activeTab === 'permissions' ? '3px solid #f97316' : '3px solid transparent',
              borderRadius: 0,
              backgroundColor: activeTab === 'permissions' ? '#fff' : 'transparent',
              color: activeTab === 'permissions' ? '#334155' : '#64748b',
              fontWeight: activeTab === 'permissions' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            Phân quyền
          </button>
          <button 
            onClick={() => setActiveTab('timing')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              borderBottom: activeTab === 'timing' ? '3px solid #f97316' : '3px solid transparent',
              borderRadius: 0,
              backgroundColor: activeTab === 'timing' ? '#fff' : 'transparent',
              color: activeTab === 'timing' ? '#334155' : '#64748b',
              fontWeight: activeTab === 'timing' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            Thời gian truy cập
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            style={{ 
              padding: '0.6rem 1.25rem', 
              borderBottom: activeTab === 'logs' ? '3px solid #f97316' : '3px solid transparent',
              borderRadius: 0,
              backgroundColor: activeTab === 'logs' ? '#fff' : 'transparent',
              color: activeTab === 'logs' ? '#334155' : '#64748b',
              fontWeight: activeTab === 'logs' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            Lịch sử thao tác
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
        
        {/* Branch Selection: Sidebar on Desktop, Horizontal Scroll on Mobile */}
        <div style={{ 
          width: isMobile ? '100%' : '240px', 
          backgroundColor: 'white', 
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0', 
          borderBottom: isMobile ? '1px solid #e2e8f0' : 'none',
          display: 'flex', 
          flexDirection: isMobile ? 'row' : 'column',
          overflowX: isMobile ? 'auto' : 'visible'
        }}>
          {!isMobile && (
            <div style={{ padding: '0.75rem', backgroundColor: '#10b981', color: 'white', fontWeight: '700', textAlign: 'center', fontSize: '0.875rem' }}>
              Chi nhánh
            </div>
          )}
          <div style={{ 
            flex: 1, 
            overflowY: isMobile ? 'hidden' : 'auto', 
            display: isMobile ? 'flex' : 'block',
            minHeight: isMobile ? 'auto' : '0'
          }}>
            {branches.map(branch => (
              <div 
                key={branch.id}
                onClick={() => setSelectedBranchId(branch.id)}
                style={{ 
                  padding: isMobile ? '0.6rem 1rem' : '0.75rem 1rem', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem',
                  backgroundColor: selectedBranchId === branch.id ? '#f1f5f9' : 'transparent',
                  color: selectedBranchId === branch.id ? '#10b981' : '#64748b',
                  fontWeight: selectedBranchId === branch.id ? '600' : '400',
                  borderBottom: isMobile ? 'none' : '1px solid #f1f5f9',
                  borderRight: isMobile && selectedBranchId === branch.id ? '2px solid #10b981' : 'none',
                  textAlign: isMobile ? 'left' : 'center',
                  whiteSpace: isMobile ? 'nowrap' : 'normal'
                }}
              >
                {branch.name}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: isMobile ? '1rem' : '1.5rem' }}>
          
          {/* Role Selection Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: '600', color: '#334155', fontSize: '0.875rem' }}>Vai trò</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <select 
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  minWidth: isMobile ? '120px' : '150px',
                  fontSize: '0.875rem'
                }}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              
              <button 
                onClick={handleDeleteAction}
                style={{ padding: '0.4rem', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '4px' }}
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => handleOpenRoleModal(currentRole!)}
                style={{ padding: '0.4rem', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '4px' }}
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleOpenRoleModal()}
                style={{ padding: '0.4rem', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '4px' }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ marginLeft: isMobile ? '0' : 'auto', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '0.5rem' : '0' }}>
               <button 
                className="btn-primary" 
                onClick={handleSavePermissions}
                disabled={updateMutation.isPending}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.5rem', 
                  backgroundColor: '#f97316',
                  padding: '0.5rem 1.25rem',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                <Save size={18} />
                Lưu thay đổi
              </button>
            </div>
          </div>

          {/* Permissions Grid */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            paddingRight: '0.5rem'
          }}>
            {Object.keys(groupedPermissions).map(module => (
              <div key={module}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  color: '#f97316', 
                  fontWeight: '700', 
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <ChevronRight size={14} />
                  {module}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.5rem' }}>
                  {groupedPermissions[module].map((p: Permission) => {
                    // Detect if this is a sub-permission (naive check: contains more than one dot or specific keywords)
                    
                    // Actually, let's just use a more manual approach or name based:
                    // If it's not the first one in the module and the module has multiple? 
                    // Let's use a simple indent for everything after the first one if it looks like a sub action
                    const looksLikeSub = p.displayName.includes('Sửa') || p.displayName.includes('Xóa') || p.displayName.includes('Hủy') || p.displayName.includes('Thêm');

                    return (
                      <label 
                        key={p.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.6rem', 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#334155',
                          paddingLeft: looksLikeSub ? '1.25rem' : '0'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={localPermissionIds.includes(p.id)}
                          onChange={() => handleTogglePermission(p.id)}
                          style={{ accentColor: '#10b981', width: '1.1rem', height: '1.1rem' }}
                        />
                        <span style={{ fontWeight: localPermissionIds.includes(p.id) ? '600' : '400' }}>
                          {p.displayName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Creation/Edit Modal */}
      {isRoleModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700' }}>{editingRole ? 'Sửa vai trò' : 'Thêm vai trò mới'}</h2>
              <button onClick={() => setIsRoleModalOpen(false)} style={{ backgroundColor: 'transparent', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.375rem' }}>Tên vai trò</label>
                <input 
                  type="text" 
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
                  placeholder="Ví dụ: Bác sĩ nội khoa"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.375rem' }}>Mô tả</label>
                <textarea 
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', height: '80px' }}
                  placeholder="Mô tả công việc của vai trò này..."
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    if (editingRole) {
                      updateRole(editingRole.id, { name: roleName, description: roleDesc }).then(() => queryClient.invalidateQueries({ queryKey: ['roles'] }));
                      setIsRoleModalOpen(false);
                    } else {
                      createRoleMutation.mutate({ name: roleName, description: roleDesc, permissionIds: [] });
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#f97316' }}
                >
                  {editingRole ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button 
                  onClick={() => setIsRoleModalOpen(false)}
                  style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#64748b' }}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
