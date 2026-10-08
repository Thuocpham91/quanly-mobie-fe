/**
 * Tiện ích lưu trữ Offline / Cache Local cho Form Kỹ Thuật (Lịch trình giao/làm việc) và QR Code
 */

export interface CachedFormData {
  formId: string;
  orderCode: string;
  orderType: 'Dịch Vụ' | 'Bán Hàng' | 'Bảo Hành';
  appointmentDate: string;
  appointmentTime: string;
  deadline: string;
  customerName: string;
  customerPhone: string;
  address: string;
  customerLocation: string;
  jobDescription: string;
  completedItems: string;
  quotedAmount: number;
  discount: number;
  paidAmount: number;
  costPrice: number;
  workStatus: string;
  failReason: string;
  warrantyTime: string;
  customerSource: string;
  csStaff: string;
  assignee: string;
  priority: string;
  selectedCustomerId?: string;
  createdAt: string;
  synced?: boolean;
}

const OFFLINE_QUEUE_KEY = 'offline_pos_orders_queue_v1';
const DRAFT_FORM_KEY = 'pos_current_form_draft_v1';
const OFFLINE_QR_CONFIG_KEY = 'offline_qr_config_cache_v1';

// --- 1. QUẢN LÝ DRAFT FORM ĐANG NHẬP TỰ ĐỘNG ---
export const saveFormDraft = (data: Partial<CachedFormData>) => {
  try {
    localStorage.setItem(DRAFT_FORM_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Không thể lưu draft vào local:', err);
  }
};

export const getFormDraft = (): Partial<CachedFormData> | null => {
  try {
    const raw = localStorage.getItem(DRAFT_FORM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearFormDraft = () => {
  try {
    localStorage.removeItem(DRAFT_FORM_KEY);
  } catch (err) {
    console.error('Không thể xóa draft:', err);
  }
};

// --- 2. QUẢN LÝ HÀNG ĐỢI LƯU KHI MẤT MẠNG (OFFLINE QUEUE) ---
export const getOfflinePendingOrders = (): CachedFormData[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineOrder = (order: CachedFormData): void => {
  try {
    const current = getOfflinePendingOrders();
    const idx = current.findIndex(x => x.formId === order.formId);
    if (idx >= 0) {
      current[idx] = { ...order, synced: false };
    } else {
      current.unshift({ ...order, synced: false });
    }
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Lỗi lưu đơn hàng offline vào local:', err);
  }
};

export const removeOfflineOrder = (formId: string): void => {
  try {
    const current = getOfflinePendingOrders().filter(x => x.formId !== formId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Lỗi khi xóa đơn hàng offline khỏi local:', err);
  }
};

export const markOfflineOrderSynced = (formId: string): void => {
  removeOfflineOrder(formId);
};

// --- 3. QUẢN LÝ CACHE QR CODE DÙNG KHI MẤT MẠNG ---
export interface LocalQRInfo {
  bank: string;
  account: string;
  accountName: string;
  memo: string;
  cachedDataUrl?: string;
}

export const getLocalQRCache = (): LocalQRInfo => {
  const bank = localStorage.getItem('qr_bank') || 'MB';
  const account = localStorage.getItem('qr_account') || '';
  const accountName = localStorage.getItem('qr_name') || '';
  const memo = localStorage.getItem('qr_memo') || 'MobiStore Thanh Toan';

  let cachedDataUrl = '';
  try {
    const raw = localStorage.getItem(OFFLINE_QR_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.cachedDataUrl) cachedDataUrl = parsed.cachedDataUrl;
    }
  } catch {
    // ignore
  }

  return { bank, account, accountName, memo, cachedDataUrl };
};

export const cacheQRBase64 = async (bank: string, account: string, accountName: string, memo: string) => {
  if (!account || !accountName) return;
  const qrUrl = `https://img.vietqr.io/image/${bank}-${account.trim()}-compact2.png?amount=0&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName.trim().toUpperCase())}`;
  try {
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      localStorage.setItem(
        OFFLINE_QR_CONFIG_KEY,
        JSON.stringify({ bank, account, accountName, memo, cachedDataUrl: base64 })
      );
    };
    reader.readAsDataURL(blob);
  } catch {
    // ignore offline or cors fetch fail
  }
};
