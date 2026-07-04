import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getBranches } from '../api/branches';
import { createAppointment } from '../api/appointments';
import { 
  Smartphone,
  Cpu,
  ShoppingBag,
  RotateCw,
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  ArrowRight,
  Heart,
  Calendar,
  UserCheck,
  X,
  CheckCircle,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneModel, setPhoneModel] = useState('iPhone 15 Pro Max');
  const [branchId, setBranchId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch branches for branch dropdown
  const { data: branchData } = useQuery({
    queryKey: ['branchesForLanding'],
    queryFn: () => getBranches(1, 50),
    enabled: isBookingModalOpen
  });
  const branches = branchData?.data || [];

  // Book Appointment Mutation
  const bookingMutation = useMutation({
    mutationFn: (data: any) => createAppointment(data),
    onSuccess: () => {
      setIsBookingModalOpen(false);
      setIsSuccessModalOpen(true);
      // Reset form fields
      setFullName('');
      setPhone('');
      setPhoneModel('iPhone 15 Pro Max');
      setBranchId('');
      setDateTime('');
      setNotes('');
      setErrorMessage('');
    },
    onError: (error: any) => {
      console.error('Lỗi đăng ký tư vấn:', error);
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi gửi đăng ký. Vui lòng thử lại.');
    }
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !branchId || !dateTime) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    const payload = {
      dateTime: new Date(dateTime).toISOString(),
      purpose: `Đăng ký mua: ${phoneModel}`,
      branchId: branchId,
      notes: `Đơn đăng ký tư vấn & mua hàng qua Landing Page:\n- Tên khách hàng: ${fullName}\n- Số điện thoại: ${phone}\n- Dòng điện thoại quan tâm: ${phoneModel}\n- Ghi chú/Yêu cầu: ${notes}`
    };

    bookingMutation.mutate(payload);
  };

  const openBookingWithProduct = (modelName: string) => {
    setPhoneModel(modelName);
    setIsBookingModalOpen(true);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden'
    }}>
      <style>{`
        /* Keyframes & Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(-6px); }
          50% { transform: translateY(6px); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.15; filter: blur(40px); }
          50% { transform: scale(1.08); opacity: 0.25; filter: blur(50px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes check-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-screen {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        /* Class Utilities */
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Responsive styles */
        @media (max-width: 968px) {
          .hero-container {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
            text-align: center;
          }
          .hero-text-content {
            max-width: 100% !important;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hero-buttons {
            justify-content: center;
          }
          .hero-image-wrapper {
            max-width: 500px;
            margin: 0 auto;
          }
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
        }
        
        .service-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .service-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.08), 0 10px 10px -5px rgba(37, 99, 235, 0.03) !important;
          border-color: rgba(37, 99, 235, 0.3) !important;
        }

        .product-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 40px -12px rgba(15, 23, 42, 0.1);
          border-color: rgba(37, 99, 235, 0.25);
        }

        .booking-input:focus, .booking-select:focus, .booking-textarea:focus {
          outline: none;
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
      `}</style>

      {/* Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 5%',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: '#2563eb', 
            padding: '0.6rem', 
            borderRadius: '0.75rem',
            color: 'white',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={24} />
          </div>
          <span style={{ 
            fontSize: '1.4rem', 
            fontWeight: '800', 
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>MobiStore</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a 
            href="#products" 
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ 
              textDecoration: 'none', 
              color: '#475569', 
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.color = '#475569'}
          >
            Sản phẩm
          </a>
          <a 
            href="#features" 
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ 
              textDecoration: 'none', 
              color: '#475569', 
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.color = '#475569'}
          >
            {t('common.services')}
          </a>
          <LanguageSwitcher />
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary" 
            style={{ 
              backgroundColor: '#2563eb',
              padding: '0.65rem 1.5rem',
              fontWeight: '600',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: 'white'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            {t('common.staff_login')}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '6rem 5% 5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* Glow Effects */}
        <div className="animate-pulse-glow" style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <div className="hero-container animate-fade-in" style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          alignItems: 'center',
          gap: '5rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="hero-text-content">
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.5rem 1rem', 
              backgroundColor: 'rgba(37, 99, 235, 0.08)', 
              color: '#2563eb',
              borderRadius: '2rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              marginBottom: '1.75rem',
              border: '1px solid rgba(37, 99, 235, 0.15)'
            }}>
              <Sparkles size={16} fill="#2563eb" />
              {t('landing.hero_badge')}
            </div>
            <h1 style={{ 
              fontSize: '3.75rem', 
              lineHeight: 1.15, 
              fontWeight: '900', 
              marginBottom: '1.5rem',
              letterSpacing: '-0.04em',
              color: '#0f172a'
            }}>
              <Trans i18nKey="landing.hero_title">
                Nâng tầm trải nghiệm <span style={{ 
                  background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>Công nghệ</span> đỉnh cao.
              </Trans>
            </h1>
            <p style={{ 
              fontSize: '1.2rem', 
              color: '#475569', 
              lineHeight: 1.6, 
              marginBottom: '2.5rem',
              maxWidth: '560px'
            }}>
              {t('landing.hero_subtitle')}
            </p>
            <div className="hero-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  setPhoneModel('iPhone 15 Pro Max');
                  setIsBookingModalOpen(true);
                }}
                style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  padding: '1rem 2.25rem', 
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  borderRadius: '0.875rem',
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Đăng ký tư vấn ngay <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ 
                  backgroundColor: 'white', 
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '1rem 2.25rem', 
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  borderRadius: '0.875rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Xem sản phẩm hot
              </button>
            </div>
          </div>
          
          <div className="hero-image-wrapper" style={{ position: 'relative', width: '100%' }}>
            {/* Background Blob Card */}
            <div style={{ 
              width: '100%', 
              height: '480px', 
              background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', 
              borderRadius: '2.5rem',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Premium Vector SVG Smartphone Art */}
              <svg className="animate-float" width="280" height="340" viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Glowing Aura */}
                <circle cx="100" cy="120" r="75" fill="url(#phoneGlow)" opacity="0.4" />
                
                {/* Smartphone Body */}
                <rect x="35" y="15" width="130" height="210" rx="22" fill="#1e293b" stroke="#64748b" strokeWidth="3" />
                <rect x="38" y="18" width="124" height="204" rx="19" fill="#0f172a" />
                
                {/* Screen Content - Gradient Screen */}
                <rect x="42" y="22" width="116" height="196" rx="15" fill="url(#screenGrad)" />
                
                {/* Screen Widgets */}
                <g opacity="0.9">
                  {/* Dynamic Island */}
                  <rect x="80" y="27" width="40" height="10" rx="5" fill="#000000" />
                  
                  {/* Glowing core/App mockup */}
                  <circle cx="100" cy="110" r="32" fill="#ffffff" fillOpacity="0.06" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />
                  <path className="animate-pulse-screen" d="M100 88 L122 101 L122 126 L100 139 L78 126 L78 101 Z" fill="url(#widgetGrad)" opacity="0.9" />
                  <Cpu size={24} color="#ffffff" style={{ position: 'absolute', transform: 'translate(44px, 53px)' }} />
                  
                  {/* Texts inside Screen */}
                  <text x="100" y="165" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="0.05em">A17 BIONIC CHIP</text>
                  <text x="100" y="178" fill="rgba(255,255,255,0.7)" fontSize="7" fontWeight="600" textAnchor="middle">Super Retina XDR</text>
                  <rect x="80" y="187" width="40" height="10" rx="5" fill="#3b82f6" />
                  <text x="100" y="194" fill="#ffffff" fontSize="6" fontWeight="700" textAnchor="middle">5G DUAL SIM</text>
                </g>
                
                {/* Glass reflections */}
                <path d="M42 22 L158 120 L158 22 Z" fill="url(#glassGrad)" opacity="0.1" pointerEvents="none" />
                
                <defs>
                  <radialGradient id="phoneGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 120) rotate(90) scale(75)">
                    <stop stopColor="#3b82f6"/>
                    <stop offset="1" stopColor="#3b82f6" stopOpacity="0"/>
                  </radialGradient>
                  
                  <linearGradient id="screenGrad" x1="42" y1="22" x2="158" y2="218" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0f172a"/>
                    <stop offset="0.5" stopColor="#1e1b4b"/>
                    <stop offset="1" stopColor="#311042"/>
                  </linearGradient>
                  
                  <linearGradient id="widgetGrad" x1="78" y1="88" x2="122" y2="139" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#60a5fa"/>
                    <stop offset="1" stopColor="#a78bfa"/>
                  </linearGradient>
                  
                  <linearGradient id="glassGrad" x1="100" y1="22" x2="100" y2="218" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" stopOpacity="0.5"/>
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Floating Stats - Glassmorphism */}
            <div className="glass-card animate-float-delayed" style={{
              position: 'absolute',
              bottom: '30px',
              left: '-20px',
              padding: '1.25rem 1.75rem',
              borderRadius: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              zIndex: 10
            }}>
              <div style={{ 
                backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                color: '#10b981',
                padding: '0.65rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserCheck size={24} />
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', lineHeight: 1.1, color: '#0f172a' }}>10k+</p>
                <p style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600', marginTop: '0.1rem' }}>{t('landing.happy_clients')}</p>
              </div>
            </div>

            {/* Sparkles element */}
            <div className="animate-float" style={{
              position: 'absolute',
              top: '40px',
              right: '20px',
              background: '#white',
              padding: '0.75rem',
              borderRadius: '1rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white'
            }}>
              <Sparkles size={20} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Độc quyền ưu đãi</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section id="products" style={{ padding: '6rem 5% 5rem', backgroundColor: '#ffffff' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4rem' }}>
          <span style={{ 
            color: '#2563eb', 
            fontWeight: '800', 
            textTransform: 'uppercase', 
            fontSize: '0.85rem', 
            letterSpacing: '0.1em',
            marginBottom: '0.5rem',
            display: 'block'
          }}>Sản phẩm Flagship</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Dòng điện thoại được săn đón nhất
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6 }}>Trải nghiệm cấu hình ấn tượng cùng ưu đãi đặc biệt từ MobiStore.</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '2.5rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Product 1 */}
          <div className="product-card">
            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '3rem 2rem', 
              display: 'flex', 
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>HOT DEAL</div>
              <svg width="120" height="150" viewBox="0 0 100 120" fill="none">
                <rect x="25" y="10" width="50" height="100" rx="10" fill="#2d3748" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="27" y="12" width="46" height="96" rx="8" fill="#1a202c" />
                <rect x="42" y="15" width="16" height="4" rx="2" fill="#000" />
                {/* Camera lens indicator */}
                <circle cx="38" cy="24" r="3" fill="#cbd5e1" opacity="0.3" />
                <circle cx="48" cy="24" r="3" fill="#cbd5e1" opacity="0.3" />
                <text x="50" y="65" fill="#cbd5e1" fontSize="18" fontWeight="900" textAnchor="middle">15</text>
              </svg>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>iPhone 15 Pro Max</h3>
                <span style={{ backgroundColor: '#e0e7ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>256GB</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Khung Titan tự nhiên siêu bền, chip Apple A17 Pro tối ưu hóa chơi game đồ họa cao, hệ thống camera zoom quang học 5x sắc nét.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>29.490.000đ</span>
                <span style={{ fontSize: '0.95rem', color: '#94a3b8', textDecoration: 'line-through' }}>34.990.000đ</span>
              </div>
              <button 
                onClick={() => openBookingWithProduct('iPhone 15 Pro Max')}
                style={{ 
                  width: '100%', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.85rem', 
                  borderRadius: '0.75rem', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                <ShoppingBag size={18} /> Đăng ký mua máy
              </button>
            </div>
          </div>

          {/* Product 2 */}
          <div className="product-card">
            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '3rem 2rem', 
              display: 'flex', 
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: '#e11d48', color: 'white', fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>BÁN CHẠY</div>
              <svg width="120" height="150" viewBox="0 0 100 120" fill="none">
                <rect x="25" y="10" width="50" height="100" rx="10" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="27" y="12" width="46" height="96" rx="8" fill="#020617" />
                {/* Camera rings */}
                <circle cx="50" cy="30" r="10" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeOpacity="0.15" />
                <text x="50" y="65" fill="#4f46e5" fontSize="18" fontWeight="900" textAnchor="middle">S24</text>
              </svg>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Galaxy S24 Ultra</h3>
                <span style={{ backgroundColor: '#e0e7ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>256GB</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Bút S-Pen tiện ích, vỏ Titanium chống xước vượt trội, tính năng Zoom mắt thần AI 100x và dịch vụ dịch thuật trực tiếp cuộc gọi AI.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>26.990.000đ</span>
                <span style={{ fontSize: '0.95rem', color: '#94a3b8', textDecoration: 'line-through' }}>31.990.000đ</span>
              </div>
              <button 
                onClick={() => openBookingWithProduct('Samsung Galaxy S24 Ultra')}
                style={{ 
                  width: '100%', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.85rem', 
                  borderRadius: '0.75rem', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                <ShoppingBag size={18} /> Đăng ký mua máy
              </button>
            </div>
          </div>

          {/* Product 3 */}
          <div className="product-card">
            <div style={{ 
              backgroundColor: '#f8fafc', 
              padding: '3rem 2rem', 
              display: 'flex', 
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: '#10b981', color: 'white', fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>SẠC 90W</div>
              <svg width="120" height="150" viewBox="0 0 100 120" fill="none">
                <rect x="25" y="10" width="50" height="100" rx="10" fill="#312e81" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="27" y="12" width="46" height="96" rx="8" fill="#1e1b4b" />
                <circle cx="50" cy="60" r="15" fill="#f59e0b" opacity="0.3" />
                <text x="50" y="65" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle">14</text>
              </svg>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Xiaomi 14 Ultra</h3>
                <span style={{ backgroundColor: '#e0e7ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>512GB</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Cảm biến camera 1 inch hàng đầu từ Leica Summilux, màn hình cong tràn 4 cạnh, sạc siêu tốc 90W hồi pin đầy chỉ trong 35 phút.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>22.490.000đ</span>
                <span style={{ fontSize: '0.95rem', color: '#94a3b8', textDecoration: 'line-through' }}>26.990.000đ</span>
              </div>
              <button 
                onClick={() => openBookingWithProduct('Xiaomi 14 Ultra')}
                style={{ 
                  width: '100%', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.85rem', 
                  borderRadius: '0.75rem', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                <ShoppingBag size={18} /> Đăng ký mua máy
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services/Features Section */}
      <section id="features" style={{ padding: '6.5rem 5% 7rem', backgroundColor: '#f8fafc', position: 'relative' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4.5rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            {t('landing.services_title')}
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6 }}>{t('landing.services_subtitle')}</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            { icon: <ShieldCheck size={28} />, title: t('landing.feature_expert_title'), desc: t('landing.feature_expert_desc'), color: '#2563eb' },
            { icon: <Clock size={28} />, title: t('landing.feature_emergency_title'), desc: t('landing.feature_emergency_desc'), color: '#ef4444' },
            { icon: <Calendar size={28} />, title: t('landing.feature_booking_title'), desc: t('landing.feature_booking_desc'), color: '#10b981' },
            { icon: <RotateCw size={28} />, title: t('landing.feature_grooming_title'), desc: t('landing.feature_grooming_desc'), color: '#8b5cf6' }
          ].map((feature, idx) => (
            <div key={idx} className="service-card" style={{ 
              backgroundColor: '#ffffff', 
              padding: '2.5rem 2rem', 
              borderRadius: '1.75rem',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                color: feature.color, 
                marginBottom: '1.75rem',
                backgroundColor: `${feature.color}10`,
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '1.25rem',
                boxShadow: `0 8px 16px -4px ${feature.color}15`
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: '#0f172a' }}>{feature.title}</h3>
              <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>{feature.desc}</p>
              
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: feature.color, fontWeight: '700', fontSize: '0.875rem' }}>
                <span>Tìm hiểu chi tiết</span> <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '5rem 5% 3rem', backgroundColor: '#0f172a', color: 'white', position: 'relative' }}>
        <div style={{ 
          gridTemplateColumns: '1.2fr 0.8fr 1fr', 
          display: 'grid', 
          gap: '4rem',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingBottom: '4rem',
          borderBottom: '1px solid #1e293b'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#2563eb', padding: '0.45rem', borderRadius: '0.5rem' }}>
                <Smartphone size={20} color="white" />
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'white' }}>MobiStore</span>
            </div>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, maxWidth: '300px', fontSize: '0.95rem' }}>{t('landing.footer_desc')}</p>
          </div>
          
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1.5rem', color: '#f8fafc' }}>{t('landing.contact_us')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', color: '#94a3b8', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <MapPin size={18} style={{ color: '#3b82f6', marginTop: '0.2rem', flexShrink: 0 }} />
                <span>123 Vet Street, Pet City</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>+1 (234) 567-890</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1.5rem', color: '#f8fafc' }}>{t('landing.newsletter')}</h4>
            <p style={{ color: '#94a3b8', marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.newsletter_desc')}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="email" 
                placeholder="Email" 
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '0.75rem',
                  color: 'white',
                  flex: 1,
                  fontSize: '0.9rem',
                  outline: 'none'
                }} 
              />
              <button className="btn-primary" style={{ backgroundColor: '#2563eb', padding: '0.75rem 1.25rem', fontWeight: '600', borderRadius: '0.75rem', cursor: 'pointer', color: 'white' }}>{t('landing.join')}</button>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '3rem', 
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem'
        }}>
          © 2026 MobiStore Retail Center. {t('landing.rights')}
        </div>
      </footer>

      {/* ================= GUEST BOOKING MODAL ================= */}
      {isBookingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem',
          animation: 'fade-in 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 1.75rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <Calendar size={22} color="#2563eb" />
                Đăng ký Mua máy & Nhận tư vấn
              </h3>
              <button 
                onClick={() => { setIsBookingModalOpen(false); setErrorMessage(''); }}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '0.5rem', 
                  color: '#64748b', 
                  backgroundColor: 'transparent', 
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleBookingSubmit} style={{ 
              padding: '1.75rem', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {errorMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.75rem',
                  color: '#ef4444',
                  fontSize: '0.875rem'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#334155' }}>
                    <span style={{ color: '#ef4444' }}>*</span> Họ và Tên khách hàng
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    className="booking-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', border: '1px solid #cbd5e1',
                      fontSize: '0.9rem', transition: 'all 0.2s'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#334155' }}>
                    <span style={{ color: '#ef4444' }}>*</span> Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="09XXXXXXXX"
                    className="booking-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', border: '1px solid #cbd5e1',
                      fontSize: '0.9rem', transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#334155' }}>
                    Dòng sản phẩm quan tâm
                  </label>
                  <select
                    className="booking-select"
                    value={phoneModel}
                    onChange={(e) => setPhoneModel(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', border: '1px solid #cbd5e1',
                      fontSize: '0.9rem', backgroundColor: 'white', transition: 'all 0.2s'
                    }}
                  >
                    <option value="iPhone 15 Pro Max">iPhone 15 Pro Max</option>
                    <option value="Samsung Galaxy S24 Ultra">Samsung Galaxy S24 Ultra</option>
                    <option value="Xiaomi 14 Ultra">Xiaomi 14 Ultra</option>
                    <option value="Dòng máy khác / Yêu cầu tư vấn chung">Khác / Tư vấn thêm</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#334155' }}>
                    <span style={{ color: '#ef4444' }}>*</span> Ngày giờ qua cửa hàng
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="booking-input"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', border: '1px solid #cbd5e1',
                      fontSize: '0.9rem', transition: 'all 0.2s',
                      color: dateTime ? '#0f172a' : '#94a3b8'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#334155' }}>
                  <span style={{ color: '#ef4444' }}>*</span> Chi nhánh nhận máy / Trải nghiệm
                </label>
                <select
                  required
                  className="booking-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    borderRadius: '0.75rem', border: '1px solid #cbd5e1',
                    fontSize: '0.9rem', backgroundColor: 'white', transition: 'all 0.2s',
                    color: branchId ? '#0f172a' : '#94a3b8'
                  }}
                >
                  <option value="">Chọn chi nhánh gần nhất</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name} - {b.address}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: '#334155' }}>
                  Yêu cầu thêm (Màu sắc, Dung lượng, Thu cũ đổi mới...)
                </label>
                <textarea
                  placeholder="Yêu cầu cụ thể của bạn về màu sắc máy, trả góp 0%, dung lượng bộ nhớ..."
                  className="booking-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    borderRadius: '0.75rem', border: '1px solid #cbd5e1',
                    fontSize: '0.9rem', transition: 'all 0.2s', resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => { setIsBookingModalOpen(false); setErrorMessage(''); }}
                  style={{
                    flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1',
                    borderRadius: '0.75rem', backgroundColor: 'transparent', cursor: 'pointer',
                    fontWeight: '600', color: '#475569'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={bookingMutation.isPending}
                  className="btn-primary"
                  style={{ 
                    backgroundColor: '#2563eb',
                    flex: 1, padding: '0.75rem', border: 'none', borderRadius: '0.75rem', 
                    color: 'white', cursor: 'pointer', fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    opacity: bookingMutation.isPending ? 0.75 : 1
                  }}
                >
                  {bookingMutation.isPending ? 'Đang gửi thông tin...' : 'Gửi đăng ký mua máy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {isSuccessModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            animation: 'check-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.25)'
            }}>
              <CheckCircle size={40} fill="rgba(16, 185, 129, 0.1)" />
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem', color: '#0f172a' }}>
              Gửi đăng ký thành công!
            </h3>
            
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              MobiStore xin cảm ơn quý khách. Chúng tôi đã nhận được thông tin đăng ký tư vấn mua máy và sẽ liên hệ lại với quý khách qua số điện thoại sớm nhất để xác nhận.
            </p>
            
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="btn-primary"
              style={{
                backgroundColor: '#2563eb',
                width: '100%',
                padding: '0.85rem',
                fontWeight: '700',
                borderRadius: '0.75rem',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              Hoàn thành
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
