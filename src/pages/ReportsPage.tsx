import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar as CalendarIcon,
  Search,
  FileDown,
  ChevronRight,
  ChevronDown,
  Eye,
  Building2,
  X,
  PlusSquare,
  MinusSquare,
  User,
  Clock,
  Layers,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useBranchContext } from '../context/BranchContext';
import { getOrders, type Order, type OrderItem } from '../api/orders';
import { getInventorySummary, getProducts, type Product } from '../api/inventory';
import branchesApi from '../api/branches';
import { formatDate } from '../utils/format';
import * as XLSX from 'xlsx';

type InterestType = 'profit_invoice' | 'by_date' | 'discount' | 'by_staff' | 'inventory';
type TimeFilterOption = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

const ReportsPage: React.FC = () => {
  const { selectedBranchId } = useBranchContext();

  // Fetch Branches to display current branch name
  const { data: paginatedBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getBranches(1, 50),
  });
  const allBranches = paginatedBranches?.data || [];
  const currentBranchName = useMemo(() => {
    if (!selectedBranchId) return 'Tất cả chi nhánh';
    const found = allBranches.find((b: any) => b.id === selectedBranchId);
    return found ? found.name : 'Chi nhánh hiện tại';
  }, [allBranches, selectedBranchId]);

  // Sidebar State
  const [activeInterest, setActiveInterest] = useState<InterestType>('profit_invoice');
  const [timeFilterOption, setTimeFilterOption] = useState<TimeFilterOption>('this_month');

  // Date Range State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const firstDayOfMonthStr = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  }, []);

  const [fromDate, setFromDate] = useState<string>(firstDayOfMonthStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Search & Expanded Rows State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Quick Time Filter Selection handler
  const handleTimeOptionChange = (opt: TimeFilterOption) => {
    setTimeFilterOption(opt);
    const now = new Date();
    if (opt === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (opt === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMon));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFromDate(monday.toISOString().split('T')[0]);
      setToDate(sunday.toISOString().split('T')[0]);
    } else if (opt === 'this_month') {
      setFromDate(firstDayOfMonthStr);
      setToDate(todayStr);
    } else if (opt === 'last_month') {
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(firstLastMonth.toISOString().split('T')[0]);
      setToDate(lastLastMonth.toISOString().split('T')[0]);
    }
  };

  // Fetch Orders & Inventory Data
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ['reportsOrdersAll'],
    queryFn: () => getOrders(1, 1000),
  });
  const allOrders: Order[] = ordersData?.data || [];

  const { data: inventorySummary = [] } = useQuery({
    queryKey: ['reportsInventorySummary', selectedBranchId],
    queryFn: () => getInventorySummary(selectedBranchId || undefined),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['reportsProducts'],
    queryFn: () => getProducts(),
  });

  // Cost Map
  const productCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    allProducts.forEach((p: Product) => {
      map[p.id] = p.basePrice || 0;
    });
    inventorySummary.forEach((item: any) => {
      if (item.product?.id) {
        map[item.product.id] = item.averageCost || item.product.basePrice || map[item.product.id] || 0;
      }
    });
    return map;
  }, [allProducts, inventorySummary]);

  // Filter orders by Date Range, Branch, and Search Term
  const filteredOrders = useMemo(() => {
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59`);

    return allOrders.filter((order) => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      if (orderDate < start || orderDate > end) return false;

      if (selectedBranchId && order.branchId && order.branchId !== selectedBranchId) {
        return false;
      }

      if (order.status === 'CANCELLED') return false;

      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchesCode = order.orderCode?.toLowerCase().includes(q);
        const matchesCustomer = order.customer?.fullName?.toLowerCase().includes(q) || order.customer?.phone?.includes(q);
        if (!matchesCode && !matchesCustomer) return false;
      }

      return true;
    });
  }, [allOrders, fromDate, toDate, selectedBranchId, searchTerm]);

  // Process Orders with Cost & Profit Calculations
  const processedOrders = useMemo(() => {
    return filteredOrders.map((order) => {
      const discount = Number(order.discount || 0);
      const totalAmount = Number(order.totalAmount || 0);
      const subTotal = order.subTotal || totalAmount + discount;

      let costTotal = 0;
      (order.items || []).forEach((item: OrderItem) => {
        const unitCost = productCostMap[item.productId] || item.product?.basePrice || 0;
        costTotal += unitCost * (item.quantity || 1);
      });

      const profit = totalAmount - costTotal;

      return {
        ...order,
        subTotal,
        discount,
        totalAmount,
        costTotal,
        profit,
      };
    });
  }, [filteredOrders, productCostMap]);

  // Group Processed Orders by Date (YYYY-MM-DD)
  const dateGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        dateStr: string;
        formattedDate: string;
        orders: typeof processedOrders;
        subTotalSum: number;
        discountSum: number;
        totalAmountSum: number;
        costTotalSum: number;
        profitSum: number;
      }
    > = {};

    processedOrders.forEach((order) => {
      const dateKey = order.createdAt.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateStr: dateKey,
          formattedDate: formatDate(dateKey),
          orders: [],
          subTotalSum: 0,
          discountSum: 0,
          totalAmountSum: 0,
          costTotalSum: 0,
          profitSum: 0,
        };
      }

      groups[dateKey].orders.push(order);
      groups[dateKey].subTotalSum += order.subTotal;
      groups[dateKey].discountSum += order.discount;
      groups[dateKey].totalAmountSum += order.totalAmount;
      groups[dateKey].costTotalSum += order.costTotal;
      groups[dateKey].profitSum += order.profit;
    });

    // Sort dates descending
    return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [processedOrders]);

  // Grand Summary Row Totals
  const grandTotalSummary = useMemo(() => {
    return dateGroups.reduce(
      (acc, g) => ({
        subTotal: acc.subTotal + g.subTotalSum,
        discount: acc.discount + g.discountSum,
        totalAmount: acc.totalAmount + g.totalAmountSum,
        costTotal: acc.costTotal + g.costTotalSum,
        profit: acc.profit + g.profitSum,
      }),
      { subTotal: 0, discount: 0, totalAmount: 0, costTotal: 0, profit: 0 }
    );
  }, [dateGroups]);

  // Toggle date row expand
  const toggleExpandDate = (dateStr: string) => {
    setExpandedDates((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  // Expand / Collapse All Dates
  const toggleExpandAll = () => {
    const allExpanded = dateGroups.every((g) => expandedDates[g.dateStr]);
    const nextState: Record<string, boolean> = {};
    dateGroups.forEach((g) => {
      nextState[g.dateStr] = !allExpanded;
    });
    setExpandedDates(nextState);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows: any[] = [];

    // Summary Header
    rows.push({
      'Thời gian': `Báo cáo lợi nhuận từ ${formatDate(fromDate)} đến ${formatDate(toDate)}`,
      'Tổng tiền hàng': grandTotalSummary.subTotal,
      'Giảm giá HĐ': -grandTotalSummary.discount,
      'Doanh thu': grandTotalSummary.totalAmount,
      'Tổng giá vốn': grandTotalSummary.costTotal,
      'Lợi nhuận gộp': grandTotalSummary.profit,
    });

    dateGroups.forEach((g) => {
      rows.push({
        'Thời gian': `[Ngày] ${g.formattedDate}`,
        'Tổng tiền hàng': g.subTotalSum,
        'Giảm giá HĐ': -g.discountSum,
        'Doanh thu': g.totalAmountSum,
        'Tổng giá vốn': g.costTotalSum,
        'Lợi nhuận gộp': g.profitSum,
      });

      g.orders.forEach((o) => {
        rows.push({
          'Thời gian': `   HĐ: ${o.orderCode} (${new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}) - KH: ${o.customer?.fullName || 'Vãng lai'}`,
          'Tổng tiền hàng': o.subTotal,
          'Giảm giá HĐ': -o.discount,
          'Doanh thu': o.totalAmount,
          'Tổng giá vốn': o.costTotal,
          'Lợi nhuận gộp': o.profit,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LoiNhuanTheoHoaDon');
    XLSX.writeFile(wb, `bao_cao_loi_nhuan_${fromDate}_den_${toDate}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
      
      {/* Left Sidebar Filter Panel */}
      <div style={{ width: '260px', backgroundColor: 'white', borderRight: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
        
        {/* Section 1: Mối quan tâm */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            Mối quan tâm
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[
              { id: 'profit_invoice', label: 'Lợi nhuận theo hóa đơn' },
              { id: 'by_date', label: 'Thời gian' },
              { id: 'discount', label: 'Giảm giá hóa đơn' },
              { id: 'by_staff', label: 'Nhân viên' },
              { id: 'inventory', label: 'Tồn kho & Giá vốn' },
            ].map((item) => {
              const active = activeInterest === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveInterest(item.id as InterestType)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#0284c7' : '#334155',
                    backgroundColor: active ? '#e0f2fe' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: active ? '#0284c7' : '#cbd5e1' }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Lọc theo chi nhánh */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
            Lọc theo chi nhánh
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
            <Building2 size={16} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentBranchName}</span>
          </div>
        </div>

        {/* Section 3: Lọc thời gian */}
        <div style={{ padding: '1rem', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            Lọc thời gian
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem' }}>
                Kỳ báo cáo
              </label>
              <select
                value={timeFilterOption}
                onChange={(e) => handleTimeOptionChange(e.target.value as TimeFilterOption)}
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white' }}
              >
                <option value="this_month">Tháng này</option>
                <option value="today">Hôm nay</option>
                <option value="this_week">Tuần này</option>
                <option value="last_month">Tháng trước</option>
                <option value="custom">Lựa chọn khác</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem' }}>
                Từ ngày
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setTimeFilterOption('custom');
                }}
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem' }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setTimeFilterOption('custom');
                }}
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
              * Chọn mốc thời gian để hệ thống tổng hợp Doanh thu & Giá vốn theo hóa đơn.
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
        
        {/* Title Header & Actions */}
        <div style={{ backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
              Báo cáo lợi nhuận theo hóa đơn
            </h1>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>Từ ngày <strong>{formatDate(fromDate)}</strong> đến ngày <strong>{formatDate(toDate)}</strong></span>
              <span>•</span>
              <span>Chi nhánh: <strong>{currentBranchName}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm mã HĐ, khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.75rem 0.4rem 2rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            <button
              onClick={toggleExpandAll}
              style={{ padding: '0.4rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            >
              Thu / Mở tất cả
            </button>

            <button
              onClick={handleExportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <FileDown size={15} /> Xuất Excel
            </button>
          </div>
        </div>

        {/* Main Report Data Table */}
        <div style={{ flex: 1, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              
              {/* Header */}
              <thead style={{ backgroundColor: '#0284c7', color: 'white', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.85rem', width: '260px' }}>Thời gian</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>Tổng tiền hàng</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>Giảm giá HĐ</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>Doanh thu</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>Tổng giá vốn</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>Lợi nhuận gộp</th>
                </tr>
              </thead>

              <tbody>
                {/* Yellow Highlighted Summary Row for Selected Range */}
                <tr style={{ backgroundColor: '#fef9c3', borderBottom: '2px solid #fde047', fontWeight: '700' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#1e293b', fontSize: '0.9rem' }}>
                    TỔNG CỘNG ({dateGroups.length} ngày)
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#1e293b', fontSize: '0.9rem' }}>
                    {grandTotalSummary.subTotal.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#dc2626', fontSize: '0.9rem' }}>
                    {-grandTotalSummary.discount !== 0 ? (-grandTotalSummary.discount).toLocaleString('vi-VN') : '0'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#1e293b', fontSize: '0.9rem' }}>
                    {grandTotalSummary.totalAmount.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#b45309', fontSize: '0.9rem' }}>
                    {grandTotalSummary.costTotal.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: grandTotalSummary.profit >= 0 ? '#047857' : '#dc2626', fontSize: '0.95rem' }}>
                    {grandTotalSummary.profit.toLocaleString('vi-VN')}
                  </td>
                </tr>

                {/* Empty State */}
                {loadingOrders ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      Đang tải và tổng hợp báo cáo...
                    </td>
                  </tr>
                ) : dateGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      Không có hóa đơn bán hàng nào phát sinh trong khoảng thời gian này
                    </td>
                  </tr>
                ) : (
                  dateGroups.map((group) => {
                    const isExpanded = !!expandedDates[group.dateStr];
                    return (
                      <React.Fragment key={group.dateStr}>
                        {/* Parent Date Row */}
                        <tr
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: isExpanded ? '#eff6ff' : '#ffffff',
                            fontWeight: '600',
                          }}
                        >
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <div
                              onClick={() => toggleExpandDate(group.dateStr)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#0369a1', fontSize: '0.85rem' }}
                            >
                              <span style={{ fontSize: '0.9rem', width: '16px', textAlign: 'center', fontWeight: 'bold' }}>
                                {isExpanded ? '−' : '+'}
                              </span>
                              <span>{group.formattedDate}</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                ({group.orders.length} HĐ)
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#334155' }}>
                            {group.subTotalSum.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#dc2626' }}>
                            {-group.discountSum !== 0 ? (-group.discountSum).toLocaleString('vi-VN') : '0'}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                            {group.totalAmountSum.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#b45309' }}>
                            {group.costTotalSum.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: group.profitSum >= 0 ? '#047857' : '#dc2626' }}>
                            {group.profitSum.toLocaleString('vi-VN')}
                          </td>
                        </tr>

                        {/* Expanded Child Sub-table */}
                        {isExpanded &&
                          group.orders.map((o) => (
                            <tr
                              key={o.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: '#f8fafc',
                                fontSize: '0.8rem',
                              }}
                            >
                              <td style={{ padding: '0.5rem 1rem 0.5rem 2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span
                                    onClick={() => setSelectedOrder(o)}
                                    style={{ fontWeight: '700', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                    title="Click xem chi tiết đơn hàng"
                                  >
                                    {o.orderCode}
                                  </span>
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                    ({new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                                  </span>
                                  <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>
                                    {o.customer?.fullName || 'Khách vãng lai'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#64748b' }}>
                                {o.subTotal.toLocaleString('vi-VN')}
                              </td>
                              <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#dc2626' }}>
                                {-o.discount !== 0 ? (-o.discount).toLocaleString('vi-VN') : '0'}
                              </td>
                              <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#1e293b', fontWeight: '600' }}>
                                {o.totalAmount.toLocaleString('vi-VN')}
                              </td>
                              <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#d97706' }}>
                                {o.costTotal.toLocaleString('vi-VN')}
                              </td>
                              <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '700', color: o.profit >= 0 ? '#059669' : '#dc2626' }}>
                                {o.profit.toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Detail Breakdown Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            {/* Header */}
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Chi tiết hóa đơn bán hàng — {selectedOrder.orderCode}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Thời gian: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')} | Chi nhánh: {currentBranchName}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Order Meta Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>KHÁCH HÀNG</span>
                  <strong style={{ color: '#1e293b' }}>{selectedOrder.customer?.fullName || 'Khách vãng lai'}</strong>
                  {selectedOrder.customer?.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedOrder.customer.phone}</div>}
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>HÌNH THỨC THANH TOÁN</span>
                  <strong style={{ color: '#0284c7' }}>
                    {selectedOrder.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : selectedOrder.paymentMethod === 'CARD' ? 'Quẹt thẻ' : 'Tiền mặt'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>NGƯỜI BÁN</span>
                  <strong style={{ color: '#334155' }}>{selectedOrder.createdBy?.fullName || '--'}</strong>
                </div>
              </div>

              {/* Items Detail Table */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Danh sách sản phẩm trong hóa đơn:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
                  <thead style={{ backgroundColor: '#0284c7', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700 }}>STT</th>
                      <th style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700 }}>Mặt hàng</th>
                      <th style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>Giá bán (₫)</th>
                      <th style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>Giá vốn (₫)</th>
                      <th style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}>Lợi nhuận (₫)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, idx) => {
                      const qty = item.quantity || 1;
                      const sellTotal = (item.unitPrice || 0) * qty;
                      const unitCost = productCostMap[item.productId] || item.product?.basePrice || 0;
                      const costTotal = unitCost * qty;
                      const profit = sellTotal - costTotal;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                            {item.product?.name || 'Sản phẩm ID: ' + item.productId}
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>{sellTotal.toLocaleString('vi-VN')}</td>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', textAlign: 'right', color: '#b45309' }}>{costTotal.toLocaleString('vi-VN')}</td>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700, color: profit >= 0 ? '#059669' : '#dc2626' }}>
                            {profit.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Order Financial Summary Box */}
              <div style={{ backgroundColor: '#fef9c3', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #fde047', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Tổng tiền hàng:</span>
                  <span>{(selectedOrder.subTotal || (selectedOrder.totalAmount + (selectedOrder.discount || 0))).toLocaleString('vi-VN')} ₫</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#dc2626' }}>
                    <span>Giảm giá HĐ:</span>
                    <span>-{(selectedOrder.discount).toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                  <span>Doanh thu thực tế:</span>
                  <span>{(selectedOrder.totalAmount || 0).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#b45309' }}>
                  <span>Tổng giá vốn:</span>
                  <span>
                    {(selectedOrder.items || [])
                      .reduce((s, item) => s + (productCostMap[item.productId] || item.product?.basePrice || 0) * (item.quantity || 1), 0)
                      .toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#047857', borderTop: '1px solid #facc15', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                  <span>LỢI NHUẬN GỘP HÓA ĐƠN:</span>
                  <span>
                    {(
                      Number(selectedOrder.totalAmount || 0) -
                      (selectedOrder.items || []).reduce(
                        (s, item) => s + (productCostMap[item.productId] || item.product?.basePrice || 0) * (item.quantity || 1),
                        0
                      )
                    ).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedOrder(null)} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportsPage;
