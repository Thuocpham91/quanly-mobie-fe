import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  Dog, 
  Cat, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  ArrowRight,
  Heart,
  Calendar,
  UserCheck
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white',
      color: '#0f172a',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem 5%',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: 'var(--primary)', 
            padding: '0.5rem', 
            borderRadius: '0.5rem',
            color: 'white'
          }}>
            <Dog size={24} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.025em' }}>PetCare</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="#features" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>{t('common.dashboard')}</a>
          <LanguageSwitcher />
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary" 
            style={{ 
              padding: '0.6rem 1.5rem',
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
            }}
          >
            {t('common.staff_login')}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '6rem 5% 4rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        gap: '4rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: 'rgba(99, 102, 241, 0.1)', 
            color: 'var(--primary)',
            borderRadius: '2rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1.5rem'
          }}>
            <Heart size={16} />
            {t('landing.hero_badge')}
          </div>
          <h1 style={{ 
            fontSize: '4rem', 
            lineHeight: 1.1, 
            fontWeight: '800', 
            marginBottom: '1.5rem',
            letterSpacing: '-0.04em'
          }}>
            <Trans i18nKey="landing.hero_title">
              We Care for Your <span style={{ color: 'var(--primary)' }}>Furry Friends</span> Like Family.
            </Trans>
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#64748b', 
            lineHeight: 1.6, 
            marginBottom: '2.5rem',
            maxWidth: '540px'
          }}>
            {t('landing.hero_subtitle')}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              padding: '1rem 2rem', 
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {t('common.book_appointment')} <ArrowRight size={20} />
            </button>
            <button style={{ 
              backgroundColor: 'transparent', 
              border: '2px solid #e2e8f0',
              padding: '1rem 2rem', 
              fontSize: '1.1rem'
            }}>
              {t('common.learn_more')}
            </button>
          </div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <div style={{ 
            width: '100%', 
            height: '500px', 
            backgroundColor: '#f1f5f9', 
            borderRadius: '2rem',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Image Placeholder */}
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: 'white'
            }}>
              <Dog size={120} strokeWidth={1} />
            </div>
          </div>
          
          {/* Floating Stats */}
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '-40px',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981',
              padding: '0.75rem',
              borderRadius: '0.75rem'
            }}>
              <UserCheck size={24} />
            </div>
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>5k+</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('landing.happy_clients')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '6rem 5%', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t('landing.services_title')}</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>{t('landing.services_subtitle')}</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            { icon: <ShieldCheck size={32} />, title: t('landing.feature_expert_title'), desc: t('landing.feature_expert_desc') },
            { icon: <Clock size={32} />, title: t('landing.feature_emergency_title'), desc: t('landing.feature_emergency_desc') },
            { icon: <Calendar size={32} />, title: t('landing.feature_booking_title'), desc: t('landing.feature_booking_desc') },
            { icon: <Cat size={32} />, title: t('landing.feature_grooming_title'), desc: t('landing.feature_grooming_desc') }
          ].map((feature, idx) => (
            <div key={idx} style={{ 
              backgroundColor: 'white', 
              padding: '2.5rem', 
              borderRadius: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                color: 'var(--primary)', 
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '1rem'
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{feature.title}</h3>
              <p style={{ color: '#64748b', lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '4rem 5%', backgroundColor: '#0f172a', color: 'white' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '3rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Dog size={24} color="#6366f1" />
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>PetCare</span>
            </div>
            <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{t('landing.footer_desc')}</p>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '1.5rem' }}>{t('landing.contact_us')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={18} />
                <span>123 Vet Street, Pet City</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={18} />
                <span>+1 (234) 567-890</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '1.5rem' }}>{t('landing.newsletter')}</h4>
            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>{t('landing.newsletter_desc')}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="email" 
                placeholder="Email" 
                style={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  color: 'white',
                  flex: 1
                }} 
              />
              <button className="btn-primary" style={{ padding: '0.75rem' }}>{t('landing.join')}</button>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '4rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid #1e293b', 
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem'
        }}>
          © 2024 PetCare Veterinary Clinic. {t('landing.rights')}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
