import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  LayoutDashboard, 
  Dog, 
  Users, 
  Calendar, 
  LogOut,
  Bell,
  Search
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: t('common.dashboard') },
    { path: '/admin/pets', icon: <Dog size={20} />, label: t('common.pets') },
    { path: '/admin/customers', icon: <Users size={20} />, label: t('common.customers') },
    { path: '/admin/appointments', icon: <Calendar size={20} />, label: t('common.appointments') },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: 'var(--card)', 
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: 'var(--primary)', 
            padding: '0.5rem', 
            borderRadius: '0.5rem',
            color: 'white'
          }}>
            <Dog size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>PetCare</h2>
        </div>

        <nav style={{ flex: 1, padding: '0 1rem' }}>
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                color: location.pathname === item.path ? 'var(--primary)' : 'var(--foreground)',
                backgroundColor: location.pathname === item.path ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                marginBottom: '0.5rem',
                fontWeight: location.pathname === item.path ? '600' : '500',
                transition: 'all 0.2s'
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
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
              textAlign: 'left'
            }}
          >
            <LogOut size={20} />
            <span>{t('common.logout')}</span>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <LanguageSwitcher />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>Dr. Nguyen</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Veterinarian</p>
              </div>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                N
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
