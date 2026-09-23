import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Building2,
  Calendar,
  Tag,
  Box,
  Barcode,
  FileText,
  DollarSign,
  Truck,
} from 'lucide-react';
import { getImportOrders, getProductById, type ImportOrder, type Product } from '../api/inventory';
import { useBranchContext } from '../context/BranchContext';

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const formatDate = (date?: string) => {
  if (!date) return '--';
  return new Date(date).toLocaleString('vi-VN');
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBranchId } = useBranchContext();

  const { data: product, isLoading: isLoadingProduct } = useQuery<Product>({
    queryKey: ['productDetail', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });

  const { data: importOrders = [] } = useQuery<ImportOrder[]>({
    queryKey: ['productImportHistory', id, selectedBranchId],
    queryFn: async () => {
      const response = await getImportOrders(selectedBranchId || undefined, 1, 200);
      const orders = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      return orders;
    },
    enabled: !!id,
  });

  const history = React.useMemo(() => {
    if (!product) return [];

    return (importOrders || []).flatMap((order) =>
      (order.batches || [])
        .filter((batch) => batch.productId === product.id || batch.product?.id === product.id)
        .map((batch) => ({
          id: batch.id,
          orderId: order.id,
          orderCode: order.code || order.id,
          importDate: order.importDate || order.createdAt,
          distributor: order.distributor?.name || '--',
          invoiceName: order.invoiceName || '--',
          quantity: Number(batch.importedQuantity || 0),
          unitPrice: Number(batch.costPrice || 0),
          total: Number(batch.costPrice || 0) * Number(batch.importedQuantity || 0),
          note: order.note || '--',
        }))
    );
  }, [product, importOrders]);

  if (isLoadingProduct) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', color: '#64748b', fontWeight: 600 }}>
        Đang tải chi tiết sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', gap: '1rem', color: '#64748b' }}>
        <Package size={48} color="#cbd5e1" />
        <div style={{ fontWeight: 700, color: '#475569' }}>Không tìm thấy sản phẩm</div>
        <button
          onClick={() => navigate('/admin/products')}
          style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const totalImported = history.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = history.reduce((sum, item) => sum + item.total, 0);

  return (
    <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/admin/products')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', border: '1px solid #e2e8f0', borderRadius: '9999px', backgroundColor: '#fff', cursor: 'pointer' }}
            title="Quay lại"
          >
            <ArrowLeft size={18} color="#475569" />
          </button>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Chi tiết sản phẩm
            </div>
            <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {product.name}
            </h1>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { icon: Barcode, label: 'Mã sản phẩm', value: product.productCode || '--', color: '#3b82f6', bg: '#eff6ff' },
          { icon: Tag, label: 'Mã vạch', value: product.barcode || '--', color: '#8b5cf6', bg: '#f5f3ff' },
          { icon: Box, label: 'Danh mục', value: product.category?.name || '--', color: '#10b981', bg: '#f0fdf4' },
          { icon: Truck, label: 'Đơn vị', value: product.unit?.name || '--', color: '#f59e0b', bg: '#fffbeb' },
        ].map((item) => (
          <div key={item.label} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={18} color={item.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 700, marginBottom: '0.35rem' }}>
            <DollarSign size={16} color="#f59e0b" /> Giá gốc
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>{formatCurrency(Number(product.basePrice || 0))}</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 700, marginBottom: '0.35rem' }}>
            <Calendar size={16} color="#3b82f6" /> Tổng lượng nhập
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>{totalImported.toLocaleString()} sp</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 700, marginBottom: '0.35rem' }}>
            <Building2 size={16} color="#10b981" /> Tổng giá trị nhập
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>{formatCurrency(totalValue)}</div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#3b82f6" />
          <span style={{ fontWeight: 800, color: '#1e293b' }}>Lịch sử nhập hàng</span>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            Chưa có lịch sử nhập hàng cho sản phẩm này.
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Mã phiếu</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Ngày nhập</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Nhà cung cấp</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Số hóa đơn</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 700 }}>SL</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Đơn giá</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 600 }}>{item.orderCode}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{formatDate(item.importDate)}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{item.distributor}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{item.invoiceName}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>{item.quantity.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#475569' }}>{formatCurrency(item.unitPrice)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
