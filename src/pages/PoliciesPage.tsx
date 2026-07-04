import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  RotateCw, 
  ChevronRight, 
  Plus, 
  X, 
  BookOpen, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface PolicyCategory {
  id: string;
  name: string;
  count: number;
  items: string[];
}

const initialCategories: PolicyCategory[] = [
  { 
    id: 'all', 
    name: 'All', 
    count: 51,
    items: [
      'Nội quy đi muộn và về sớm',
      'Quy chế đồng phục công sở',
      'Phụ cấp chuyên cần hàng tháng',
      'Thưởng doanh số vượt KPI',
      'Định mức phụ cấp xăng xe & điện thoại'
    ]
  },
  { 
    id: 'phucap', 
    name: 'CHÍNH SÁCH PHỤ CẤP', 
    count: 2,
    items: [
      'Quy định phụ cấp tiền ăn trưa',
      'Định mức phụ cấp xăng xe & điện thoại'
    ]
  },
  { 
    id: 'thuong', 
    name: 'CHÍNH SÁCH THƯỞNG', 
    count: 5,
    items: [
      'Thưởng lương tháng 13',
      'Thưởng thâm niên làm việc',
      'Thưởng sáng kiến đóng góp',
      'Thưởng các ngày lễ lớn trong năm',
      'Thưởng nóng cho thành tích xuất sắc'
    ]
  },
  { 
    id: 'marketing', 
    name: 'CHÍNH SÁCH THƯỞNG MARKETING', 
    count: 1,
    items: [
      'Thưởng doanh số từ chiến dịch quảng cáo mạng xã hội'
    ]
  },
  { 
    id: 'capduoi', 
    name: 'ĐỐI VỚI CẤP DƯỚI', 
    count: 5,
    items: [
      'Quy trình hướng dẫn và đào tạo nhân viên mới',
      'Quy định đánh giá hiệu suất thử việc',
      'Chính sách hỗ trợ tài chính khẩn cấp',
      'Lịch họp 1-on-1 định kỳ hàng tuần',
      'Ủy quyền phê duyệt ngân sách nhỏ'
    ]
  },
  { 
    id: 'captren', 
    name: 'ĐỐI VỚI CẤP TRÊN', 
    count: 5,
    items: [
      'Quy trình báo cáo tiến độ công việc hàng tuần',
      'Thủ tục xin phê duyệt ngân sách dự án lớn',
      'Quy tắc ứng xử và giao tiếp chuẩn mực',
      'Góp ý xây dựng và cải tiến quy trình công việc',
      'Quy định xin nghỉ phép dài hạn'
    ]
  },
  { 
    id: 'dongnghiep', 
    name: 'ĐỐI VỚI ĐỒNG NGHỊỆP', 
    count: 5,
    items: [
      'Quy tắc chia sẻ tài liệu chung trên drive',
      'Văn hóa hỗ trợ chéo giữa các bộ phận',
      'Nội quy bàn giao ca trực kỹ thuật',
      'Quy chế tổ chức sinh nhật và teambuilding',
      'Nguyên tắc giữ gìn vệ sinh không gian làm việc chung'
    ]
  },
  { 
    id: 'doitac', 
    name: 'ĐỐI VỚI KHÁCH HÀNG & ĐỐI TÁC', 
    count: 5,
    items: [
      'Chính sách bảo mật thông tin khách hàng',
      'Quy trình xử lý khiếu nại của đối tác',
      'Hạn mức tặng quà đối tác vào dịp tết',
      'Tiêu chuẩn chăm sóc khách hàng VIP',
      'Quy chế hoàn tiền đơn hàng lỗi kỹ thuật'
    ]
  },
  { 
    id: 'chung', 
    name: 'NỘI QUY CHUNG', 
    count: 18,
    items: [
      'Nội quy giờ giấc làm việc',
      'Quy chế đồng phục công sở',
      'Quy tắc bảo mật thông tin nội bộ',
      'Chính sách sử dụng thiết bị công ty',
      'Quy định an toàn lao động và phòng chống cháy nổ'
    ]
  }
];

