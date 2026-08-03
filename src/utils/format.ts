/**
 * Formats a number with thousand separators.
 * Example: 1000000 -> "1.000.000"
 */
export const formatNumber = (value: number | string): string => {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Parses a formatted string back to a number.
 * Example: "1.000.000" -> 1000000
 */
export const parseNumber = (value: string): number => {
  if (!value) return 0;
  const cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats a date string or Date object to DD/MM/YYYY.
 */
export const formatDate = (dateValue?: string | Date | null): string => {
  if (!dateValue) return '--';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('vi-VN');
};
