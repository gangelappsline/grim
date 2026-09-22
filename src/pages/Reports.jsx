import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getReportLoans,
  getReportOverdue,
  getReportPayments,
  getReportSummary,
} from '../api/reports';
import {
  formatCurrencyCompact,
  formatDateShort,
  INPUT_CLASS_DATE as INPUT_CLASS,
  toISODate,
} from '../utils/format';
import { exportToCsv } from '../utils/csv';

// ============================================================
// Constantes
// ============================================================

const TABS = [
  { value: 'summary', label: 'Resumen' },
  { value: 'loans', label: 'Prestamos' },
  { value: 'payments', label: 'Pagos' },
  { value: 'overdue', label: 'Mora' },
  { value: 'export', label: 'Exportar' },
];

const TODAY = toISODate();

const FIRST_OF_MONTH = (() => {
  const d = new Date();
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
})();

// ============================================================
// KPI card (RX)
// ============================================================
function KpiBox({ label, value, sub, red }) {
  return (
    <div className="rounded-xl bg-[#0e1218] p-3.5">
      <p className="text-[10px] text-[#ada692]">{label}</p>
      <p
        className={`mt-0.5 text-xl font-bold ${
          red ? 'text-red-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#4a4e5a]">{sub}</p>}
    </div>
  );
}

// ============================================================
// Tab resumen (zX)
// ============================================================
function SummaryTab({ data }) {
  const recoveryRate =
    data.loans.total_to_collect > 0
      ? (data.loans.total_collected / data.loans.total_to_collect) * 100
      : 0;

  return (
    <div className="space-y-3">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        <KpiBox
          label="Clientes totales"
          value={String(data.clients.total)}
          sub={`${data.clients.active} activos`}
        />
        <KpiBox
          label="Prestamos activos"
          value={String(data.loans.active)}
          sub={`${data.loans.total} totales`}
        />
        <KpiBox
          label="Capital prestado"
          value={formatCurrencyCompact(data.loans.total_disbursed)}
        />
        <KpiBox
          label="Recuperado"
          value={formatCurrencyCompact(data.loans.total_collected)}
        />
        <KpiBox
          label="Pendiente"
          value={formatCurrencyCompact(data.loans.total_pending)}
        />
        <KpiBox
          label="En mora"
          value={formatCurrencyCompact(data.overdue.total_amount)}
          red
        />
      </div>

      {/* Tasa de recuperación */}
      <div className="rounded-xl bg-[#0e1218] p-4">
        <p className="mb-1 text-xs text-[#ada692]">Tasa de recuperacion</p>
        <p className="text-2xl font-bold text-[#d4b13c]">
          {recoveryRate.toFixed(1)}%
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1a1f2c]">
          <div
            className="h-full rounded-full bg-[#d4b13c]"
            style={{ width: `${Math.min(100, recoveryRate)}%` }}
          />
        </div>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-3 gap-2">
        <KpiBox
          label="Pagos este mes"
          value={String(data.payments.total_this_month)}
        />
        <KpiBox
          label="Cobrado este mes"
          value={formatCurrencyCompact(data.payments.amount_this_month)}
        />
        <KpiBox
          label="Cuotas en mora"
          value={String(data.overdue.schedules)}
          red
        />
      </div>
    </div>
  );
}

// ============================================================
// Página principal
// ============================================================
export default function Reports() {
  const [tab, setTab] = useState('summary');

  // Filtros: loans
  const [loansFrom, setLoansFrom] = useState(FIRST_OF_MONTH);
  const [loansTo, setLoansTo] = useState(TODAY);
  const [loansStatus, setLoansStatus] = useState('');

  // Filtros: payments
  const [paymentsFrom, setPaymentsFrom] = useState(FIRST_OF_MONTH);
  const [paymentsTo, setPaymentsTo] = useState(TODAY);
  const [paymentsMethod, setPaymentsMethod] = useState('');

  // Filtros: export
  const [exportLoansFrom, setExportLoansFrom] = useState(FIRST_OF_MONTH);
  const [exportLoansTo, setExportLoansTo] = useState(TODAY);
  const [exportLoansStatus, setExportLoansStatus] = useState('');
  const [exportPaymentsFrom, setExportPaymentsFrom] = useState(FIRST_OF_MONTH);
  const [exportPaymentsTo, setExportPaymentsTo] = useState(TODAY);
  const [exportPaymentsMethod, setExportPaymentsMethod] = useState('');

  const [exporting, setExporting] = useState(null); // 'loans' | 'payments' | 'overdue'
  const [exportError, setExportError] = useState('');

  // ─── Queries ───
  const summaryQuery = useQuery({
    queryKey: ['report-summary'],
    queryFn: getReportSummary,
    enabled: tab === 'summary',
  });

  const loansQuery = useQuery({
    queryKey: ['report-loans', loansFrom, loansTo, loansStatus],
    queryFn: () => getReportLoans(loansFrom, loansTo, loansStatus || undefined),
    enabled: tab === 'loans',
  });

  const paymentsQuery = useQuery({
    queryKey: ['report-payments', paymentsFrom, paymentsTo, paymentsMethod],
    queryFn: () =>
      getReportPayments(paymentsFrom, paymentsTo, paymentsMethod || undefined),
    enabled: tab === 'payments',
  });

  const overdueQuery = useQuery({
    queryKey: ['report-overdue'],
    queryFn: getReportOverdue,
    enabled: tab === 'overdue',
  });

  const isLoading =
    summaryQuery.isLoading ||
    loansQuery.isLoading ||
    paymentsQuery.isLoading ||
    overdueQuery.isLoading;

  // ─── Exportar CSV ───
  async function handleExport(kind) {
    setExporting(kind);
    setExportError('');

    try {
      if (kind === 'loans') {
        const data = await getReportLoans(
          exportLoansFrom,
          exportLoansTo,
          exportLoansStatus || undefined
        );
        exportToCsv(
          `prestamos_${exportLoansFrom}_${exportLoansTo}.csv`,
          ['ID', 'Cliente', 'Monto', 'Estado', 'Fecha Desembolso', 'Cobrado'],
          data.map((l) => [
            String(l.id),
            l.client.full_name,
            String(l.amount),
            l.status,
            l.disbursement_date,
            String(l.total_paid),
          ])
        );
      } else if (kind === 'payments') {
        const data = await getReportPayments(
          exportPaymentsFrom,
          exportPaymentsTo,
          exportPaymentsMethod || undefined
        );
        exportToCsv(
          `pagos_${exportPaymentsFrom}_${exportPaymentsTo}.csv`,
          ['ID', 'Cliente', 'Prestamo #', 'Monto', 'Metodo', 'Fecha Pago'],
          data.map((p) => [
            String(p.id),
            p.loan.client.full_name,
            String(p.loan_id),
            String(p.amount),
            p.payment_method,
            p.payment_date,
          ])
        );
      } else {
        const data = await getReportOverdue();
        exportToCsv(
          `mora_${TODAY}.csv`,
          [
            'Prestamo #',
            'Cliente',
            'Telefono',
            'Monto',
            'Cobrado',
            'Pendiente',
            'Dias Atraso',
            'Cuotas Pendientes',
          ],
          data.map((o) => [
            String(o.loan_id),
            o.client_name,
            o.client_phone ?? '',
            String(o.amount),
            String(o.paid_amount),
            String(o.overdue_amount),
            String(o.days_overdue),
            String(o.installments_overdue),
          ])
        );
      }
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(null);
    }
  }

  // ─── Render ───
  return (
    <div className="min-h-full px-4 pt-4 pb-4">
      <h1 className="mb-4 text-lg font-bold text-white">Reportes</h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t.value
                ? 'bg-[#d4b13c] text-black'
                : 'bg-[#171c26] text-[#ada692]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && tab !== 'export' && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4b13c] border-t-transparent" />
        </div>
      )}

      {/* ─── Tab: Resumen ─── */}
      {tab === 'summary' && !isLoading && summaryQuery.data && (
        <SummaryTab data={summaryQuery.data} />
      )}

      {/* ─── Tab: Préstamos ─── */}
      {tab === 'loans' && !isLoading && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={loansFrom}
              onChange={(e) => setLoansFrom(e.target.value)}
              className={INPUT_CLASS}
            />
            <span className="text-xs text-[#4a4e5a]">a</span>
            <input
              type="date"
              value={loansTo}
              onChange={(e) => setLoansTo(e.target.value)}
              className={INPUT_CLASS}
            />
            <select
              value={loansStatus}
              onChange={(e) => setLoansStatus(e.target.value)}
              className="rounded-lg bg-[#171c26] px-2 py-1.5 text-xs text-white outline-none"
            >
              <option value="">Todo estado</option>
              <option value="active">Activo</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {(loansQuery.data ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-[#4a4e5a] md:col-span-2 lg:col-span-3">
                Sin resultados.
              </p>
            )}

            {(loansQuery.data ?? []).map((loan) => (
              <div key={loan.id} className="rounded-xl bg-[#0e1218] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {loan.client.full_name}
                  </p>
                  <span className="text-sm font-bold text-[#d4b13c]">
                    {formatCurrencyCompact(loan.amount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-[#ada692]">
                    {formatDateShort(loan.disbursement_date)}
                  </p>
                  <span
                    className={`text-[10px] font-semibold ${
                      loan.status === 'paid'
                        ? 'text-emerald-400'
                        : loan.status === 'overdue'
                          ? 'text-red-400'
                          : 'text-blue-400'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab: Pagos ─── */}
      {tab === 'payments' && !isLoading && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={paymentsFrom}
              onChange={(e) => setPaymentsFrom(e.target.value)}
              className={INPUT_CLASS}
            />
            <span className="text-xs text-[#4a4e5a]">a</span>
            <input
              type="date"
              value={paymentsTo}
              onChange={(e) => setPaymentsTo(e.target.value)}
              className={INPUT_CLASS}
            />
            <input
              value={paymentsMethod}
              onChange={(e) => setPaymentsMethod(e.target.value)}
              placeholder="Metodo..."
              className="w-24 rounded-lg bg-[#171c26] px-2 py-1.5 text-xs text-white placeholder-[#4a4e5a] outline-none"
            />
          </div>

          <div className="space-y-2">
            {(paymentsQuery.data ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-[#4a4e5a]">
                Sin resultados.
              </p>
            )}

            {(paymentsQuery.data ?? []).map((payment) => (
              <div key={payment.id} className="rounded-xl bg-[#0e1218] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {payment.loan.client.full_name}
                  </p>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrencyCompact(payment.amount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-[#ada692]">
                    {formatDateShort(payment.payment_date)}
                  </p>
                  <span className="text-[10px] text-[#4a4e5a]">
                    {payment.payment_method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab: Mora ─── */}
      {tab === 'overdue' && !isLoading && (
        <div className="space-y-2">
          {(overdueQuery.data ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-[#4a4e5a]">
              Sin prestamos en mora.
            </p>
          )}

          {(overdueQuery.data ?? []).map((item) => (
            <div key={item.loan_id} className="rounded-xl bg-[#0e1218] p-3.5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.client_name}
                  </p>
                  {item.client_phone && (
                    <p className="text-xs text-[#ada692]">
                      {item.client_phone}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  {item.days_overdue}d atraso
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#1a1f2c] p-2">
                  <p className="text-[10px] text-[#ada692]">Prestamo</p>
                  <p className="text-xs font-bold text-white">
                    {formatCurrencyCompact(item.amount)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a1f2c] p-2">
                  <p className="text-[10px] text-[#ada692]">Cobrado</p>
                  <p className="text-xs font-bold text-emerald-400">
                    {formatCurrencyCompact(item.paid_amount)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-900/20 p-2">
                  <p className="text-[10px] text-red-400/80">Pendiente</p>
                  <p className="text-xs font-bold text-red-400">
                    {formatCurrencyCompact(item.overdue_amount)}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-right text-[10px] text-[#ada692]">
                {item.installments_overdue} cuota
                {item.installments_overdue === 1 ? '' : 's'} pendiente
                {item.installments_overdue === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tab: Exportar ─── */}
      {tab === 'export' && (
        <div className="space-y-3">
          {exportError && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
              {exportError}
            </p>
          )}

          {/* Exportar préstamos */}
          <div className="rounded-xl bg-[#0e1218] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4b13c]/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-[#d4b13c]"
                  fill="currentColor"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Cartera de Préstamos
                </p>
                <p className="text-[10px] text-[#ada692]">
                  Listado de préstamos con montos, estado y cobros
                </p>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={exportLoansFrom}
                onChange={(e) => setExportLoansFrom(e.target.value)}
                className={INPUT_CLASS}
              />
              <span className="text-xs text-[#4a4e5a]">a</span>
              <input
                type="date"
                value={exportLoansTo}
                onChange={(e) => setExportLoansTo(e.target.value)}
                className={INPUT_CLASS}
              />
              <select
                value={exportLoansStatus}
                onChange={(e) => setExportLoansStatus(e.target.value)}
                className="rounded-lg bg-[#171c26] px-2 py-1.5 text-xs text-white outline-none"
              >
                <option value="">Todo estado</option>
                <option value="active">Activo</option>
                <option value="paid">Pagado</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>

            <button
              onClick={() => handleExport('loans')}
              disabled={exporting !== null}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d4b13c] py-2.5 text-xs font-bold text-black disabled:opacity-60"
            >
              {exporting === 'loans' ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
                </svg>
              )}
              {exporting === 'loans' ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Exportar pagos */}
          <div className="rounded-xl bg-[#0e1218] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-emerald-400"
                  fill="currentColor"
                >
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Reporte de Pagos
                </p>
                <p className="text-[10px] text-[#ada692]">
                  Historial de pagos recibidos en el periodo
                </p>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={exportPaymentsFrom}
                onChange={(e) => setExportPaymentsFrom(e.target.value)}
                className={INPUT_CLASS}
              />
              <span className="text-xs text-[#4a4e5a]">a</span>
              <input
                type="date"
                value={exportPaymentsTo}
                onChange={(e) => setExportPaymentsTo(e.target.value)}
                className={INPUT_CLASS}
              />
              <input
                value={exportPaymentsMethod}
                onChange={(e) => setExportPaymentsMethod(e.target.value)}
                placeholder="Metodo..."
                className="w-24 rounded-lg bg-[#171c26] px-2 py-1.5 text-xs text-white placeholder-[#4a4e5a] outline-none"
              />
            </div>

            <button
              onClick={() => handleExport('payments')}
              disabled={exporting !== null}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {exporting === 'payments' ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
                </svg>
              )}
              {exporting === 'payments' ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          {/* Exportar mora */}
          <div className="rounded-xl bg-[#0e1218] p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                >
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Reporte de Mora
                </p>
                <p className="text-[10px] text-[#ada692]">
                  Clientes con cuotas vencidas al día de hoy
                </p>
              </div>
            </div>

            <p className="mb-3 text-xs text-[#4a4e5a]">
              Incluye datos de contacto y montos pendientes por cliente.
            </p>

            <button
              onClick={() => handleExport('overdue')}
              disabled={exporting !== null}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {exporting === 'overdue' ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
                </svg>
              )}
              {exporting === 'overdue' ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}