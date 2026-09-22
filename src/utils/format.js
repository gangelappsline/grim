// ============================================================
// Formateo de moneda
// ============================================================

/**
 * Formato compacto: $1.2M, $500K, $1,234
 * Usado en Dashboard (EB) y Reportes (jX)
 */
export function formatCurrencyCompact(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toLocaleString('es');
}

/**
 * Formato completo: $1,234.56
 * Usado en LoanDetail (wX) y PDF (vX)
 */
export function formatCurrency(value) {
  const n = Number(value);
  if (value == null || isNaN(n)) return '$0.00';
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Formato sin decimales: $1,234
 * Usado en ClientDetail (QX)
 */
export function formatCurrencyRound(value) {
  const n = Number(value);
  if (value == null || isNaN(n)) return '$0';
  return (
    '$' +
    n.toLocaleString('es', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

// ============================================================
// Formateo de fechas
// ============================================================

const pad = (n) => String(n).padStart(2, '0');

/**
 * YYYY-MM-DD a partir de un Date
 * Usado en filtros por defecto
 */
export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * "05 ene 2026" — formato corto
 * Usado en Loans, ClientDetail (TX, $X, MX)
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * "05/01/2026" — formato numérico
 * Usado en PDF (vX)
 */
export function formatDateNumeric(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Saludo según la hora del día
 * Usado en Dashboard (TB)
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// ============================================================
// Iniciales / avatares
// ============================================================

/**
 * Iniciales del nombre para avatar: "Juan Pérez" -> "JP"
 * Usado en Clients (VB) y ClientDetail (eZ)
 */
export function getInitials(name, lastName) {
  return [name?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase();
}

// ============================================================
// Labels de dominio (frecuencia, estado)
// ============================================================

/** Frecuencia de pago (en Loans y LoanDetail) */
export const FREQUENCY_LABELS = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

/** Estado del préstamo — versión Loans (JB) */
export const LOAN_STATUS_BADGES = {
  active: { label: 'Activo', cls: 'bg-emerald-900/40 text-emerald-400' },
  paid: { label: 'Pagado', cls: 'bg-blue-900/40 text-blue-400' },
  overdue: { label: 'Vencido', cls: 'bg-red-900/40 text-red-400' },
  cancelled: { label: 'Cancelado', cls: 'bg-[#1a1f2c] text-[#4a4e5a]' },
};

/** Estado del préstamo — versión ClientDetail (XX) */
export const LOAN_STATUS_BADGES_ALT = {
  active: { label: 'Activo', cls: 'bg-emerald-900/40 text-emerald-400' },
  paid: { label: 'Pagado', cls: 'bg-blue-900/40 text-blue-400' },
  overdue: { label: 'Vencido', cls: 'bg-red-900/40 text-red-400' },
  defaulted: { label: 'En mora', cls: 'bg-orange-900/40 text-orange-400' },
  cancelled: { label: 'Cancelado', cls: 'bg-[#1a1f2c] text-[#4a4e5a]' },
};

/** Estado del cliente */
export const CLIENT_STATUS_BADGES = {
  active: { label: 'Activo', cls: 'bg-emerald-900/40 text-emerald-400' },
  inactive: { label: 'Inactivo', cls: 'bg-[#1a1f2c] text-[#4a4e5a]' },
};

/** Estado de cuota — solo color de texto (CX) */
export const SCHEDULE_STATUS_TEXT = {
  pending: { label: 'Pendiente', cls: 'text-[#ada692]' },
  paid: { label: 'Pagado', cls: 'text-emerald-400' },
  overdue: { label: 'Vencido', cls: 'text-red-400' },
};

/** Estado de cuota — solo label, para PDF (gX) */
export const SCHEDULE_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
};

/** Estado del préstamo — solo label, para PDF (hX) */
export const LOAN_STATUS_LABELS = {
  active: 'Activo',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

// ============================================================
// Filtros de UI
// ============================================================

/** Filtros de estado de préstamo (pantalla Loans) */
export const LOAN_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'paid', label: 'Pagados' },
];

/** Filtros de estado de cliente */
export const CLIENT_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

/** Filtros de calendario (estado de cuota) */
export const SCHEDULE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
];

/** Filtros de periodo del calendario */
export const PERIOD_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

/** Filtros del selector de frecuencia (modal Nuevo Préstamo) */
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

/** Estados para editar préstamo */
export const LOAN_STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];

// ============================================================
// Clases reutilizables
// ============================================================

/** Input estándar de formularios */
export const INPUT_CLASS =
  'w-full rounded-lg bg-[#171c26] px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#d4b13c]/50';

/** Input estándar con color de calendario invertido (Calendar) */
export const INPUT_CLASS_DATE =
  'w-full rounded-lg bg-[#171c26] px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#d4b13c]/50 [&::-webkit-calendar-picker-indicator]:invert';