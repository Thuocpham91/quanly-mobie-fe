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
      
      socket.on('notification', (data) => {
        // Just log for now. A toast UI can be added later.
        console.log('🔔 Notification Received:', data);
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

  const branches = paginatedBranches?.data || [];

  // Removed automatic branch selection to allow "All Branches" (empty string) to be selected

  const menuGroups = [
    {
      label: 'Tổng quan',
      icon: <LayoutDashboard size={18} />,
      items: [
        { path: '/admin', icon: <LayoutDashboard size={18} />, label: t('common.dashboard') },
        { path: '/admin/customers', icon: <Users size={18} />, label: t('common.customers') },
        { path: '/admin/pets', icon: <Dog size={18} />, label: t('common.pets') },
        { path: '/admin/appointments', icon: <Calendar size={18} />, label: t('common.appointments') },
        { path: '/admin/boarding', icon: <Box size={18} />, label: t('common.boarding') },
      ]
    },
    {
      label: 'Bán hàng',
      icon: <ShoppingCart size={18} />,
      items: [
        { path: '/admin/pos', icon: <ShoppingCart size={18} />, label: 'Bán hàng (POS)' },
        { path: '/admin/orders', icon: <ShoppingBag size={18} />, label: 'Lịch sử đơn hàng' },
      ]
    },
    {
      label: 'Kho hàng',
      icon: <Package size={18} />,
      items: [
        { path: '/admin/products', icon: <Box size={18} />, label: t('common.products') },
        { path: '/admin/product-prices', icon: <Tags size={18} />, label: 'Quản lý giá' },
        { path: '/admin/inventory', icon: <Package size={18} />, label: t('common.inventory') },
        { path: '/admin/inventory/stocktakes', icon: <ClipboardCheck size={18} />, label: 'Kiểm kho' },
        { path: '/admin/inventory/transfer', icon: <ArrowLeftRight size={18} />, label: 'Xuất & Chuyển kho' },
        { path: '/admin/inventory/history', icon: <Package size={18} />, label: 'Biến động kho' },
        { path: '/admin/distributors', icon: <Building2 size={18} />, label: t('common.distributors') },
      ]
    },
    {
      label: 'Hệ thống',
      icon: <SettingsIcon size={18} />,
      items: [
        { path: '/admin/users', icon: <UserCog size={18} />, label: t('common.users') },
        { path: '/admin/roles', icon: <Shield size={18} />, label: 'Phân quyền' },
        { path: '/admin/branches', icon: <Home size={18} />, label: t('common.branches') },
        { path: '/admin/settings', icon: <SettingsIcon size={18} />, label: t('common.settings') },
      ]
    },
  ];

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
          height: '70px', 
          backgroundColor: 'var(--card)', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 1rem', borderRadius: '2rem' }}>
              <MapPin size={16} color="var(--primary)" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  appearance: 'none', // Remove default arrow in some browsers
                  paddingRight: '1rem'
                }}
              >
                <option value="">Tất cả chi nhánh</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <LanguageSwitcher />
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
                  <div 
                    onClick={() => setIsUserMenuOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '120%', 
                    right: 0, 
                    width: '220px', 
                    backgroundColor: 'white', 
                    borderRadius: '0.75rem', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0',
                    padding: '0.5rem',
                    zIndex: 999,
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.5rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b' }}>{currentUser?.fullName}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>{currentUser?.email}</p>
                    </div>

                    <Link 
                      to="/admin/settings" 
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderRadius: '0.5rem',
                        textDecoration: 'none', color: '#475569', fontSize: '0.875rem', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = 'var(--primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                    >
                      <User size={16} />
                      Chỉnh sửa thông tin
                    </Link>

                    <button 
                      onClick={handleLogout}
                      style={{ 
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderRadius: '0.5rem',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444', fontSize: '0.875rem', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
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
    </div>
  );
};

export default DashboardLayout;
