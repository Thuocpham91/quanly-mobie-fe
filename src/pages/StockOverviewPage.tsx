import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package, AlertTriangle, TrendingDown, Layers, Search,
  FileDown, SlidersHorizontal, RefreshCw, X, ChevronUp, ChevronDown,
  Box, Tag, DollarSign, BarChart2
} from 'lucide-react';
import { getInventoryBatches } from '../api/inventory';
import { useBranchContext } from '../context/BranchContext';
import Pagination from '../components/Pagination';
import * as XLSX from 'xlsx';

// ─── Threshold ───────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 5;

// ─── Types ───────────────────────────────────────────────────
type SortKey = 'productName' | 'importedQty' | 'currentQty' | 'costPrice' | 'expiryDate';
type SortDir = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────
function formatCurrency(val: number) {
  return val.toLocaleString('vi-VN') + ' ₫';
}
function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}
function isExpiringSoon(d?: string) {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 3600 * 1000;
}
function isExpired(d?: string) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

// ─── Component ───────────────────────────────────────────────
const StockOverviewPage: React.FC = () => {
  const { selectedBranchId } = useBranchContext();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'EMPTY' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('currentQty');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['inventoryBatches', selectedBranchId, page, limit],
    queryFn: () => getInventoryBatches(selectedBranchId || undefined, page, limit),
    enabled: true,
  });

  const batches: any[] = useMemo(() => data?.data || [], [data]);
  const meta = data?.meta || { total: 0, page, limit, totalPages: 1 };

  const stats = useMemo(() => ({
    totalBatches: meta.total,
    totalStock: batches.reduce((s: number, b: any) => s + (b.currentQuantity || 0), 0),
    totalValue: batches.reduce((s: number, b: any) => s + (b.currentQuantity || 0) * (b.costPrice || 0), 0),
    lowStockCount: batches.filter((b: any) => (b.currentQuantity || 0) > 0 && (b.currentQuantity || 0) <= LOW_STOCK_THRESHOLD).length,
    emptyCount: batches.filter((b: any) => (b.currentQuantity || 0) === 0).length,
    expiringCount: batches.filter((b: any) => isExpiringSoon(b.expiryDate) && !isExpired(b.expiryDate)).length,
  }), [batches, meta.total]);

  const filtered = useMemo(() => {
    let list = [...batches];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((b: any) =>
        b.product?.name?.toLowerCase().includes(q) ||
        b.product?.barcode?.toLowerCase().includes(q) ||
        b.product?.productCode?.toLowerCase().includes(q)
      );
    }
    if (stockFilter === 'LOW') list = list.filter((b: any) => (b.currentQuantity || 0) > 0 && (b.currentQuantity || 0) <= LOW_STOCK_THRESHOLD);
    if (stockFilter === 'EMPTY') list = list.filter((b: any) => (b.currentQuantity || 0) === 0);
    if (stockFilter === 'EXPIRING') list = list.filter((b: any) => isExpiringSoon(b.expiryDate) && !isExpired(b.expiryDate));
    if (stockFilter === 'EXPIRED') list = list.filter((b: any) => isExpired(b.expiryDate));

    list.sort((a: any, b: any) => {
      let va: any = 0, vb: any = 0;
      if (sortKey === 'productName') { va = a.product?.name || ''; vb = b.product?.name || ''; }
      else if (sortKey === 'importedQty') { va = a.importedQuantity || 0; vb = b.importedQuantity || 0; }
      else if (sortKey === 'currentQty') { va = a.currentQuantity || 0; vb = b.currentQuantity || 0; }
      else if (sortKey === 'costPrice') { va = a.costPrice || 0; vb = b.costPrice || 0; }
      else if (sortKey === 'expiryDate') { va = a.expiryDate || ''; vb = b.expiryDate || ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [batches, searchTerm, stockFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleExportExcel = () => {
    const rows = filtered.map((b: any, idx: number) => ({
      'STT': idx + 1,
      'Tên sản phẩm': b.product?.name || '—',
      'Barcode': b.product?.barcode || '—',
      'Đã nhập': b.importedQuantity || 0,
      'Tồn hiện tại': b.currentQuantity || 0,
      'Giá nhập': b.costPrice || 0,
      'Giá trị tồn (₫)': (b.currentQuantity || 0) * (b.costPrice || 0),
      'Hạn sử dụng': formatDate(b.expiryDate),
      'Ngày nhập': formatDate(b.importDate),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TonKho');
    XLSX.writeFile(wb, `ton_kho_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const activeFilterCount = (searchTerm ? 1 : 0) + (stockFilter !== 'ALL' ? 1 : 0);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>⇅</span>;
    return sortDir === 'asc' ? <ChevronUp size={13} color="#fff" /> : <ChevronDown size={13} color="#fff" />;
  };

  const stockBadge = (qty: number, expiryDate?: string) => {
    if (isExpired(expiryDate))
      return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#1e293b', color: '#f8fafc', fontSize: '0.72rem', fontWeight: 700 }}>Hết hạn</span>;
    if (qty === 0)
      return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700 }}>Hết hàng</span>;
    if (qty <= LOW_STOCK_THRESHOLD)
      return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.72rem', fontWeight: 700 }}>Sắp hết</span>;
    if (isExpiringSoon(expiryDate))
      return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#fff7ed', color: '#ea580c', fontSize: '0.72rem', fontWeight: 700 }}>Sắp HSD</span>;
    return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700 }}>Còn hàng</span>;
  };

  const statCards = [
    { id: 'stat-total-batches', label: 'Tổng lô hàng', value: meta.total, icon: Layers, bg: '#eff6ff', ic: '#3b82f6', border: '#bfdbfe', small: false, onClick: undefined as (() => void) | undefined },
    { id: 'stat-total-stock', label: 'Tổng tồn kho', value: stats.totalStock.toLocaleString() + ' sp', icon: Box, bg: '#f0fdf4', ic: '#10b981', border: '#bbf7d0', small: false, onClick: undefined },
    { id: 'stat-total-value', label: 'Giá trị kho', value: formatCurrency(stats.totalValue), icon: DollarSign, bg: '#fefce8', ic: '#ca8a04', border: '#fde68a', small: true, onClick: undefined },
    { id: 'stat-low-stock', label: 'Sắp hết hàng', value: stats.lowStockCount, icon: TrendingDown, bg: '#fff7ed', ic: '#ea580c', border: '#fed7aa', small: false, onClick: () => { setStockFilter('LOW'); setIsFilterOpen(true); } },
    { id: 'stat-empty', label: 'Hết hàng', value: stats.emptyCount, icon: AlertTriangle, bg: '#fef2f2', ic: '#dc2626', border: '#fecaca', small: false, onClick: () => { setStockFilter('EMPTY'); setIsFilterOpen(true); } },
    { id: 'stat-expiring', label: 'Sắp hết HSD', value: stats.expiringCount, icon: BarChart2, bg: '#fdf4ff', ic: '#9333ea', border: '#e9d5ff', small: false, onClick: () => { setStockFilter('EXPIRING'); setIsFilterOpen(true); } },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem 0.5rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={22} color="#6366f1" /> Quản lý tồn kho
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
            Theo dõi số lượng tồn, lô hàng và cảnh báo kho theo thời gian thực
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              id="stock-search"
              type="text"
              placeholder="Tên, barcode, mã sản phẩm..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.85rem 0.45rem 2.1rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', padding: 0, color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          <button
            id="stock-filter-btn"
            onClick={() => setIsFilterOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', backgroundColor: isFilterOpen ? '#eef2ff' : 'white', color: isFilterOpen ? '#6366f1' : '#475569', cursor: 'pointer' }}
          >
            <SlidersHorizontal size={15} />
            Lọc
            {activeFilterCount > 0 && (
              <span style={{ backgroundColor: '#6366f1', color: 'white', borderRadius: '9999px', padding: '0.05rem 0.4rem', fontSize: '0.68rem', fontWeight: 700 }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            id="stock-refresh-btn"
            onClick={() => refetch()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', cursor: 'pointer' }}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            Làm mới
          </button>

          <button
            id="stock-export-btn"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem', borderRadius: '0.4rem', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 600 }}
          >
            <FileDown size={15} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {isFilterOpen && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.6rem', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.3rem' }}>Trạng thái tồn kho</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {([
                { value: 'ALL', label: 'Tất cả' },
                { value: 'LOW', label: '⚠ Sắp hết' },
                { value: 'EMPTY', label: '🚫 Hết hàng' },
                { value: 'EXPIRING', label: '⏰ Sắp HSD' },
                { value: 'EXPIRED', label: '💀 Quá HSD' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  id={`stock-filter-${opt.value}`}
                  onClick={() => { setStockFilter(opt.value); setPage(1); }}
                  style={{
                    padding: '0.35rem 0.7rem', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    border: stockFilter === opt.value ? '2px solid #6366f1' : '1px solid #e2e8f0',
                    backgroundColor: stockFilter === opt.value ? '#eef2ff' : 'white',
                    color: stockFilter === opt.value ? '#6366f1' : '#64748b',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setStockFilter('ALL'); setSearchTerm(''); }}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', fontSize: '0.8rem', borderRadius: '0.4rem', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
          >
            <X size={13} /> Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        {statCards.map((s) => (
          <div
            key={s.id}
            id={s.id}
            onClick={s.onClick}
            style={{
              backgroundColor: 'white', borderRadius: '0.65rem',
              padding: '0.85rem 1rem', border: `1px solid ${s.border}`,
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              cursor: s.onClick ? 'pointer' : 'default',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => { if (s.onClick) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; } }}
            onMouseLeave={e => { if (s.onClick) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; } }}
          >
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.ic} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.1rem' }}>{s.label}</div>
              <div style={{ fontSize: s.small ? '0.85rem' : '1.05rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
            Danh sách lô hàng
            {filtered.length !== batches.length && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6366f1', fontWeight: 500 }}>
                ({filtered.length} / {batches.length} lô)
              </span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setStockFilter('ALL'); setSearchTerm(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.35rem', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
            >
              <X size={11} /> Bỏ lọc
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '860px' }}>
            <thead style={{ backgroundColor: '#6366f1', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', width: '40px' }}>STT</th>
                <th id="th-product" style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('productName')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Tag size={13} /> Sản phẩm <SortIcon k="productName" />
                  </div>
                </th>
                <th style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem' }}>Đơn vị</th>
                <th id="th-imported" style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('importedQty')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>Đã nhập <SortIcon k="importedQty" /></div>
                </th>
                <th id="th-current" style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('currentQty')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>Tồn kho <SortIcon k="currentQty" /></div>
                </th>
                <th id="th-cost" style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('costPrice')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>Giá nhập <SortIcon k="costPrice" /></div>
                </th>
                <th style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', textAlign: 'right' }}>Giá trị tồn</th>
                <th id="th-expiry" style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('expiryDate')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>Hạn SD <SortIcon k="expiryDate" /></div>
                </th>
                <th style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.82rem', textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                      <RefreshCw size={28} className="animate-spin" color="#6366f1" />
                      <span style={{ fontSize: '0.9rem' }}>Đang tải dữ liệu tồn kho...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                      <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={32} color="#cbd5e1" />
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#64748b' }}>
                        {searchTerm || stockFilter !== 'ALL' ? 'Không tìm thấy lô hàng phù hợp' : 'Chưa có dữ liệu tồn kho'}
                      </p>
                      {(searchTerm || stockFilter !== 'ALL') && (
                        <button onClick={() => { setSearchTerm(''); setStockFilter('ALL'); }} style={{ padding: '0.4rem 1rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((batch: any, idx: number) => {
                const qty = batch.currentQuantity || 0;
                const importedQty = batch.importedQuantity || 0;
                const cost = batch.costPrice || 0;
                const value = qty * cost;
                const isLow = qty > 0 && qty <= LOW_STOCK_THRESHOLD;
                const isEmpty = qty === 0;
                const expiredFlag = isExpired(batch.expiryDate);
                const expiringSoonFlag = isExpiringSoon(batch.expiryDate);
                const rowBg = expiredFlag ? '#f8fafc' : isEmpty ? '#fff5f5' : isLow ? '#fffbeb' : idx % 2 === 0 ? 'white' : '#f8fafc';
                return (
                  <tr
                    key={batch.id}
                    id={`stock-row-${batch.id}`}
                    style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: rowBg, transition: 'background-color 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = rowBg)}
                  >
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>{(page - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{batch.product?.name || '—'}</div>
                      {batch.product?.barcode && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>#{batch.product.barcode}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>{batch.product?.unit?.name || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#3b82f6', fontSize: '0.9rem' }}>{importedQty.toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: isEmpty ? '#dc2626' : isLow ? '#d97706' : '#16a34a' }}>
                          {qty.toLocaleString()}
                        </span>
                        <div style={{ width: '48px', height: '4px', borderRadius: '9999px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${importedQty > 0 ? Math.min(100, (qty / importedQty) * 100) : 0}%`,
                            borderRadius: '9999px',
                            backgroundColor: isEmpty ? '#dc2626' : isLow ? '#f59e0b' : '#10b981',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                      {cost > 0 ? formatCurrency(cost) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                      {value > 0 ? formatCurrency(value) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.82rem' }}>
                      {batch.expiryDate ? (
                        <span style={{ color: expiredFlag ? '#dc2626' : expiringSoonFlag ? '#ea580c' : '#64748b', fontWeight: (expiredFlag || expiringSoonFlag) ? 700 : 400 }}>
                          {formatDate(batch.expiryDate)}
                        </span>
                      ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {stockBadge(qty, batch.expiryDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={meta.totalPages} onPageChange={p => setPage(p)} totalItems={meta.total} />
    </div>
  );
};

export default StockOverviewPage;
