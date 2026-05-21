import api from './client';

export interface DashboardTotals {
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
  customers: number;
}

export interface DashboardChartData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface DashboardStatisticsResponse {
  totals: DashboardTotals;
  chartData: DashboardChartData[];
  pets: {
    total: number;
    data: { name: string; value: number }[];
  };
  appointments: {
    total: number;
    data: { name: string; value: number }[];
  };
  cages: {
    total: number;
    data: { name: string; value: number }[];
  };
  topProducts: { name: string; sold: number; revenue: number }[];
  lowStock: { name: string; remaining: number }[];
}

export const getDashboardStatistics = async (
  startDate: string,
  endDate: string,
  branchId?: string,
): Promise<DashboardStatisticsResponse> => {
  const params: any = { startDate, endDate };
  if (branchId) {
    params.branchId = branchId;
  }
  const response = await api.get('/dashboard/statistics', { params });
  return response.data;
};
