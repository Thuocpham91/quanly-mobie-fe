import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Edit2, Trash2, LayoutGrid, Tags, X, QrCode, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  getCategories, createCategory, updateCategory, deleteCategory,
  getItemGroups, createItemGroup, updateItemGroup, deleteItemGroup,
  getClassifications, createClassification, updateClassification, deleteClassification,
  getUnits, createUnit, updateUnit, deleteUnit
} from '../api/inventory';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'groups' | 'classifications' | 'units' | 'qr_config'>('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // QR Bank Settings states (initialized from localStorage)
  const [qrBank, setQrBank] = useState<string>(localStorage.getItem('qr_bank') || 'MB');
  const [qrAccount, setQrAccount] = useState<string>(localStorage.getItem('qr_account') || '');
  const [qrName, setQrName] = useState<string>(localStorage.getItem('qr_name') || '');
  const [qrMemo, setQrMemo] = useState<string>(localStorage.getItem('qr_memo') || 'MobiStore Thanh Toan');

  // Data fetching
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: activeTab === 'categories'
  });

  const { data: itemGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['itemGroups'],
    queryFn: getItemGroups,
    enabled: activeTab === 'groups'
  });

  const { data: classifications = [], isLoading: isLoadingClassifications } = useQuery({
    queryKey: ['classifications'],
    queryFn: getClassifications,
    enabled: activeTab === 'classifications'
  });

  const { data: units = [], isLoading: isLoadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: getUnits,
    enabled: activeTab === 'units'
  });

  // Mutations
  const mutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (activeTab === 'categories') {
        return editingItem ? updateCategory(editingItem.id, data) : createCategory(data);
      } else if (activeTab === 'groups') {
        return editingItem ? updateItemGroup(editingItem.id, data) : createItemGroup(data);
      } else if (activeTab === 'classifications') {
        return editingItem ? updateClassification(editingItem.id, data) : createClassification(data);
      } else {
        return editingItem ? updateUnit(editingItem.id, data) : createUnit(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (activeTab === 'categories') return deleteCategory(id);
      if (activeTab === 'groups') return deleteItemGroup(id);
      if (activeTab === 'classifications') return deleteClassification(id);
      return deleteUnit(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, description: item.description || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const currentData = activeTab === 'categories' ? categories : 
                     activeTab === 'groups' ? itemGroups :
                     activeTab === 'classifications' ? classifications : units;
  
  const isLoading = activeTab === 'categories' ? isLoadingCategories : 
                    activeTab === 'groups' ? isLoadingGroups :
                    activeTab === 'classifications' ? isLoadingClassifications : isLoadingUnits;

  const addButtonLabel = activeTab === 'categories' ? t('settings.add_category') : 
                        activeTab === 'groups' ? t('settings.add_group') :
                        activeTab === 'classifications' ? t('settings.add_classification') : t('settings.add_unit');

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={32} color="#3b82f6" />
            {t('settings.title')}
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{t('settings.subtitle')}</p>
        </div>
        {activeTab !== 'qr_config' && (
          <button 
            onClick={() => openModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Plus size={20} />
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <TabButton 
          active={activeTab === 'categories'} 
          onClick={() => setActiveTab('categories')} 
          icon={<LayoutGrid size={18} />} 
          label={t('settings.tab_categories')} 
        />
        <TabButton 
          active={activeTab === 'groups'} 
          onClick={() => setActiveTab('groups')} 
          icon={<Tags size={18} />} 
          label={t('settings.tab_groups')} 
        />
        <TabButton 
          active={activeTab === 'classifications'} 
          onClick={() => setActiveTab('classifications')} 
          icon={<LayoutGrid size={18} />} 
          label={t('settings.tab_classifications')} 
        />
        <TabButton 
          active={activeTab === 'units'} 
          onClick={() => setActiveTab('units')} 
          icon={<Tags size={18} />} 
          label={t('settings.tab_units')} 
        />
        <TabButton 
          active={activeTab === 'qr_config'} 
          onClick={() => setActiveTab('qr_config')} 
          icon={<QrCode size={18} />} 
          label={t('settings.tab_qr_config')} 
        />
      </div>

      {activeTab === 'qr_config' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              {t('settings.qr_title')}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
              {t('settings.qr_subtitle')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>{t('settings.qr_bank')} *</label>
              <select
                value={qrBank}
                onChange={(e) => setQrBank(e.target.value)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="MB">MBBank (Ngân hàng Quân Đội)</option>
                <option value="VCB">Vietcombank (Ngoại Thương Việt Nam)</option>
                <option value="TCB">Techcombank (Kỹ Thương)</option>
                <option value="ACB">ACB (Á Châu)</option>
                <option value="BIDV">BIDV (Đầu tư và Phát triển)</option>
                <option value="CTG">VietinBank (Công Thương)</option>
                <option value="VBA">Agribank (Nông nghiệp & PTNT)</option>
                <option value="TPB">TPBank (Tiên Phong)</option>
                <option value="VPB">VPBank (Việt Nam Thịnh Vượng)</option>
                <option value="VIB">VIB (Quốc tế)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>{t('settings.qr_account')} *</label>
              <input
                type="text"
                placeholder={t('settings.qr_account_placeholder')}
                value={qrAccount}
                onChange={(e) => setQrAccount(e.target.value)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>{t('settings.qr_holder')} *</label>
              <input
                type="text"
                placeholder={t('settings.qr_holder_placeholder')}
                value={qrName}
                onChange={(e) => setQrName(e.target.value)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#475569' }}>{t('settings.qr_memo')}</label>
              <input
                type="text"
                placeholder={t('settings.qr_memo_placeholder')}
                value={qrMemo}
                onChange={(e) => setQrMemo(e.target.value)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              onClick={() => {
                if (!qrAccount.trim() || !qrName.trim()) {
                  alert(t('settings.qr_error_empty'));
                  return;
                }
                localStorage.setItem('qr_bank', qrBank);
                localStorage.setItem('qr_account', qrAccount.trim());
                localStorage.setItem('qr_name', qrName.trim().toUpperCase());
                localStorage.setItem('qr_memo', qrMemo.trim());
                alert(t('settings.qr_success'));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.7rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.88rem',
                marginTop: '0.5rem'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              <Save size={16} />
              {t('settings.qr_btn_save')}
            </button>
          </div>

          {/* Real-time QR Preview Card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', marginBottom: '1.25rem', marginTop: 0 }}>{t('settings.qr_preview_title')}</h3>
            
            {qrAccount.trim() && qrName.trim() ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
                  <img
                    src={`https://img.vietqr.io/image/${qrBank}-${qrAccount.trim()}-compact2.png?amount=100000&addInfo=${encodeURIComponent(qrMemo)}&accountName=${encodeURIComponent(qrName.trim().toUpperCase())}`}
                    alt="VietQR Viet Nam"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t('settings.qr_preview_demo_amount')} <strong style={{ color: '#10b981' }}>100.000 ₫</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: '600', lineHeight: '1.4' }}>
                  {qrBank} - {qrAccount} <br/>
                  <span style={{ color: 'var(--primary)' }}>{qrName.toUpperCase()}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#94a3b8' }}>
                <QrCode size={56} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: '0.8rem', lineHeight: '1.4', maxWidth: '240px' }}>{t('settings.qr_preview_placeholder')}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : currentData.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', backgroundColor: '#f8fafc', borderRadius: '1rem', border: '2px dashed #e2e8f0' }}>
              <p style={{ color: '#94a3b8' }}>{t('settings.no_data')}</p>
            </div>
          ) : currentData.map((item: any) => (
            <div key={item.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b' }}>{item.name}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>{item.description || t('settings.no_description')}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => openModal(item)}
                  style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#eff6ff', color: '#3b82f6', cursor: 'pointer' }}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => { if(window.confirm(t('common.confirm_delete'))) deleteMutation.mutate(item.id) }}
                  style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '450px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                {editingItem ? t('settings.edit_item') : t('settings.add_item')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('settings.label_name')}</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('settings.label_description')}</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', outline: 'none', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  {t('common.btn_cancel')}
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  {editingItem ? t('common.btn_save') : t('common.btn_create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
      backgroundColor: active ? '#eff6ff' : 'transparent',
      color: active ? '#3b82f6' : '#64748b',
      border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
    }}
  >
    {icon}
    {label}
  </button>
);

export default SettingsPage;
