/**
 * Mapping route path → permission cần có
 * Phải khớp với menu trong DashboardLayout
 */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/admin':                       'dashboard.view',
  '/admin/customers':             'customers.view',
  '/admin/appointments':          'appointments.view',
  '/admin/pos':                   'sales.create',
  '/admin/sales':                 'sales.create',
  '/admin/orders':                'sales.create',
  '/admin/products':              'products.view',
  '/admin/product-prices':        'products.create_edit',
  '/admin/inventory':             'inventory.import',
  '/admin/inventory/import':      'inventory.import',
  '/admin/inventory/transfer':    'inventory.import',
  '/admin/inventory/history':     'inventory.import',
  '/admin/inventory/stocktakes':  'inventory.import',
  '/admin/distributors':          'inventory.import',
  '/admin/users':                 'users.view',
  '/admin/roles':                 'users.manage',
  '/admin/branches':              'branches.manage',
  '/admin/settings':              'settings.view',
};

/** Thứ tự ưu tiên tìm "màn làm việc" khi redirect */
export const ROUTE_PRIORITY = [
  '/admin',
  '/admin/pos',
  '/admin/sales',
  '/admin/orders',
  '/admin/customers',
  '/admin/appointments',
  '/admin/products',
  '/admin/inventory',
  '/admin/distributors',
  '/admin/product-prices',
  '/admin/inventory/transfer',
  '/admin/inventory/history',
  '/admin/inventory/stocktakes',
  '/admin/users',
  '/admin/roles',
  '/admin/branches',
  '/admin/settings',
];

/**
 * Lấy danh sách permissions từ localStorage
 */
export function getUserPermissions(selectedBranchId?: string): string[] {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return [];
    const user = JSON.parse(raw);
    if (user?.email?.toLowerCase() === 'admin@gmail.com') return ['*'];

    const userBranchRoles: any[] = user?.userBranchRoles || [];
    const relevantRoles = selectedBranchId
      ? userBranchRoles.filter((ubr: any) => ubr.branchId === selectedBranchId)
      : userBranchRoles;

    const perms = new Set<string>();
    relevantRoles.forEach((ubr: any) => {
      if (ubr.role?.name === 'Admin') { perms.add('*'); return; }
      (ubr.role?.permissions || []).forEach((p: any) => perms.add(p.name));
    });
    return [...perms];
  } catch {
    return [];
  }
}

export function canAccessRoute(path: string, selectedBranchId?: string): boolean {
  const perms = getUserPermissions(selectedBranchId);
  if (perms.includes('*')) return true;
  const required = ROUTE_PERMISSION_MAP[path];
  if (!required) return true;
  return perms.includes(required);
}

export function getWorkScreen(selectedBranchId?: string): string {
  const perms = getUserPermissions(selectedBranchId);
  if (perms.includes('*')) return '/admin';
  for (const route of ROUTE_PRIORITY) {
    const required = ROUTE_PERMISSION_MAP[route];
    if (!required || perms.includes(required)) return route;
  }
  return '/login';
}
