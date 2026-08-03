import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Calendar, Building2, User,
  Receipt, FileText, Truck, TicketPercent, Banknote, Printer
} from 'lucide-react';
import { getImportOrder, type ImportOrder, type InventoryBatch } from '../api/inventory';
import { formatDate } from '../utils/format';

const InventoryOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery<ImportOrder>({
    queryKey: ['importOrder', id],
    queryFn: () => getImportOrder(id!),
    enabled: !!id,
  });

  const formatCurrency = (val: number) =>
    Number(val || 0).toLocaleString('vi-VN') + ' ₫';

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: '#64748b' }}>
        <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span>Đang tải phiếu nhập...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: '#94a3b8' }}>
        <Package size={48} color="#cbd5e1" />
        <p style={{ fontWeight: '600', color: '#64748b' }}>Không tìm thấy phiếu nhập</p>
        <button onClick={() => navigate('/admin/inventory')} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
          Quay lại
        </button>
      </div>
    );
  }

  const batches: InventoryBatch[] = order.batches || [];
  const subtotal = batches.reduce((s, b) => s + (b.isGift ? 0 : Number(b.costPrice || 0) * b.importedQuantity), 0);
  const grandTotal = subtotal + Number(order.taxAmount || 0) + Number(order.shippingFee || 0) - Number(order.discountAmount || 0);

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETED: { bg: '#dcfce7', text: '#16a34a', label: 'Hoàn thành' },
    CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Đã hủy' },
    DRAFT: { bg: '#fef9c3', text: '#ca8a04', label: 'Nháp' },
  };
  const sc = statusConfig[order.status] || statusConfig.DRAFT;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>

      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/admin/inventory')}
            style={{ padding: '0.5rem', borderRadius: '50%', border: 'none', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <ArrowLeft size={20} color="#64748b" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Phiếu nhập kho — {order.code}
              </h1>
              <span style={{
                padding: '0.2rem 0.75rem', borderRadius: '9999px',
                backgroundColor: sc.bg, color: sc.text,
                fontSize: '0.75rem', fontWeight: '700'
              }}>
                {sc.label}
              </span>
            </div>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
              Tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
        >
          <Printer size={16} /> In phiếu
        </button>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          {
            icon: Calendar, color: '#3b82f6', bg: '#eff6ff',
            label: 'Ngày nhập',
            value: formatDate(order.importDate || order.createdAt),
          },
          {
            icon: Building2, color: '#10b981', bg: '#f0fdf4',
            label: 'Nhà cung cấp',
            value: order.distributor?.name || '--',
          },
          {
            icon: FileText, color: '#f59e0b', bg: '#fffbeb',
            label: 'Số hóa đơn',
            value: order.invoiceName || '--',
          },
          {
            icon: User, color: '#8b5cf6', bg: '#f5f3ff',
            label: 'Người nhập',
            value: order.personnelName || '--',
          },
        ].map((info, i) => (
          <div key={i} style={{
            backgroundColor: 'white', borderRadius: '0.75rem',
            padding: '1rem 1.25rem', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <div style={{
              width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
              backgroundColor: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <info.icon size={18} color={info.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{info.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Items Table */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} color="#3b82f6" />
          <span style={{ fontWeight: '700', color: '#1e293b' }}>Danh sách mặt hàng</span>
          <span style={{
            marginLeft: '0.5rem', padding: '0.1rem 0.6rem', borderRadius: '9999px',
            backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '0.75rem', fontWeight: '700'
          }}>
            {batches.length} mặt hàng
          </span>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
            <thead style={{ backgroundColor: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569' }}>STT</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569' }}>Tên mặt hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569' }}>Đơn vị</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>SL nhập</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Tồn kho</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Đơn giá nhập</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>Thành tiền</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569' }}>HSD</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569', textAlign: 'center' }}>Hàng tặng</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    Không có mặt hàng nào trong phiếu nhập này
                  </td>
                </tr>
              )}
              {batches.map((batch, idx) => {
                const lineTotal = batch.isGift ? 0 : Number(batch.costPrice || 0) * batch.importedQuantity;
                const isLowStock = batch.currentQuantity < batch.importedQuantity * 0.2;
                return (
                  <tr
                    key={batch.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: batch.isGift ? '#fdfce4' : (idx % 2 === 0 ? 'white' : '#f8fafc'),
                    }}
                  >
                    <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>{idx + 1}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{batch.product?.name || 'Sản phẩm đã xóa'}</div>
                      {batch.product?.barcode && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{batch.product.barcode}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                      {batch.product?.unit?.name || '--'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                      {batch.importedQuantity.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: '600',
                        color: batch.currentQuantity > 0 ? (isLowStock ? '#f59e0b' : '#10b981') : '#ef4444'
                      }}>
                        {batch.currentQuantity.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#64748b' }}>
                      {batch.isGift ? <span style={{ color: '#f59e0b', fontWeight: '600' }}>Miễn phí</span> : formatCurrency(Number(batch.costPrice))}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                      {formatCurrency(lineTotal)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: batch.expiryDate ? '#ef4444' : '#94a3b8', fontSize: '0.875rem' }}>
                      {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('vi-VN') : '--'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      {batch.isGift ? (
                        <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#fef9c3', color: '#ca8a04', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700' }}>Tặng</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: Financial Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem',
          border: '1px solid #e2e8f0', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem'
        }}>
          <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Banknote size={18} color="#10b981" /> Tổng kết thanh toán
          </div>

          {[
            { label: 'Tiền hàng (chưa thuế):', value: formatCurrency(subtotal), icon: Receipt, color: '#64748b' },
            { label: 'Thuế VAT:', value: formatCurrency(Number(order.taxAmount)), icon: TicketPercent, color: '#64748b' },
            { label: 'Phí vận chuyển:', value: formatCurrency(Number(order.shippingFee)), icon: Truck, color: '#64748b' },
            { label: 'Giảm giá:', value: `- ${formatCurrency(Number(order.discountAmount))}`, icon: TicketPercent, color: '#ef4444' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                <row.icon size={14} color={row.color} /> {row.label}
              </div>
              <span style={{ fontWeight: '600', color: row.color }}>{row.value}</span>
            </div>
          ))}

          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>Tổng thanh toán:</span>
            <span style={{ fontWeight: '800', color: '#10b981', fontSize: '1.375rem' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {order.note && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#64748b', borderLeft: '3px solid #3b82f6' }}>
              <strong style={{ color: '#475569' }}>Ghi chú: </strong>{order.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryOrderDetailPage;
