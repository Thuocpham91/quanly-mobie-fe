import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Save, ChevronDown, Plus, Edit2, Trash2, X, Check,
  AlertTriangle, Search, Users, MapPin, UserCheck, UserX, RefreshCw,
} from 'lucide-react';
import { getRoles, getPermissions, createRole, updateRole, deleteRole, assignUserBranchRole, removeUserFromBranch } from '../api/roles';
import type { Role, Permission } from '../api/roles';
import usersApi from '../api/users';
import branchesApi from '../api/branches';

/* ═══════════════════════════════════════════
   HELPERS & CONSTANTS
═══════════════════════════════════════════ */
const MODULE_ICONS: Record<string, string> = {
  'Tổng quan':             '🏠',
  'Nội trú / Chuồng trại': '🐾',
  'Bán hàng':              '🛒',
  'Kho hàng':              '📦',
  'Hệ thống':             '🛡️',
};
const MODULE_COLORS: Record<string, string> = {
  'Tổng quan':             '#6366f1',
  'Nội trú / Chuồng trại': '#14b8a6',
  'Bán hàng':              '#ef4444',
  'Kho hàng':              '#f59e0b',
  'Hệ thống':             '#8b5cf6',
};
const ROLE_COLORS: Record<string, string> = {
  'Admin': '#6366f1', 'Quản lý': '#10b981', 'Nhân viên': '#f59e0b',
};
const ROLE_ICONS: Record<string, string> = {
  'Admin': '👑', 'Quản lý': '🏢', 'Nhân viên': '👤',
};

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════ */
const Toast: React.FC<{ msg: string; type?: 'success' | 'error'; onClose: () => void }> = ({ msg, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: type === 'success' ? '#10b981' : '#ef4444',
    color: 'white', padding: '0.875rem 1.25rem', borderRadius: '0.75rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontWeight: '600', fontSize: '0.875rem',
    animation: 'slideIn 0.3s ease',
  }}>
    {type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
    {msg}
    <button onClick={onClose} style={{ background: 'none', color: 'white', marginLeft: '0.5rem' }}><X size={16} /></button>
  </div>
);

