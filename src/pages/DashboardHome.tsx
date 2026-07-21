import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp, ShoppingCart, DollarSign, Activity, Users,
  AlertTriangle, Calendar, Dog, ArrowUpRight, ArrowDownRight,
  Package, RefreshCw, ChevronRight
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { getDashboardStatistics } from "../api/dashboard";
import type { DashboardStatisticsResponse } from "../api/dashboard";
import { useBranchContext } from "../context/BranchContext";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const GRADIENTS: Record<string, [string, string]> = {
  revenue:  ["#6366f1", "#8b5cf6"],
  cost:     ["#ef4444", "#f97316"],
  profit:   ["#10b981", "#34d399"],
  orders:   ["#f59e0b", "#fbbf24"],
  customers:["#8b5cf6", "#a78bfa"],
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatShort = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

const useCounter = (target: number, duration = 900) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
};

interface StatCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  icon: React.ReactNode;
  gradient: [string, string];
  trend?: number;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, isCurrency, icon, gradient, trend, delay = 0 }) => {
  const counted = useCounter(value, 900);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem",
      padding: "1.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      display: "flex", flexDirection: "column", gap: "1rem",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-20px", right: "-20px",
        width: "100px", height: "100px", borderRadius: "50%",
        background: `radial-gradient(circle, ${gradient[0]}22, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          padding: "0.75rem", borderRadius: "0.75rem", color: "white",
          boxShadow: `0 4px 12px ${gradient[0]}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
        {trend !== undefined && (
          <span style={{
            display: "flex", alignItems: "center", gap: "0.2rem",
            fontSize: "0.75rem", fontWeight: "600",
            color: trend >= 0 ? "#10b981" : "#ef4444",
            background: trend >= 0 ? "#10b98115" : "#ef444415",
            padding: "0.25rem 0.6rem", borderRadius: "2rem",
          }}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "500", marginBottom: "0.3rem", letterSpacing: "0.02em" }}>
          {label}
        </p>
        <p style={{
          fontSize: "1.4rem", fontWeight: "800", lineHeight: 1.2,
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {isCurrency ? formatCurrency(counted) : counted.toLocaleString("vi-VN")}
        </p>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const date = new Date(label as string);
  return (
    <div style={{
      background: "white", border: "1px solid #e2e8f0", borderRadius: "0.75rem",
      padding: "0.875rem 1rem", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", minWidth: "180px",
    }}>
      <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem", fontWeight: "600" }}>
        {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.2rem" }}>
          <span style={{ fontSize: "0.8rem", color: entry.color, fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: entry.color, display: "inline-block" }} />
            {entry.name}
          </span>
          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#1e293b" }}>{formatShort(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; iconColor: string; subtitle?: string }> = ({ icon, title, iconColor, subtitle }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
    <div style={{ background: `${iconColor}18`, color: iconColor, padding: "0.5rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {icon}
    </div>
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--foreground)", margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>{subtitle}</p>}
    </div>
  </div>
);

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: "11px", fontWeight: "700" }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.5rem", color: "#94a3b8" }}>
      <Package size={32} strokeWidth={1.5} />
      <p style={{ fontSize: "0.875rem" }}>{message || t("dashboard.empty_state")}</p>
    </div>
  );
};

const Skeleton: React.FC<{ width?: string; height?: string; style?: React.CSSProperties }> = ({ width = "100%", height = "1rem", style }) => (
  <div style={{
    width, height, borderRadius: "0.5rem",
    background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", ...style,
  }} />
);

const DashboardHome: React.FC = () => {
  const { t } = useTranslation();
  const { selectedBranchId } = useBranchContext();
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [endDate,   setEndDate]   = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().split("T")[0]; });
  const [data,      setData]      = useState<DashboardStatisticsResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [topProductSearch, setTopProductSearch] = useState('');

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try { const result = await getDashboardStatistics(startDate, endDate, selectedBranchId); setData(result); }
    catch (err) { console.error("Dashboard fetch error:", err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, selectedBranchId]);

  const quickRanges = [
    { label: t("dashboard.range_week"), getRange: () => { const now = new Date(); const s = new Date(now); s.setDate(now.getDate() - now.getDay() + 1); return [s.toISOString().split("T")[0], now.toISOString().split("T")[0]]; } },
    { label: t("dashboard.range_month"), getRange: () => { const now = new Date(); const s = new Date(now.getFullYear(), now.getMonth(), 1); const e = new Date(now.getFullYear(), now.getMonth() + 1, 0); return [s.toISOString().split("T")[0], e.toISOString().split("T")[0]]; } },
    { label: t("dashboard.range_quarter"),   getRange: () => { const now = new Date(); const q = Math.floor(now.getMonth() / 3); const s = new Date(now.getFullYear(), q*3, 1); const e = new Date(now.getFullYear(), q*3+3, 0); return [s.toISOString().split("T")[0], e.toISOString().split("T")[0]]; } },
  ];

  const stats = data ? [
    { label: t("dashboard.revenue"),  value: data.totals.revenue,   isCurrency: true,  icon: <TrendingUp size={20} />,  gradient: GRADIENTS.revenue,   trend: 12 },
    { label: t("dashboard.cost"),    value: data.totals.cost,      isCurrency: true,  icon: <ShoppingCart size={20} />,gradient: GRADIENTS.cost,      trend: -3 },
    { label: t("dashboard.profit"),  value: data.totals.profit,    isCurrency: true,  icon: <DollarSign size={20} />,  gradient: GRADIENTS.profit,    trend: 18 },
    { label: t("dashboard.total_orders"),   value: data.totals.orders,    isCurrency: false, icon: <Activity size={20} />,    gradient: GRADIENTS.orders },
    { label: t("dashboard.customers"), value: data.totals.customers, isCurrency: false, icon: <Users size={20} />,       gradient: GRADIENTS.customers },
  ] : [];

  const filteredTopProducts = data?.topProducts?.filter((p) =>
    p.name.toLowerCase().includes(topProductSearch.toLowerCase())
  ) ?? [];

  return (
    <div style={{ fontFamily: "\"Inter\", system-ui, sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .dash-input { transition: box-shadow 0.2s, border-color 0.2s; }
        .dash-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
        .dash-refresh:hover { background: rgba(99,102,241,0.12) !important; }
        .dash-qbtn:hover { opacity: 0.85; transform: translateY(-1px); }
        .dash-row:hover { background: #f8fafc !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: "1.75rem", animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "0.2rem" }}>
              {t("dashboard.title")}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{t("dashboard.subtitle")}</p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            {quickRanges.map(({ label, getRange }) => {
              const [rs, re] = getRange();
              const active = startDate === rs && endDate === re;
              return (
                <button key={label} className="dash-qbtn" onClick={() => { setStartDate(rs); setEndDate(re); }} style={{
                  padding: "0.45rem 0.9rem", borderRadius: "2rem", fontSize: "0.8rem", fontWeight: "600",
                  border: active ? "none" : "1px solid var(--border)",
                  background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--card)",
                  color: active ? "white" : "#64748b", cursor: "pointer", transition: "all 0.2s",
                  boxShadow: active ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                }}>{label}</button>
              );
            })}

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "0.35rem 0.75rem" }}>
              <input type="date" className="dash-input" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.8rem", background: "var(--background)", color: "var(--foreground)", cursor: "pointer" }} />
              <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>→</span>
              <input type="date" className="dash-input" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.8rem", background: "var(--background)", color: "var(--foreground)", cursor: "pointer" }} />
            </div>

            <button className="dash-refresh" onClick={() => fetchData(true)} title={t("dashboard.refresh_tooltip")} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0.5rem", borderRadius: "0.5rem", background: "var(--card)",
              border: "1px solid var(--border)", cursor: "pointer", color: "#6366f1", transition: "all 0.2s",
            }}>
              <RefreshCw size={16} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Skeleton width="48px" height="48px" style={{ borderRadius: "0.75rem" }} />
                <Skeleton width="60%" />
                <Skeleton width="80%" height="1.5rem" />
              </div>
            ))
          : stats.map((s, i) => <StatCard key={s.label} {...s} gradient={s.gradient as [string,string]} delay={i * 80} />)
        }
      </div>

      {/* ── Line Chart ── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animation: "fadeUp 0.5s ease 0.15s both" }}>
        <SectionHeader icon={<TrendingUp size={18} />} title={t("dashboard.chart_title")} iconColor="#6366f1" subtitle={t("dashboard.chart_subtitle")} />
        <div style={{ height: "300px" }}>
          {loading
            ? <Skeleton height="100%" style={{ borderRadius: "0.75rem" }} />
            : data && data.chartData.length > 0
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }}
                      stroke="#cbd5e1" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => formatShort(Number(v))}
                      stroke="#cbd5e1" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: "600" }}>{v}</span>} />
                    <Line type="monotone" name={t("dashboard.chart_revenue")} dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" name={t("dashboard.chart_cost")}   dataKey="cost"    stroke="#ef4444" strokeWidth={2}   dot={false} activeDot={{ r: 4, strokeWidth: 0 }} strokeDasharray="5 3" />
                    <Line type="monotone" name={t("dashboard.chart_profit")} dataKey="profit"  stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState message={t("dashboard.empty_chart_data")} />
          }
        </div>
      </div>

      {/* ── Pie Chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { key: "appointments", title: t("dashboard.appointments_title", { total: data?.appointments?.total ?? 0 }),   icon: <Calendar size={16} />, color: "#6366f1", chartData: data?.appointments?.data },
        ].map(({ key, title, icon, color, chartData }, delay) => (
          <div key={key} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animation: `fadeUp 0.5s ease ${0.2 + delay * 0.07}s both` }}>
            <SectionHeader icon={icon} title={title} iconColor={color} />
            <div style={{ height: "200px" }}>
              {loading ? <Skeleton height="100%" style={{ borderRadius: "0.75rem" }} /> :
               chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" labelLine={false} label={renderCustomLabel}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.8rem" }} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tables ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
        {/* Top Products */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animation: "fadeUp 0.5s ease 0.4s both" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ flex: "1 1 100%", minWidth: 0 }}>
              <SectionHeader icon={<TrendingUp size={16} />} title={t("dashboard.top_products_title")} iconColor="#10b981" subtitle={t("dashboard.top_products_subtitle")} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", width: "100%", maxWidth: "420px" }}>
              <input
                type="text"
                value={topProductSearch}
                onChange={(e) => setTopProductSearch(e.target.value)}
                placeholder={t("dashboard.search_products_placeholder")}
                className="dash-input"
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
              <span style={{ color: "#64748b", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                {t("dashboard.top_products_count", { count: filteredTopProducts.length })}
              </span>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="36px" style={{ borderRadius: "0.5rem" }} />)}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[t("dashboard.table_no"), t("dashboard.table_product"), t("dashboard.table_qty"), t("dashboard.table_revenue")].map((h, i) => (
                    <th key={h} style={{ padding: "0.75rem 1.25rem", textAlign: i === 2 ? "center" : i === 3 ? "right" : "left", fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTopProducts.length ? filteredTopProducts.map((p, idx) => (
                  <tr key={idx} className="dash-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.875rem 1.25rem" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: "22px", height: "22px", borderRadius: "50%", fontSize: "0.7rem", fontWeight: "700",
                        background: idx === 0 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : idx === 1 ? "linear-gradient(135deg,#94a3b8,#cbd5e1)" : idx === 2 ? "linear-gradient(135deg,#cd7c4f,#e8a87c)" : "#f1f5f9",
                        color: idx < 3 ? "white" : "#64748b",
                      }}>{idx + 1}</span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontSize: "0.875rem", fontWeight: "500", color: "var(--foreground)" }}>{p.name}</td>
                    <td style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
                      <span style={{ background: "#f1f5f9", borderRadius: "1rem", padding: "0.2rem 0.6rem", fontSize: "0.8rem", fontWeight: "600", color: "#475569" }}>{p.sold}</span>
                    </td>
                    <td style={{ padding: "0.875rem 1.25rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "700", color: "#6366f1" }}>{formatShort(p.revenue)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                    {topProductSearch ? t("dashboard.no_matching_products") : t("dashboard.empty_sales")}
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", animation: "fadeUp 0.5s ease 0.48s both" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionHeader icon={<AlertTriangle size={16} />} title={t("dashboard.low_stock_title")} iconColor="#ef4444" />
            {(data?.lowStock?.length ?? 0) > 0 && (
              <span style={{ background: "#fef2f2", color: "#ef4444", fontSize: "0.72rem", fontWeight: "700", padding: "0.2rem 0.5rem", borderRadius: "1rem" }}>
                {t("dashboard.low_stock_badge", { count: data!.lowStock.length })}
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="36px" style={{ borderRadius: "0.5rem" }} />)}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[t("dashboard.table_product"), t("dashboard.table_remaining"), t("dashboard.table_status")].map((h, i) => (
                    <th key={h} style={{ padding: "0.75rem 1.25rem", textAlign: i === 1 ? "right" : i === 2 ? "center" : "left", fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.lowStock?.length ? data.lowStock.map((l, idx) => (
                  <tr key={idx} className="dash-row" style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.875rem", fontWeight: "500", color: "var(--foreground)" }}>{l.name}</td>
                    <td style={{ padding: "0.875rem 1rem", textAlign: "right", fontWeight: "800", fontSize: "1rem", color: l.remaining === 0 ? "#ef4444" : "#f59e0b" }}>{l.remaining}</td>
                    <td style={{ padding: "0.875rem 1.25rem", textAlign: "center" }}>
                      <span style={{
                        padding: "0.25rem 0.65rem", borderRadius: "1rem", fontSize: "0.72rem", fontWeight: "700",
                        background: l.remaining === 0 ? "#fef2f2" : "#fffbeb",
                        color: l.remaining === 0 ? "#ef4444" : "#d97706",
                        border: `1px solid ${l.remaining === 0 ? "#fecaca" : "#fde68a"}`,
                      }}>
                        {l.remaining === 0 ? t("dashboard.status_out") : t("dashboard.status_low")}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} style={{ padding: "3rem", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ background: "#d1fae5", borderRadius: "50%", padding: "0.75rem", display: "inline-flex", color: "#10b981" }}>
                          <Package size={24} />
                        </div>
                        <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "#10b981", margin: 0 }}>{t("dashboard.stock_safe_title")}</p>
                        <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>{t("dashboard.stock_safe_desc")}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