const PoliciesPage: React.FC = () => {
  const [categories, setCategories] = useState<PolicyCategory[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Policy modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyCategory, setNewPolicyCategory] = useState(initialCategories[1].id);
  const [newPolicyContent, setNewPolicyContent] = useState('');

  // Search logic
  const filteredCategories = categories.map(cat => {
    if (!searchTerm.trim()) return cat;
    const items = cat.items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      ...cat,
      items,
      count: cat.id === 'all' ? items.length : cat.count
    };
  }).filter(cat => cat.id === 'all' || cat.items.length > 0 || cat.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRefresh = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setCategories(initialCategories);
    alert('Đã làm mới dữ liệu chính sách!');
  };

  const handleAddPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;

    const name = newPolicyName.trim();
    
    setCategories(prev => prev.map(cat => {
      // Add to "all"
      if (cat.id === 'all') {
        return {
          ...cat,
          count: cat.count + 1,
          items: [name, ...cat.items]
        };
      }
      // Add to selected category
      if (cat.id === newPolicyCategory) {
        return {
          ...cat,
          count: cat.count + 1,
          items: [name, ...cat.items]
        };
      }
      return cat;
    }));

    setIsAddModalOpen(false);
    setNewPolicyName('');
    setNewPolicyContent('');
    alert('Đã thêm nội quy mới thành công!');
  };

  return (
    <div style={{
      minHeight: '85vh',
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025)',
      fontFamily: '"Outfit", "Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Policy Header (Deep Pink color matching mockup) */}
      <div style={{
        backgroundColor: '#d81b60',
        color: 'white',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button style={headerIconButtonStyle}>
            <Menu size={22} />
          </button>
          <span style={{ fontSize: '1.15rem', fontWeight: '700' }}>Nội Quy Chính Sách</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setSearchOpen(!searchOpen)} style={headerIconButtonStyle}>
            <Search size={22} />
          </button>
          <button onClick={handleRefresh} style={headerIconButtonStyle}>
            <RotateCw size={22} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {searchOpen && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: '#f8fafc'
        }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm nội quy chính sách..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem 0.875rem',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <button 
            onClick={() => { setSearchTerm(''); setSearchOpen(false); }}
            style={{
              padding: '0.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div style={{ padding: '0 0 4rem 0' }}>
        {selectedCategory ? (
          /* Category detail view */
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #edf2f7'
            }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#4a5568' }}>
                {selectedCategory.name} ({selectedCategory.items.length})
              </span>
              <button 
                onClick={() => setSelectedCategory(null)}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#d81b60',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                Quay lại
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selectedCategory.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#718096' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 0.5rem', color: '#a0aec0' }} />
                  Không có nội quy chính sách nào trong mục này.
                </div>
              ) : (
                selectedCategory.items.map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.92rem',
                      color: '#2d3748',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      lineHeight: '1.4'
                    }}
                  >
                    <div style={{
                      backgroundColor: 'rgba(216, 27, 96, 0.1)',
                      color: '#d81b60',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {index + 1}
                    </div>
                    <span>{item}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* List category view matching mockup exactly */
          <div>
            {/* Header label */}
            <div style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #edf2f7',
              fontSize: '0.9rem',
              fontWeight: '700',
              color: '#475569'
            }}>
              Hạng Mục
            </div>

            {/* Categories List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredCategories.map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.05rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ 
                      fontSize: '0.825rem', 
                      fontWeight: '700', 
                      color: cat.id === 'all' ? '#1e293b' : '#334155',
                      letterSpacing: '0.02em'
                    }}>
                      {cat.name}
                    </span>
                    {cat.id !== 'all' && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '0.25rem',
                        marginLeft: '0.25rem'
                      }}>
                        {cat.count}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: window.innerWidth < 768 ? '80px' : '24px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#d81b60',
          border: 'none',
          boxShadow: '0 4px 10px rgba(216, 27, 96, 0.4)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 99,
          transition: 'transform 0.15s, background-color 0.15s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c2185b'; e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#d81b60'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Plus size={28} />
      </button>

      {/* Add Policy Modal */}
      {isAddModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Thêm Nội Quy Chính Sách</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={closeModalButtonStyle}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddPolicy}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Tên nội quy *</label>
                  <input 
                    type="text" 
                    placeholder="VD: Phụ cấp thêm ca trực kỹ thuật tối..." 
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Hạng mục chính sách</label>
                  <select 
                    value={newPolicyCategory}
                    onChange={(e) => setNewPolicyCategory(e.target.value)}
                    style={selectStyle}
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Nội dung chi tiết</label>
                  <textarea 
                    rows={4}
                    placeholder="Nhập nội dung quy định chi tiết..." 
                    value={newPolicyContent}
                    onChange={(e) => setNewPolicyContent(e.target.value)}
                    style={textareaStyle}
                  />
                </div>
              </div>
              <div style={modalFooterStyle}>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  style={cancelModalButtonStyle}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  style={confirmModalButtonStyle}
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styling variables
const headerIconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  padding: '0.25rem',
  display: 'flex',
  alignItems: 'center'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '0.375rem'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.875rem',
  fontSize: '0.9rem',
  border: '1px solid #cbd5e1',
  borderRadius: '0.375rem',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer'
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'inherit',
  resize: 'vertical'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  backdropFilter: 'blur(4px)',
  padding: '1rem'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  width: '100%',
  maxWidth: '440px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.25rem',
  borderBottom: '1px solid #f1f5f9'
};

const closeModalButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '0.25rem',
  display: 'flex',
  alignItems: 'center'
};

const modalFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  padding: '0.875rem 1.25rem',
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #f1f5f9'
};

const cancelModalButtonStyle: React.CSSProperties = {
  padding: '0.45rem 1rem',
  backgroundColor: 'white',
  border: '1px solid #cbd5e1',
  borderRadius: '0.25rem',
  color: '#475569',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer'
};

const confirmModalButtonStyle: React.CSSProperties = {
  padding: '0.45rem 1rem',
  backgroundColor: '#d81b60',
  border: 'none',
  borderRadius: '0.25rem',
  color: 'white',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer'
};

export default PoliciesPage;