/* ═══════════════════════════════════════════
   TAB 1 — QUẢN LÝ VAI TRÒ & QUYỀN
═══════════════════════════════════════════ */
const RoleCard: React.FC<{ role: Role; selected: boolean; onClick: () => void; onEdit: () => void; onDelete: () => void }> = ({ role, selected, onClick, onEdit, onDelete }) => {
  const isSystem = ['Admin', 'Quản lý', 'Nhân viên'].includes(role.name);
  return (
    <div onClick={onClick} style={{
      padding: '1rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer',
      border: selected ? '2px solid #6366f1' : '1px solid #e2e8f0',
      background: selected ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : 'white',
      boxShadow: selected ? '0 4px 14px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
          background: selected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected ? 'white' : '#94a3b8',
        }}><Shield size={18} /></div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: '700', fontSize: '0.9rem', color: selected ? '#4338ca' : '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role.name}</p>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            {role.permissions?.length ?? 0} quyền {isSystem && <span style={{ color: '#6366f1', fontWeight: '600' }}>• Hệ thống</span>}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} style={{ padding: '0.3rem', background: 'none', color: '#94a3b8', borderRadius: '0.375rem' }}
          onMouseOver={e => (e.currentTarget.style.background = '#f1f5f9')} onMouseOut={e => (e.currentTarget.style.background = 'none')}>
          <Edit2 size={14} />
        </button>
        {!isSystem && (
          <button onClick={onDelete} style={{ padding: '0.3rem', background: 'none', color: '#94a3b8', borderRadius: '0.375rem' }}
            onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const ModuleBlock: React.FC<{ module: string; permissions: Permission[]; checkedIds: string[]; onToggle: (id: string) => void; onToggleAll: (ids: string[], checked: boolean) => void }> = ({ module, permissions, checkedIds, onToggle, onToggleAll }) => {
  const [open, setOpen] = useState(true);
  const color = MODULE_COLORS[module] || '#6366f1';
  const ids = permissions.map(p => p.id);
  const allChecked = ids.every(id => checkedIds.includes(id));
  const someChecked = ids.some(id => checkedIds.includes(id));
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', background: 'white' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', cursor: 'pointer', background: open ? `${color}08` : 'white', borderBottom: open ? `1px solid ${color}20` : 'none', userSelect: 'none' }}>
        <span style={{ fontSize: '1.1rem' }}>{MODULE_ICONS[module] || '🔧'}</span>
        <span style={{ flex: 1, fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{module}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={e => onToggleAll(ids, e.target.checked)} style={{ accentColor: color, width: '1rem', height: '1rem' }} />
          Tất cả
        </label>
        <div style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}><ChevronDown size={16} /></div>
      </div>
      {open && (
        <div style={{ padding: '0.75rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {permissions.map(p => {
            const checked = checkedIds.includes(p.id);
            return (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: checked ? `${color}0a` : 'transparent', border: `1px solid ${checked ? color + '30' : 'transparent'}`, transition: 'all 0.15s' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0, border: `2px solid ${checked ? color : '#cbd5e1'}`, background: checked ? color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {checked && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <input type="checkbox" checked={checked} onChange={() => onToggle(p.id)} style={{ display: 'none' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: checked ? '600' : '400', color: checked ? '#1e293b' : '#475569' }}>{p.displayName}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{p.name}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RoleModal: React.FC<{ role: Role | null; onClose: () => void; onSave: (name: string, desc: string) => void; loading?: boolean }> = ({ role, onClose, onSave, loading }) => {
  const [name, setName] = useState(role?.name ?? '');
  const [desc, setDesc] = useState(role?.description ?? '');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="modal-box w-full max-w-md" style={{ background: 'white', borderRadius: '1rem', padding: '1.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1e293b', margin: 0 }}>{role ? '✏️ Sửa vai trò' : '➕ Thêm vai trò mới'}</h2>
          <button onClick={onClose} style={{ background: 'none', color: '#94a3b8' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#374151' }}><span style={{ color: '#ef4444' }}>*</span> Tên vai trò</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Bác sĩ thú y"
              style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: '#374151' }}>Mô tả</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Mô tả vai trò..."
              style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button onClick={() => name.trim() && onSave(name.trim(), desc)} disabled={!name.trim() || loading}
              style={{ flex: 1, padding: '0.7rem', borderRadius: '0.5rem', fontWeight: '700', fontSize: '0.9rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', cursor: name ? 'pointer' : 'not-allowed', opacity: name ? 1 : 0.6 }}>
              {loading ? 'Đang lưu...' : (role ? 'Cập nhật' : 'Tạo mới')}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: '0.7rem', borderRadius: '0.5rem', fontWeight: '600', background: '#f1f5f9', color: '#64748b' }}>Hủy</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   TAB 2 — PHÂN QUYỀN NHÂN VIÊN
═══════════════════════════════════════════ */
const UserPermissionsTab: React.FC<{ showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ showToast }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [addBranchId, setAddBranchId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: usersPaginated, isLoading: usersLoading } = useQuery({
    queryKey: ['users-all'], queryFn: () => usersApi.getUsers(undefined, 1, 200),
  });
  const allUsers = usersPaginated?.data || [];
  const filtered = allUsers.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const { data: branchesPaginated } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.getBranches(1, 50) });
  const branches = branchesPaginated?.data || [];

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: getRoles });

  const selectedUser = allUsers.find(u => u.id === selectedUserId);
  const assignments = selectedUser?.userBranchRoles || [];

  // Branches not yet assigned
  const assignedBranchIds = assignments.map((a: any) => a.branchId);
  const unassignedBranches = branches.filter(b => !assignedBranchIds.includes(b.id));

  const assignMutation = useMutation({
    mutationFn: ({ branchId, roleId }: { branchId: string; roleId: string }) =>
      assignUserBranchRole(branchId, selectedUserId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-all'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAddBranchId(''); setAddRoleId(''); setIsAdding(false);
      showToast('✅ Đã phân quyền thành công!');
    },
    onError: () => showToast('Phân quyền thất bại!', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: ({ branchId }: { branchId: string }) => removeUserFromBranch(branchId, selectedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-all'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('✅ Đã gỡ khỏi chi nhánh!');
    },
    onError: () => showToast('Gỡ thất bại!', 'error'),
  });

  const changeMutation = useMutation({
    mutationFn: ({ branchId, roleId }: { branchId: string; roleId: string }) =>
      assignUserBranchRole(branchId, selectedUserId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-all'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('✅ Đã cập nhật vai trò!');
    },
    onError: () => showToast('Cập nhật thất bại!', 'error'),
  });

  return (
    <div className="user-perm-layout">

      {/* ── Left: User list ── */}
      <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
        {/* Search */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="text" placeholder="Tìm nhân viên..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.875rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* User rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {usersLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>Không tìm thấy</div>
          ) : filtered.map(user => {
            const selected = user.id === selectedUserId;
            const branchCount = user.userBranchRoles?.length ?? 0;
            return (
              <div key={user.id} onClick={() => setSelectedUserId(user.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', cursor: 'pointer',
                borderBottom: '1px solid #f8fafc',
                background: selected ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : 'white',
                borderLeft: selected ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: selected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected ? 'white' : '#94a3b8', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: selected ? '#4338ca' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fullName}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: branchCount > 0 ? '#10b981' : '#94a3b8', background: branchCount > 0 ? '#ecfdf5' : '#f8fafc', padding: '0.15rem 0.5rem', borderRadius: '1rem', flexShrink: 0 }}>
                  {branchCount} CN
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Branch assignments ── */}
      <div>
        {!selectedUser ? (
          <div style={{ background: 'white', borderRadius: '1rem', border: '1px dashed #e2e8f0', padding: '5rem', textAlign: 'center' }}>
            <Users size={48} color="#e2e8f0" />
            <p style={{ color: '#94a3b8', marginTop: '1rem', fontWeight: '600', fontSize: '0.95rem' }}>Chọn nhân viên để phân quyền</p>
            <p style={{ color: '#cbd5e1', fontSize: '0.8rem', margin: 0 }}>Gán vai trò cho từng chi nhánh</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* User info header */}
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', padding: '1.25rem 1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: '800', flexShrink: 0 }}>
                {selectedUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>{selectedUser.fullName}</p>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', opacity: 0.8 }}>{selectedUser.email}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{assignments.length}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>chi nhánh</p>
              </div>
            </div>

            {/* Existing assignments */}
            {assignments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Chi nhánh đã phân quyền</p>
                {assignments.map((a: any) => {
                  const roleName = a.role?.name || '';
                  const roleColor = ROLE_COLORS[roleName] || '#6366f1';
                  const roleIcon = ROLE_ICONS[roleName] || '🔑';
                  return (
                    <div key={a.id} style={{ background: 'white', borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {/* Branch info */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '0.625rem', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin size={20} color="#6366f1" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{a.branch?.name || 'Chi nhánh không xác định'}</p>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Chi nhánh</p>
                      </div>
                      {/* Role selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>{roleIcon}</span>
                        <select
                          defaultValue={a.roleId}
                          onChange={e => {
                            if (e.target.value !== a.roleId) {
                              changeMutation.mutate({ branchId: a.branchId, roleId: e.target.value });
                            }
                          }}
                          style={{
                            padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: `1.5px solid ${roleColor}40`,
                            background: `${roleColor}10`, color: roleColor, fontWeight: '700', fontSize: '0.8rem',
                            outline: 'none', cursor: 'pointer',
                          }}>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={() => { if (window.confirm(`Gỡ ${selectedUser.fullName} khỏi chi nhánh ${a.branch?.name}?`)) removeMutation.mutate({ branchId: a.branchId }); }}
                        style={{ padding: '0.5rem', background: 'none', color: '#94a3b8', borderRadius: '0.5rem', transition: 'all 0.15s', flexShrink: 0 }}
                        onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                        title="Gỡ khỏi chi nhánh">
                        <UserX size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new branch */}
            {unassignedBranches.length > 0 && (
              <div>
                {!isAdding ? (
                  <button onClick={() => setIsAdding(true)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                    padding: '0.875rem 1.25rem', borderRadius: '0.875rem', border: '2px dashed #e2e8f0',
                    background: 'transparent', color: '#94a3b8', fontWeight: '600', fontSize: '0.875rem',
                    cursor: 'pointer', justifyContent: 'center', transition: 'all 0.15s',
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
                    <Plus size={18} /> Thêm vào chi nhánh khác
                  </button>
                ) : (
                  <div style={{ background: 'white', borderRadius: '0.875rem', padding: '1.25rem', border: '2px solid #6366f1', boxShadow: '0 4px 14px rgba(99,102,241,0.1)' }}>
                    <p style={{ margin: '0 0 1rem', fontWeight: '700', color: '#4338ca', fontSize: '0.9rem' }}>➕ Thêm chi nhánh mới</p>
                    <div className="add-branch-grid" style={{ marginBottom: '0.875rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Chi nhánh</label>
                        <select value={addBranchId} onChange={e => setAddBranchId(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none' }}>
                          <option value="">-- Chọn chi nhánh --</option>
                          {unassignedBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Vai trò</label>
                        <select value={addRoleId} onChange={e => setAddRoleId(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none' }}>
                          <option value="">-- Chọn vai trò --</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{ROLE_ICONS[r.name] || ''} {r.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => { if (addBranchId && addRoleId) assignMutation.mutate({ branchId: addBranchId, roleId: addRoleId }); }}
                        disabled={!addBranchId || !addRoleId || assignMutation.isPending}
                        style={{ flex: 1, padding: '0.65rem', borderRadius: '0.5rem', fontWeight: '700', fontSize: '0.875rem', background: addBranchId && addRoleId ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0', color: addBranchId && addRoleId ? 'white' : '#94a3b8', cursor: addBranchId && addRoleId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <UserCheck size={16} /> {assignMutation.isPending ? 'Đang lưu...' : 'Xác nhận'}
                      </button>
                      <button onClick={() => { setIsAdding(false); setAddBranchId(''); setAddRoleId(''); }}
                        style={{ padding: '0.65rem 1rem', borderRadius: '0.5rem', fontWeight: '600', background: '#f1f5f9', color: '#64748b' }}>
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {assignments.length === 0 && !isAdding && (
              <div style={{ background: '#fafafa', borderRadius: '0.875rem', padding: '2.5rem', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
                <MapPin size={36} color="#e2e8f0" />
                <p style={{ color: '#94a3b8', marginTop: '0.75rem', fontWeight: '600', fontSize: '0.875rem' }}>Chưa được phân quyền vào chi nhánh nào</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
const RolesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [localPermissionIds, setLocalPermissionIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [modalRole, setModalRole] = useState<Role | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: roles = [], isLoading: rolesLoading } = useQuery({ queryKey: ['roles'], queryFn: getRoles });
  const { data: groupedPermissions = {} } = useQuery({ queryKey: ['permissions'], queryFn: getPermissions });

  const currentRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId]);

  React.useEffect(() => { if (roles.length > 0 && !selectedRoleId) setSelectedRoleId(roles[0].id); }, [roles]);
  React.useEffect(() => { if (currentRole) { setLocalPermissionIds(currentRole.permissions.map(p => p.id)); setIsDirty(false); } }, [currentRole?.id]);

  const updateMutation = useMutation({
    mutationFn: (ids: string[]) => updateRole(selectedRoleId, { permissionIds: ids }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setIsDirty(false); showToast('✅ Đã lưu phân quyền!'); },
    onError: () => showToast('Lưu thất bại!', 'error'),
  });
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => createRole({ ...data, permissionIds: [] }),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setSelectedRoleId(r.id); setIsModalOpen(false); showToast('✅ Tạo vai trò thành công!'); },
    onError: () => showToast('Tạo thất bại!', 'error'),
  });
  const editMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => updateRole(selectedRoleId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setIsModalOpen(false); showToast('✅ Đã cập nhật vai trò!'); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setSelectedRoleId(roles[0]?.id ?? ''); showToast('✅ Đã xóa!'); },
    onError: () => showToast('Không thể xóa!', 'error'),
  });

  const handleToggle = (id: string) => { setLocalPermissionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setIsDirty(true); };
  const handleToggleAll = (ids: string[], checked: boolean) => {
    setLocalPermissionIds(prev => { const s = new Set(prev); ids.forEach(id => checked ? s.add(id) : s.delete(id)); return [...s]; });
    setIsDirty(true);
  };

  const allPermIds = Object.values(groupedPermissions).flat().map((p: any) => p.id);
  const allChecked = allPermIds.length > 0 && allPermIds.every(id => localPermissionIds.includes(id));
  const totalPermissions = allPermIds.length;

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', margin: '0 0 0.2rem' }}>Phân quyền hệ thống</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Quản lý vai trò, quyền và phân quyền nhân viên theo chi nhánh</p>
          </div>
          {activeTab === 'roles' && (
            <button onClick={() => { setModalRole(null); setIsModalOpen(true); }} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
              borderRadius: '0.65rem', fontWeight: '700', fontSize: '0.875rem',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)', border: 'none',
            }}>
              <Plus size={18} /> Thêm vai trò
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', background: 'white', borderRadius: '0.875rem', padding: '0.3rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', width: 'fit-content' }}>
          {([
            { key: 'roles', label: '🛡️ Quản lý vai trò', icon: Shield },
            { key: 'users', label: '👥 Phân quyền nhân viên', icon: Users },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '0.6rem 1.25rem', borderRadius: '0.6rem', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: activeTab === tab.key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: Vai trò & Quyền ── */}
      {activeTab === 'roles' && (
        <div className="roles-layout">
          {/* Role list */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 0.875rem' }}>
              🛡️ Danh sách vai trò ({roles.length})
            </p>
            {rolesLoading ? (
              [1,2,3].map(i => <div key={i} style={{ height: '60px', borderRadius: '0.75rem', background: '#f1f5f9', marginBottom: '0.5rem' }} />)
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {roles.map(role => (
                  <RoleCard key={role.id} role={role} selected={role.id === selectedRoleId}
                    onClick={() => { if (isDirty && !window.confirm('Có thay đổi chưa lưu. Tiếp tục?')) return; setSelectedRoleId(role.id); }}
                    onEdit={() => { setModalRole(role); setIsModalOpen(true); }}
                    onDelete={() => { if (window.confirm(`Xóa vai trò "${role.name}"?`)) deleteMutation.mutate(role.id); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Permissions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {currentRole && (
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Shield size={20} color="white" />
                  </div>
                  <div>
                    <p style={{ fontWeight: '800', fontSize: '1rem', color: '#1e293b', margin: 0 }}>{currentRole.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                      {localPermissionIds.length}/{totalPermissions} quyền
                      {isDirty && <span style={{ marginLeft: '0.5rem', color: '#f59e0b', fontWeight: '700' }}>• Chưa lưu</span>}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>
                    <input type="checkbox" checked={allChecked} onChange={e => handleToggleAll(allPermIds, e.target.checked)} style={{ accentColor: '#6366f1', width: '1rem', height: '1rem' }} />
                    Chọn tất cả
                  </label>
                  <button onClick={() => updateMutation.mutate(localPermissionIds)} disabled={updateMutation.isPending || !isDirty}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.65rem', fontWeight: '700', fontSize: '0.875rem', background: isDirty ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0', color: isDirty ? 'white' : '#94a3b8', cursor: isDirty ? 'pointer' : 'not-allowed', border: 'none', boxShadow: isDirty ? '0 4px 12px rgba(99,102,241,0.3)' : 'none', transition: 'all 0.2s' }}>
                    <Save size={16} /> {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}
            {currentRole ? (
              <div className="perms-grid">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <ModuleBlock key={module} module={module} permissions={perms as Permission[]} checkedIds={localPermissionIds} onToggle={handleToggle} onToggleAll={handleToggleAll} />
                ))}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '1rem', padding: '4rem', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
                <Shield size={48} color="#e2e8f0" />
                <p style={{ color: '#94a3b8', marginTop: '1rem', fontWeight: '600' }}>Chọn một vai trò để cấu hình quyền</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Phân quyền nhân viên ── */}
      {activeTab === 'users' && <UserPermissionsTab showToast={showToast} />}

      {/* Modal */}
      {isModalOpen && (
        <RoleModal role={modalRole} onClose={() => setIsModalOpen(false)} loading={createMutation.isPending || editMutation.isPending}
          onSave={(name, desc) => { modalRole ? editMutation.mutate({ name, description: desc }) : createMutation.mutate({ name, description: desc }); }} />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default RolesPage;
