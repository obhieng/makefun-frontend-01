export function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat('en-US').format(amount) : '—';
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const dateValue = new Date(value);
  if (!Number.isFinite(dateValue.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC', ...options }).format(dateValue);
}

export function timeLeft(value) {
  const remaining = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remaining)) return 'No deadline';
  if (remaining <= 0) return 'Ended';
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return days ? `${days}d ${hours}h left` : hours ? `${hours}h ${minutes}m left` : `${Math.max(1, minutes)}m left`;
}

export function isAccepting(deadline) {
  const timestamp = new Date(deadline).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

export function displayText(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number <= 1 ? number * 100 : number)}%`;
}
