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
import {
  getImportOrders,
  getInventoryBatches,
  getProductById,
  type ImportOrder,
  type Product,
} from '../api/inventory';
import { useBranchContext } from '../context/BranchContext';

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null || isNaN(Number(value))) return '--';
  return `${Number(value).toLocaleString('vi-VN')} ₫`;
};

const formatDate = (date?: string) => {
  if (!date) return '--';
  try {
    return new Date(date).toLocaleString('vi-VN');
  } catch {
    return String(date);
  }
};

const renderStatusBadge = (status?: string) => {
  if (!status) return <span style={{ color: '#94a3b8' }}>--</span>;
  const s = String(status).toUpperCase();
  if (s.includes('COMPLETED') || s.includes('HOÀN') || s.includes('HOAN')) {
    return (
      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        Hoàn thành
      </span>
    );
  }
  if (s.includes('DRAFT') || s.includes('NHÁP') || s.includes('NHAP')) {
    return (
      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', backgroundColor: '#fef3c7', color: '#854d0e', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        Nháp
      </span>
    );
  }
  if (s.includes('CANCEL') || s.includes('HỦY') || s.includes('HUY')) {
    return (
      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        Đã hủy
      </span>
    );
  }
  return (
    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
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

  // Query batches for this product (from /inventory/batches?productId=...)
  const { data: batchResponse } = useQuery({
    queryKey: ['productBatches', id, selectedBranchId],
    queryFn: () => getInventoryBatches(selectedBranchId || undefined, 1, 200, id),
    enabled: !!id,
  });

  // Query import orders (from /inventory/import-orders)
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

    const map = new Map<string, any>();

    // 1. Process batches from /inventory/batches?productId=...
    const directBatches = Array.isArray(batchResponse?.data) ? batchResponse.data : [];
    for (const batch of directBatches) {
      const order = batch.importOrder;
      const dist = batch.distributor || order?.distributor;
      map.set(batch.id, {
        id: batch.id,
        orderCode: order?.code || batch.invoiceName || `LÔ-${batch.id.slice(0, 8)}`,
        importDate: batch.importDate || order?.importDate || batch.createdAt,
        supplierCode: dist?.code || '--',
        distributor: dist?.name || '--',
        invoiceNumber: order?.invoiceNumber || batch.invoiceName || order?.invoiceName || '--',
        imeis: batch.imeis || [],
        quantity: Number(batch.importedQuantity || 0),
        unitPrice: Number(batch.unitPrice || batch.costPrice || 0),
        discountPercent: Number(batch.discountPercent || 0),
        discountAmount: Number(batch.discountAmount || 0),
        costPrice: Number(batch.costPrice || 0),
        total: Number(batch.lineTotal || (Number(batch.costPrice || 0) * Number(batch.importedQuantity || 0))),
        totalQuantity: order?.totalQuantity !== undefined ? Number(order.totalQuantity) : undefined,
        totalProductAmount: order?.totalProductAmount !== undefined ? Number(order.totalProductAmount) : (order?.totalAmount !== undefined ? Number(order.totalAmount) : undefined),
        discountOrderAmount: order?.discountAmount !== undefined ? Number(order.discountAmount) : 0,
        debtAmount: order?.debtAmount !== undefined ? Number(order.debtAmount) : undefined,
        paidAmount: order?.paidAmount !== undefined ? Number(order.paidAmount) : undefined,
        status: order?.status || 'COMPLETED',
        note: batch.itemNote || order?.note || '--',
      });
    }

    // 2. Also check product.batches if loaded with product
    if (Array.isArray(product.batches)) {
      for (const batch of product.batches) {
        if (!map.has(batch.id)) {
          const order = (batch as any).importOrder;
          const dist = (batch as any).distributor || order?.distributor;
          map.set(batch.id, {
            id: batch.id,
            orderCode: order?.code || batch.invoiceName || `LÔ-${batch.id.slice(0, 8)}`,
            importDate: batch.importDate || order?.importDate || (batch as any).createdAt,
            supplierCode: dist?.code || '--',
            distributor: dist?.name || '--',
            invoiceNumber: order?.invoiceNumber || batch.invoiceName || order?.invoiceName || '--',
            imeis: (batch as any).imeis || [],
            quantity: Number(batch.importedQuantity || 0),
            unitPrice: Number((batch as any).unitPrice || batch.costPrice || 0),
            discountPercent: Number((batch as any).discountPercent || 0),
            discountAmount: Number((batch as any).discountAmount || 0),
            costPrice: Number(batch.costPrice || 0),
            total: Number((batch as any).lineTotal || (Number(batch.costPrice || 0) * Number(batch.importedQuantity || 0))),
            totalQuantity: order?.totalQuantity !== undefined ? Number(order.totalQuantity) : undefined,
            totalProductAmount: order?.totalProductAmount !== undefined ? Number(order.totalProductAmount) : undefined,
            discountOrderAmount: order?.discountAmount !== undefined ? Number(order.discountAmount) : 0,
            debtAmount: order?.debtAmount !== undefined ? Number(order.debtAmount) : undefined,
            paidAmount: order?.paidAmount !== undefined ? Number(order.paidAmount) : undefined,
            status: order?.status || 'COMPLETED',
            note: (batch as any).itemNote || order?.note || '--',
          });
        }
      }
    }

    // 3. Fallback from importOrders
    for (const order of importOrders) {
      for (const batch of order.batches || []) {
        if (batch.productId === product.id || batch.product?.id === product.id) {
          if (!map.has(batch.id)) {
            const dist = batch.distributor || order.distributor;
            map.set(batch.id, {
              id: batch.id,
              orderCode: order.code || order.id,
              importDate: order.importDate || order.createdAt,
              supplierCode: (dist as any)?.code || '--',
              distributor: dist?.name || '--',
              invoiceNumber: (order as any).invoiceNumber || order.invoiceName || '--',
              imeis: batch.imeis || [],
              quantity: Number(batch.importedQuantity || 0),
              unitPrice: Number((batch as any).unitPrice || batch.costPrice || 0),
              discountPercent: Number((batch as any).discountPercent || 0),
              discountAmount: Number((batch as any).discountAmount || 0),
              costPrice: Number(batch.costPrice || 0),
              total: Number((batch as any).lineTotal || (Number(batch.costPrice || 0) * Number(batch.importedQuantity || 0))),
              totalQuantity: (order as any).totalQuantity !== undefined ? Number((order as any).totalQuantity) : undefined,
              totalProductAmount: (order as any).totalProductAmount !== undefined ? Number((order as any).totalProductAmount) : Number(order.totalAmount || 0),
              discountOrderAmount: Number(order.discountAmount || 0),
              debtAmount: (order as any).debtAmount !== undefined ? Number((order as any).debtAmount) : undefined,
              paidAmount: (order as any).paidAmount !== undefined ? Number((order as any).paidAmount) : undefined,
              status: order.status || 'COMPLETED',
              note: (batch as any).itemNote || order.note || '--',
            });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.importDate || 0).getTime();
      const dateB = new Date(b.importDate || 0).getTime();
      return dateB - dateA;
    });
  }, [product, batchResponse, importOrders]);

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

  const getProductSellingPrice = (p: Product): number | undefined => {
    if (selectedBranchId && p.branchPrices && p.branchPrices.length > 0) {
      const bp = p.branchPrices.find((item) => item.branchId === selectedBranchId);
      if (bp && bp.price !== undefined && bp.price !== null && Number.isFinite(Number(bp.price)) && Number(bp.price) >= 0) {
        return Number(bp.price);
      }
    }
    const defaultPrice = p.basePrice ?? p.sellingPrice ?? p.salePrice ?? p.price;
    return defaultPrice !== undefined && defaultPrice !== null && Number.isFinite(Number(defaultPrice))
      ? Number(defaultPrice)
      : undefined;
  };

  const totalImported = history.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = history.reduce((sum, item) => sum + item.total, 0);
  const sellingPrice = getProductSellingPrice(product);

  return (
    <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/admin/products')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', border: '1px solid #e2e8f0', borderRadius: '9999px', backgroundColor: '#fff', cursor: 'pointer' }}
            title="Quay lại"
          >
            <ArrowLeft size={18} color="#475569" />
          </button>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Chi tiết sản phẩm
            </div>
            <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.25 }}>
              {product.name}
            </h1>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {[
          { icon: Barcode, label: 'Mã sản phẩm', value: product.productCode || '--', color: '#3b82f6', bg: '#eff6ff' },
          { icon: Tag, label: 'Mã vạch', value: product.barcode || '--', color: '#8b5cf6', bg: '#f5f3ff' },
          { icon: Box, label: 'Danh mục', value: product.category?.name || '--', color: '#10b981', bg: '#f0fdf4' },
          { icon: Truck, label: 'Đơn vị', value: product.unit?.name || '--', color: '#f59e0b', bg: '#fffbeb' },
        ].map((item) => (
          <div key={item.label} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.7rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '2rem', height: '2rem', flexShrink: 0, borderRadius: '0.4rem', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={15} color={item.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.7rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.85rem' }}>
            <DollarSign size={14} color="#f59e0b" /> Giá nhập
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{formatCurrency(Number(product.importPrice ?? 0))}</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.7rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.85rem' }}>
            <DollarSign size={14} color="#10b981" /> Giá bán
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{sellingPrice !== undefined ? formatCurrency(sellingPrice) : '--'}</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.7rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.85rem' }}>
            <Calendar size={14} color="#3b82f6" /> Tổng lượng nhập
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{totalImported.toLocaleString()} sp</div>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.7rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.85rem' }}>
            <Building2 size={14} color="#6366f1" /> Tổng giá trị nhập
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{formatCurrency(totalValue)}</div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.7rem 0.9rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="#3b82f6" />
            <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>Lịch sử nhập hàng</span>
          </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            {history.length} lần nhập
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            Chưa có lịch sử nhập hàng cho sản phẩm này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1250px', fontSize: '0.78rem' }}>
              <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Mã phiếu</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Ngày nhập</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Mã NCC</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Nhà cung cấp</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Số hóa đơn</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Serial/IMEI</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Số lượng</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Đơn giá</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Giảm giá %</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Giảm giá</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Giá nhập</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.orderCode}</td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(item.importDate)}</td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.supplierCode}</td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#475569', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.distributor}</td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>{item.invoiceNumber}</td>
                    <td title={(item.imeis || []).join(', ') || '--'} style={{ padding: '0.75rem 0.85rem', color: '#475569', whiteSpace: 'nowrap', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(item.imeis || []).length ? item.imeis.join(', ') : '--'}</td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>{item.quantity.toLocaleString('vi-VN')}</td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>{formatCurrency(item.unitPrice)}</td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>{item.discountPercent ? `${item.discountPercent}%` : '0%'}</td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>{formatCurrency(item.discountAmount)}</td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(item.costPrice)}</td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>{renderStatusBadge(item.status)}</td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</td>
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
