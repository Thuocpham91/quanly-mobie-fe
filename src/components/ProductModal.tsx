import React, { useState, useEffect } from 'react';
import { X, Package, Barcode, Tag, Plus, Image as ImageIcon, Upload, Trash2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { type Product, getCategories, getItemGroups, getClassifications, getUnits, createCategory, createItemGroup, createClassification, createUnit, uploadMultipleFiles } from '../api/inventory';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => Promise<void>;
  product?: Product;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSubmit, product }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [formData, setFormData] = useState<{
    name: string;
    barcode: string;
    productCode: string;
    manufacturer: string;
    imageUrl: string;
    imageUrls: string[];
    categoryId: string;
    itemGroupId: string;
    classificationId: string;
    unitId: string;
    units: any[];
    usage: string;
    isService: boolean;
  }>({
    name: '',
    barcode: '',
    productCode: '',
    manufacturer: '',
    imageUrl: '',
    imageUrls: [],
    categoryId: '',
    itemGroupId: '',
    classificationId: '',
    unitId: '',
    units: [] as any[],
    usage: '',
    isService: false
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isOpen
  });

  const { data: itemGroups = [] } = useQuery({
    queryKey: ['itemGroups'],
    queryFn: getItemGroups,
    enabled: isOpen
  });

  const { data: classifications = [] } = useQuery({
    queryKey: ['classifications'],
    queryFn: getClassifications,
    enabled: isOpen
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: getUnits,
    enabled: isOpen
  });

  // Mutations for Quick Add
  const categoryMutation = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });

  const groupMutation = useMutation({
    mutationFn: (name: string) => createItemGroup({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
  });

  const classificationMutation = useMutation({
    mutationFn: (name: string) => createClassification({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classifications'] })
  });

  const unitMutation = useMutation({
    mutationFn: (name: string) => createUnit({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] })
  });

  const handleQuickAdd = async (type: 'category' | 'group' | 'classification' | 'unit') => {
    const title = type === 'category' ? 'Danh mục' : type === 'group' ? 'Nhóm hàng' : type === 'classification' ? 'Phân loại' : 'Đơn vị';
    const name = prompt(`Nhập tên ${title} mới:`);
    if (!name) return;

    try {
      let result;
      if (type === 'category') result = await categoryMutation.mutateAsync(name);
      else if (type === 'group') result = await groupMutation.mutateAsync(name);
      else if (type === 'classification') result = await classificationMutation.mutateAsync(name);
      else result = await unitMutation.mutateAsync(name);

      if (result && result.id) {
        const fieldMap = { category: 'categoryId', group: 'itemGroupId', classification: 'classificationId', unit: 'unitId' };
        if (type !== 'unit' || !formData.unitId) {
           setFormData(prev => ({ ...prev, [fieldMap[type as keyof typeof fieldMap] || 'unitId']: result.id }));
        }
      }
    } catch (error) {
      alert('Không thể tạo mới. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      const res = await uploadMultipleFiles(fileArray);
      if (res && res.data) {
        const uploadedUrls = res.data.map((item) => item.url);
        setFormData((prev) => {
          const combined = [...(prev.imageUrls || []), ...uploadedUrls];
          return {
            ...prev,
            imageUrls: combined,
            imageUrl: combined[0] || '',
          };
        });
      }
    } catch (error) {
      console.error('Lỗi khi upload ảnh:', error);
      alert('Không thể upload hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddUrl = () => {
    if (!newUrlInput.trim()) return;
    const url = newUrlInput.trim();
    setFormData((prev) => {
      const combined = [...(prev.imageUrls || []), url];
      return {
        ...prev,
        imageUrls: combined,
        imageUrl: combined[0] || '',
      };
    });
    setNewUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const updated = prev.imageUrls.filter((_, i) => i !== index);
      return {
        ...prev,
        imageUrls: updated,
        imageUrl: updated[0] || '',
      };
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const list = [...prev.imageUrls];
      const [selected] = list.splice(index, 1);
      list.unshift(selected);
      return {
        ...prev,
        imageUrls: list,
        imageUrl: list[0] || '',
      };
    });
  };

  useEffect(() => {
    if (product) {
      const list =
        product.imageUrls && product.imageUrls.length > 0
          ? [...product.imageUrls]
          : product.imageUrl
          ? [product.imageUrl]
          : [];
      setFormData({
        name: product.name || '',
        barcode: product.barcode || '',
        productCode: product.productCode || '',
        manufacturer: product.manufacturer || '',
        imageUrl: product.imageUrl || list[0] || '',
        imageUrls: list,
        categoryId: product.categoryId || '',
        itemGroupId: product.itemGroupId || '',
        classificationId: product.classificationId || '',
        unitId: product.unitId || '',
        units: product.units ? [...product.units] : [],
        usage: product.usage || '',
        isService: product.isService || false,
      });
    } else if (!isOpen) {
      setFormData({
        name: '',
        barcode: '',
        productCode: '',
        manufacturer: '',
        imageUrl: '',
        imageUrls: [],
        categoryId: '',
        itemGroupId: '',
        classificationId: '',
        unitId: '',
        units: [],
        usage: '',
        isService: false,
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleServiceChange = async (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isService: checked }));
    if (checked) {
      let targetUnitId = formData.unitId;
      let targetClassificationId = formData.classificationId;

      // 1. Auto select or auto create unit "Lần"
      const lanUnit = units.find((u: any) => u.name.toLowerCase() === 'lần');
      if (lanUnit) {
        targetUnitId = lanUnit.id;
      } else {
        try {
          const newUnit = await unitMutation.mutateAsync('Lần');
          if (newUnit && newUnit.id) {
            targetUnitId = newUnit.id;
          }
        } catch (e) {
          console.error('Failed to auto-create unit "Lần":', e);
        }
      }

      // 2. Auto select or auto create classification "Dịch vụ"
      const dichVuClass = classifications.find(
        (c: any) => c.name.toLowerCase() === 'dịch vụ',
      );
      if (dichVuClass) {
        targetClassificationId = dichVuClass.id;
      } else {
        try {
          const newClass = await classificationMutation.mutateAsync('Dịch vụ');
          if (newClass && newClass.id) {
            targetClassificationId = newClass.id;
          }
        } catch (e) {
          console.error('Failed to auto-create classification "Dịch vụ":', e);
        }
      }

      setFormData((prev) => ({
        ...prev,
        unitId: targetUnitId,
        classificationId: targetClassificationId,
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sanitizedData = {
        name: formData.name,
        barcode: formData.barcode || undefined,
        productCode: formData.productCode || undefined,
        manufacturer: formData.manufacturer || undefined,
        imageUrl: formData.imageUrls?.[0] || formData.imageUrl || undefined,
        imageUrls:
          formData.imageUrls && formData.imageUrls.length > 0
            ? formData.imageUrls
            : undefined,
        categoryId: formData.categoryId || undefined,
        itemGroupId: formData.itemGroupId || undefined,
        classificationId: formData.classificationId || undefined,
        unitId: formData.unitId || undefined,
        usage: formData.usage || undefined,
        isService: formData.isService || false,
        units: formData.units
          .filter((u: any) => u.unitId)
          .map((u: any) => ({
            id: u.id,
            unitId: u.unitId,
            conversionFactor: parseFloat(u.conversionFactor.toString()) || 1,
          })),
      };
      await onSubmit(sanitizedData);
      onClose();
    } catch (error) {
      console.error('Failed to submit product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {product ? t('inventory.modal_edit_product') : t('inventory.modal_add_product')}
          </h2>
          <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b', backgroundColor: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span style={{color: '#ef4444'}}>*</span> {t('inventory.label_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <Package size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
              </div>
              
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="isService"
                  name="isService" 
                  checked={formData.isService}
                  onChange={(e) => handleServiceChange(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="isService" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155', cursor: 'pointer' }}>
                  Đây là Dịch vụ (Không tính tồn kho)
                </label>
              </div>
            </div>

            {/* Barcode */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('inventory.label_barcode')}</label>
              <div style={{ position: 'relative' }}>
                <Barcode size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" name="barcode" value={formData.barcode} onChange={handleChange}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
              </div>
            </div>

            {/* Product Code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('inventory.label_code')}</label>
              <div style={{ position: 'relative' }}>
                <Tag size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" name="productCode" value={formData.productCode} onChange={handleChange}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none' }} />
              </div>
            </div>

            {/* Image Upload Section */}
            <div style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#334155' }}>
                <ImageIcon size={18} style={{ color: '#3b82f6' }} />
                Hình ảnh sản phẩm (Tải lên hoặc dán URL nhiều ảnh)
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                  <Upload size={16} />
                  {isUploading ? 'Đang tải lên...' : 'Tải lên từ máy tính'}
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
                </label>

                <div style={{ display: 'flex', flex: 1, gap: '0.5rem', minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder="Hoặc dán URL hình ảnh..."
                    value={newUrlInput}
                    onChange={(e) => setNewUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                    style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', backgroundColor: 'white' }}
                  />
                  <button type="button" onClick={handleAddUrl} style={{ padding: '0.6rem 1rem', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', border: 'none' }}>
                    Thêm URL
                  </button>
                </div>
              </div>

              {formData.imageUrls && formData.imageUrls.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.75rem' }}>
                  {formData.imageUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: idx === 0 ? '2px solid #3b82f6' : '1px solid #cbd5e1', backgroundColor: 'white', height: '90px' }}>
                      <img src={url} alt={`Ảnh ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLElement).style.opacity = '0.3'; }} />
                      
                      {idx === 0 ? (
                        <span style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: '#3b82f6', color: 'white', fontSize: '0.6rem', fontWeight: '700', padding: '2px 5px', borderRadius: '3px' }}>
                          Ảnh chính
                        </span>
                      ) : (
                        <button
                          type="button"
                          title="Đặt làm ảnh chính"
                          onClick={() => handleSetPrimaryImage(idx)}
                          style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 4px', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                          <Star size={10} /> Chính
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                  Chưa có hình ảnh nào. Bạn có thể chọn nhiều ảnh từ máy tính hoặc dán URL.
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('inventory.label_category')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'white' }}>
                  <option value="">-- {t('common.select_category')} --</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleQuickAdd('category')} style={{ padding: '0 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Group */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('inventory.label_group')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select name="itemGroupId" value={formData.itemGroupId} onChange={handleChange}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'white' }}>
                  <option value="">-- {t('common.select_group')} --</option>
                  {itemGroups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleQuickAdd('group')} style={{ padding: '0 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Classification */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('inventory.label_classification')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select name="classificationId" value={formData.classificationId} onChange={handleChange}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'white' }}>
                  <option value="">-- {t('common.select_classification')} --</option>
                  {classifications.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleQuickAdd('classification')} style={{ padding: '0 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Usage */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t('inventory.label_usage')}</label>
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <ReactQuill 
                  key={product?.id || 'new'}
                  theme="snow" 
                  value={formData.usage} 
                  onChange={(content) => setFormData({...formData, usage: content})}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                      ['link', 'color'],
                      ['clean']
                    ],
                  }}
                  style={{ height: '150px', marginBottom: '40px' }}
                />
              </div>
            </div>

            {/* Default Units Section */}
            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', margin: 0 }}>Thông tin ĐVT mặc định (Tùy chọn)</h3>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, units: [...formData.units, { unitId: '', conversionFactor: 1 }]})}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #10b981', backgroundColor: 'white', color: '#10b981', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={14} /> Thêm quy đổi
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>ĐVT lẻ nhỏ nhất (Gốc)</label>
                    <select name="unitId" value={formData.unitId} onChange={handleChange}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}>
                      <option value="">-- Chọn ĐVT --</option>
                      {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingBottom: '0.6rem' }}>
                    * Đây là đơn vị nhỏ nhất dùng để tính tồn kho
                  </div>
                  <div style={{ width: '32px' }}></div>
                </div>

                {formData.units?.map((u: any, idx: number) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>ĐVT quy đổi {idx + 1}</label>
                      <select 
                        value={u.unitId} 
                        onChange={(e) => {
                          const newUnits = [...formData.units];
                          newUnits[idx].unitId = e.target.value;
                          setFormData({...formData, units: newUnits});
                        }}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
                      >
                        <option value="">-- Chọn ĐVT --</option>
                        {units.map((unit: any) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Hệ số quy đổi</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          value={u.conversionFactor} 
                          onChange={(e) => {
                            const newUnits = [...formData.units];
                            newUnits[idx].conversionFactor = parseFloat(e.target.value) || 0;
                            setFormData({...formData, units: newUnits});
                          }}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }} 
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#94a3b8' }}>
                          x {units.find((base: any) => base.id === formData.unitId)?.name || 'đơn vị gốc'}
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newUnits = formData.units.filter((_: any, i: number) => i !== idx);
                        setFormData({...formData, units: newUnits});
                      }}
                      style={{ padding: '0.6rem', color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '0.75rem 1.5rem', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {product ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
