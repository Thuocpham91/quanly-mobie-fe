import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useBranchContext } from '../context/BranchContext';
import branchesApi from '../api/branches';
import { connectSocket, disconnectSocket } from '../api/socket';
import { 
  LayoutDashboard, 
  Dog, 
  Users, 
  Calendar, 
  LogOut,
  Bell,
  Search,
  UserCog,
  Home,
  MapPin,
  Box,
  Package,
  Building2,
  Settings as SettingsIcon,
  Menu,
  ChevronDown,
  User,
  Shield,
  ShoppingCart,
  ShoppingBag,
  Tags,
  ClipboardCheck,
  ArrowLeftRight
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { selectedBranchId, setSelectedBranchId } = useBranchContext();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Tổng quan', 'Bán hàng']));
  const [toasts, setToasts] = useState<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: string;
    duration: number;
  }[]>([]);

  const currentUser = React.useMemo(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const socket = connectSocket(token);
      
      socket.on('notification', (data: any) => {
        console.log('🔔 Notification Received:', data);
        const type = data.type || 'info';
        const message = data.message || 'Có thông báo mới';
        
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, {
          id,
          type: type as any,
          message,
          timestamp: new Date().toISOString(),
          duration: 6000
        }]);
        
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 6000);
      });
      
      return () => {
        disconnectSocket();
      };
    }
  }, []);

  const { data: paginatedBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getBranches(1, 50),
  });

  const allBranches = paginatedBranches?.data || [];

  // Lọc chi nhánh theo user được phân quyền
  const userBranchRoles: any[] = currentUser?.userBranchRoles || [];
  const userBranchIds = userBranchRoles.map((ubr: any) => ubr.branchId);
  const isAdmin = currentUser?.email?.toLowerCase() === 'admin@gmail.com';

  // Admin thấy tất cả, user thường chỉ thấy chi nhánh được phân
  const branches = isAdmin
    ? allBranches
    : allBranches.filter(b => userBranchIds.includes(b.id));

  // Nếu chỉ có 1 chi nhánh và chưa set, tự động chọn
  React.useEffect(() => {
    if (branches.length === 1 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches.length, selectedBranchId]);

  // Lấy danh sách permissions của user (theo chi nhánh đang chọn hoặc tổng hợp tất cả)
  const userPermissions = React.useMemo(() => {
    if (isAdmin) return ['*']; // Admin có tất cả
    const relevantRoles = selectedBranchId
      ? userBranchRoles.filter((ubr: any) => ubr.branchId === selectedBranchId)
      : userBranchRoles;
    const perms = new Set<string>();
    relevantRoles.forEach((ubr: any) => {
      // Nếu role là Admin thì có tất cả
      if (ubr.role?.name === 'Admin') { perms.add('*'); return; }
      (ubr.role?.permissions || []).forEach((p: any) => perms.add(p.name));
    });
    return [...perms];
  }, [isAdmin, selectedBranchId, userBranchRoles]);

  const hasPermission = (perm?: string) => {
    if (!perm) return true; // Không yêu cầu quyền → luôn hiện
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(perm);
  };

  const allMenuGroups = [
    {
      label: 'Tổng quan',
      icon: <LayoutDashboard size={18} />,
      items: [
        { path: '/admin',              icon: <LayoutDashboard size={18} />, label: t('common.dashboard'),     permission: 'dashboard.view' },
        { path: '/admin/customers',    icon: <Users size={18} />,           label: t('common.customers'),     permission: 'customers.view' },
        { path: '/admin/pets',         icon: <Dog size={18} />,             label: t('common.pets'),          permission: 'pets.view' },
        { path: '/admin/appointments', icon: <Calendar size={18} />,        label: 'Công việc',           permission: 'appointments.view' },
        { path: '/admin/boarding',     icon: <Box size={18} />,             label: t('common.boarding'),      permission: 'boarding.view' },
      ]
    },
    {
      label: 'Bán hàng',
      icon: <ShoppingCart size={18} />,
      items: [
        { path: '/admin/pos',    icon: <ShoppingCart size={18} />, label: 'Bán hàng (POS)',      permission: 'sales.create' },
        { path: '/admin/orders', icon: <ShoppingBag size={18} />,  label: 'Lịch sử đơn hàng',   permission: 'history.view' },
      ]
    },
    {
      label: 'Kho hàng',
      icon: <Package size={18} />,
      items: [
        { path: '/admin/products',              icon: <Box size={18} />,            label: t('common.products'),     permission: 'products.view' },
        { path: '/admin/product-prices',        icon: <Tags size={18} />,           label: 'Quản lý giá',            permission: 'products.create_edit' },
        { path: '/admin/inventory',             icon: <Package size={18} />,        label: t('common.inventory'),    permission: 'inventory.import' },
        { path: '/admin/inventory/stocktakes',  icon: <ClipboardCheck size={18} />, label: 'Kiểm kho',               permission: 'inventory.import' },
        { path: '/admin/inventory/transfer',    icon: <ArrowLeftRight size={18} />, label: 'Xuất & Chuyển kho',      permission: 'inventory.import' },
        { path: '/admin/inventory/history',     icon: <Package size={18} />,        label: 'Biến động kho',          permission: 'inventory.import' },
        { path: '/admin/distributors',          icon: <Building2 size={18} />,      label: t('common.distributors'), permission: 'inventory.import' },
      ]
    },
    {
      label: 'Hệ thống',
      icon: <SettingsIcon size={18} />,
      items: [
        { path: '/admin/users',    icon: <UserCog size={18} />,      label: t('common.users'),    permission: 'users.view' },
        { path: '/admin/roles',    icon: <Shield size={18} />,       label: 'Phân quyền',         permission: 'users.manage' },
        { path: '/admin/branches', icon: <Home size={18} />,         label: t('common.branches'), permission: 'branches.manage' },
        { path: '/admin/settings', icon: <SettingsIcon size={18} />, label: t('common.settings'), permission: 'settings.view' },
      ]
    },
  ];

  // Lọc menu theo quyền
  const menuGroups = allMenuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.permission)),
    }))
    .filter(group => group.items.length > 0);

  // Auto-expand group containing current path
  React.useEffect(() => {
    menuGroups.forEach(group => {
      const hasActive = group.items.some(item => location.pathname === item.path);
      if (hasActive) {
        setExpandedGroups(prev => new Set([...prev, group.label]));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--background)', position: 'relative' }}>
      {/* Overlay for mobile */}
      {isMobile && !isCollapsed && (
        <div 
          onClick={() => setIsCollapsed(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 90,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{ 
        width: isMobile ? '260px' : (isCollapsed ? '80px' : '260px'), 
        backgroundColor: 'var(--card)', 
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        zIndex: 100,
        transform: isMobile && isCollapsed ? 'translateX(-100%)' : 'translateX(0)',
        boxShadow: isMobile && !isCollapsed ? '10px 0 15px -3px rgba(0,0,0,0.1)' : 'none'
      }}>
        <div style={{ 
          padding: isCollapsed && !isMobile ? '2rem 1rem' : '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
          gap: '0.75rem',
          overflow: 'hidden'
        }}>
          <div style={{ 
            backgroundColor: 'var(--primary)', 
            padding: '0.5rem', 
            borderRadius: '0.5rem',
            color: 'white',
            flexShrink: 0
          }}>
            <Dog size={24} />
          </div>
          {(!isCollapsed || isMobile) && <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', whiteSpace: 'nowrap' }}>PetCare</h2>}
        </div>

        <nav style={{ flex: 1, padding: '0 1rem', overflowY: 'auto' }}>
        {menuGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const hasActive = group.items.some(item => location.pathname === item.path);
          const isCollapsedSidebar = isCollapsed && !isMobile;

          return (
            <div key={group.label} style={{ marginBottom: '0.15rem' }}>
              {/* Group header button */}
              <button
                onClick={() => !isCollapsedSidebar && toggleGroup(group.label)}
                title={isCollapsedSidebar ? group.label : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: isCollapsedSidebar ? 'default' : 'pointer',
                  backgroundColor: hasActive ? 'rgba(99,102,241,0.07)' : 'transparent',
                  color: hasActive ? 'var(--primary)' : '#64748b',
                  fontWeight: '600',
                  fontSize: '0.78rem',
                  textAlign: 'left',
                  justifyContent: isCollapsedSidebar ? 'center' : 'flex-start',
                  transition: 'all 0.2s',
                  marginTop: '0.3rem',
                }}
                onMouseEnter={e => { if (!isCollapsedSidebar) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = hasActive ? 'rgba(99,102,241,0.07)' : 'transparent'; }}
              >
                {/* Group icon */}
                <span style={{ flexShrink: 0, color: hasActive ? 'var(--primary)' : '#94a3b8' }}>
                  {group.icon}
                </span>
                {/* Label + chevron */}
                {!isCollapsedSidebar && (
                  <>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                      {group.label}
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        flexShrink: 0,
                        transition: 'transform 0.25s ease',
                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        color: '#94a3b8'
                      }}
                    />
                  </>
                )}
              </button>

              {/* Submenu items — collapsed sidebar shows all icons, expanded sidebar respects toggle */}
              <div style={{
                overflow: 'hidden',
                maxHeight: (isCollapsedSidebar || isExpanded) ? '600px' : '0px',
                transition: 'max-height 0.28s ease',
              }}>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => isMobile && setIsCollapsed(true)}
                      title={isCollapsedSidebar ? item.label : ''}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: isCollapsedSidebar ? '0.55rem' : '0.5rem 0.75rem 0.5rem 2.1rem',
                        borderRadius: '0.45rem',
                        textDecoration: 'none',
                        color: isActive ? 'var(--primary)' : '#475569',
                        backgroundColor: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                        marginBottom: '0.05rem',
                        fontWeight: isActive ? '600' : '400',
                        fontSize: '0.85rem',
                        transition: 'all 0.15s',
                        justifyContent: isCollapsedSidebar ? 'center' : 'flex-start',
                        borderLeft: (!isCollapsedSidebar && isActive) ? '2px solid var(--primary)' : (!isCollapsedSidebar ? '2px solid transparent' : 'none'),
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isActive ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
                    >
                      <span style={{ flexShrink: 0, color: isActive ? 'var(--primary)' : '#94a3b8' }}>
                        {item.icon}
                      </span>
                      {!isCollapsedSidebar && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              color: 'var(--danger)',
              backgroundColor: 'transparent',
              textAlign: 'left',
              justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start'
            }}
          >
            <LogOut size={20} />
            {(!isCollapsed || isMobile) && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ 
          height: '64px', 
          backgroundColor: 'var(--card)', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 0.875rem' : '0 2rem',
          gap: '0.5rem',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem' }}>
            <button 
              onClick={toggleSidebar}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '0.5rem', 
                backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Menu size={20} />
            </button>
            
            {!isMobile && (
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder={t('common.search_placeholder')}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem 0.6rem 2.5rem',
                    borderRadius: '2rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Branch Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: isMobile ? '0.35rem 0.6rem' : '0.4rem 1rem', borderRadius: '2rem', maxWidth: isMobile ? '140px' : 'none', overflow: 'hidden' }}>
              <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
              {branches.length === 1 ? (
                <span style={{ fontSize: isMobile ? '0.78rem' : '0.875rem', fontWeight: '600', color: 'var(--primary)', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {branches[0].name}
                </span>
              ) : (
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: isMobile ? '0.78rem' : '0.875rem', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer', appearance: 'none', maxWidth: isMobile ? '100px' : '180px' }}
                >
                  <option value="">{isMobile ? 'Tất cả' : 'Tất cả chi nhánh'}</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Ẩn LanguageSwitcher trên mobile để tiết kiệm chỗ */}
            {!isMobile && <LanguageSwitcher />}
            {!isMobile && (
              <button style={{ position: 'relative', background: 'none', color: 'var(--foreground)' }}>
                <Bell size={20} />
                <span style={{ 
                  position: 'absolute', 
                  top: '-2px', 
                  right: '-2px', 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: 'var(--danger)', 
                  borderRadius: '50%',
                  border: '2px solid var(--card)'
                }}></span>
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '0.5rem', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {!isMobile && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{currentUser?.fullName || 'User'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{currentUser?.role || 'Staff'}</p>
                  </div>
                )}
                <div style={{ 
                  width: isMobile ? '32px' : '40px', 
                  height: isMobile ? '32px' : '40px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.75rem' : '1rem',
                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
                }}>
                  {(currentUser?.fullName || 'U').charAt(0).toUpperCase()}
                </div>
              </div>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setIsUserMenuOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  />
                  {/* Dropdown */}
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: '260px',
                    backgroundColor: 'white',
                    borderRadius: '1rem',
                    boxShadow: '0 20px 40px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                    zIndex: 999,
                    overflow: 'hidden',
                    animation: 'dropdownSlideIn 0.18s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    {/* User info header */}
                    <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: '800', fontSize: '1.25rem',
                          border: '2px solid rgba(255,255,255,0.4)',
                          flexShrink: 0,
                        }}>
                          {(currentUser?.fullName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentUser?.fullName || 'Người dùng'}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', margin: '0.15rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentUser?.email}
                          </p>
                          {/* Role badge */}
                          {(() => {
                            const roles: any[] = currentUser?.userBranchRoles || [];
                            const roleName = roles[0]?.role?.name;
                            if (!roleName) return null;
                            return (
                              <span style={{
                                display: 'inline-block', marginTop: '0.35rem',
                                fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em',
                                textTransform: 'uppercase', padding: '0.15rem 0.5rem',
                                borderRadius: '9999px', background: 'rgba(255,255,255,0.25)',
                                color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                              }}>
                                {roleName === 'Admin' ? '👑' : roleName === 'Quản lý' ? '🏢' : '👤'} {roleName}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: '0.5rem' }}>
                      <Link
                        to="/admin/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: '0.6rem', textDecoration: 'none', color: '#374151', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f3ff'; e.currentTarget.style.color = '#6366f1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <SettingsIcon size={15} color="#6366f1" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600' }}>Cài đặt</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>Tùy chỉnh hệ thống</p>
                        </div>
                      </Link>

                      <Link
                        to="/admin/users"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: '0.6rem', textDecoration: 'none', color: '#374151', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.color = '#10b981'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={15} color="#10b981" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600' }}>Tài khoản</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>Quản lý người dùng</p>
                        </div>
                      </Link>

                      {/* Divider */}
                      <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.4rem 0' }} />

                      <button
                        onClick={handleLogout}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <LogOut size={15} color="#ef4444" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600' }}>Đăng xuất</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>Thoát khỏi hệ thống</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '2rem' }}>
          <Outlet />
        </div>
      </main>

      {/* Toast Notification Container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
      }}>
        <style>{`
          @keyframes toast-slide-in {
            from {
              transform: translateX(120%) scale(0.9);
              opacity: 0;
            }
            to {
              transform: translateX(0) scale(1);
              opacity: 1;
            }
          }
          @keyframes toast-progress {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}</style>
        {toasts.map(toast => {
          let accentColor = '#3b82f6';
          let iconSvg = (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          );

          if (toast.type === 'success') {
            accentColor = '#10b981';
            iconSvg = (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            );
          } else if (toast.type === 'warning') {
            accentColor = '#f59e0b';
            iconSvg = (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            );
          } else if (toast.type === 'error') {
            accentColor = '#ef4444';
            iconSvg = (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            );
          }

          return (
            <div 
              key={toast.id}
              style={{
                width: '350px',
                padding: '14px 16px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                boxShadow: '0 10px 30px -5px rgba(2, 6, 23, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                pointerEvents: 'auto',
                animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Toast Icon Accent */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `rgba(${toast.type === 'success' ? '16, 185, 129' : toast.type === 'warning' ? '245, 158, 11' : toast.type === 'error' ? '239, 68, 68' : '59, 130, 246'}, 0.1)`,
                padding: '8px',
                borderRadius: '10px',
                flexShrink: 0,
              }}>
                {iconSvg}
              </div>

              {/* Toast Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '2px',
                }}>
                  {toast.type === 'success' ? 'Thành công' : toast.type === 'warning' ? 'Cảnh báo' : toast.type === 'error' ? 'Lỗi' : 'Thông báo'}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}>
                  {toast.message}
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Progress Bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                backgroundColor: accentColor,
                animation: `toast-progress ${toast.duration}ms linear forwards`
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardLayout;
