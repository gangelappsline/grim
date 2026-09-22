import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPayment,
  deletePayment,
  getPaymentSchedules,
} from '../api/payments';
import { useToast } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  formatCurrency,
  INPUT_CLASS_DATE as INPUT_CLASS,
  PERIOD_FILTERS,
  SCHEDULE_FILTERS,
  toISODate,
} from '../utils/format';

const TODAY = toISODate();

// ============================================================
// Badge de estado de cuota
// ============================================================
function StatusBadge({ schedule }) {
  if (schedule.status === 'paid') {
    return (
      <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-semibold text-green-400">
        Pagado
      </span>
    );
  }
  if (schedule.status === 'overdue') {
    return (
      <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-400">
        {schedule.days_overdue ? `${schedule.days_overdue}d atraso` : 'Vencido'}
      </span>
    );
  }
  // pending
  const daysUntil = Math.ceil(
    (new Date(schedule.due_date).getTime() - Date.now()) / 86_400_000
  );
  if (daysUntil <= 3) {
    return (
      <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        Vence pronto
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#1a1f2c] px-2 py-0.5 text-[10px] font-semibold text-[#ada692]">
      Pendiente
    </span>
  );
}

// ============================================================
// Página
// ============================================================
function CalendarContent() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filtros
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [range, setRange] = useState({ start: '', end: '' });
  const [showRange, setShowRange] = useState(false);

  // Modales
  const [paying, setPaying] = useState(null);
  const [reverting, setReverting] = useState(null);
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'Efectivo',
    notes: '',
    payment_date: TODAY,
  });
  const [formError, setFormError] = useState('');

  // ─── Query ───
  const { data: schedules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['pending-schedules', status, period, range.start, range.end],
    queryFn: () =>
      getPaymentSchedules(
        status || undefined,
        period || undefined,
        range.start || undefined,
        range.end || undefined
      ),
  });

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: (payload) => createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setPaying(null);
      toast.success('Pago registrado exitosamente');
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setReverting(null);
      toast.success('Pago revertido exitosamente');
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Handlers ───
  function openPay(schedule) {
    const amount =
      schedule.status === 'overdue'
        ? schedule.amount_due + (schedule.penalty_amount ?? 0)
        : schedule.amount_due;

    setForm({
      amount: String(amount),
      payment_method: 'Efectivo',
      notes: '',
      payment_date: TODAY,
    });
    setFormError('');
    setPaying(schedule);
  }

  function submitPayment() {
    if (!form.amount || !form.payment_method) {
      setFormError('Completa los campos requeridos');
      return;
    }
    createMutation.mutate({
      loan_id: paying.loan_id,
      payment_schedule_id: paying.id,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      ...(form.notes ? { notes: form.notes } : {}),
    });
  }

  function confirmRevert() {
    const paymentId = reverting?.payments?.[0]?.id;
    if (!paymentId) {
      toast.error('No se encontró el pago asociado a esta cuota.');
      return;
    }
    deleteMutation.mutate(paymentId);
  }

  const overdueCount = schedules.filter((s) => s.status === 'overdue').length;
  const pendingCount = schedules.filter((s) => s.status === 'pending').length;

  return (
    <div className="min-h-full px-4 pt-4 pb-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Cobros</h1>
          <p className="text-xs text-[#ada692]">
            {overdueCount > 0 && (
              <span className="text-red-400">{overdueCount} vencidos</span>
            )}
            {overdueCount > 0 && pendingCount > 0 && (
              <span className="text-[#4a4e5a]"> · </span>
            )}
            {pendingCount > 0 && <span>{pendingCount} pendientes</span>}
            {overdueCount === 0 && pendingCount === 0 && 'Sin cobros'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171c26] text-[#ada692]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
        </button>
      </div>

      {/* Filtros de periodo */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {PERIOD_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setPeriod(f.value);
              if (f.value) {
                setRange({ start: '', end: '' });
                setShowRange(false);
              }
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              period === f.value && !showRange
                ? 'bg-[#d4b13c] text-black'
                : 'bg-[#171c26] text-[#ada692]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => {
            setShowRange((v) => !v);
            setPeriod('');
          }}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
            showRange ? 'bg-[#d4b13c] text-black' : 'bg-[#171c26] text-[#ada692]'
          }`}
        >
          Rango
        </button>
      </div>

      {/* Rango de fechas */}
      {showRange && (
        <div className="mb-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold text-[#ada692]">
              Desde
            </label>
            <input
              type="date"
              value={range.start}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold text-[#ada692]">
              Hasta
            </label>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          {(range.start || range.end) && (
            <button
              onClick={() => setRange({ start: '', end: '' })}
              className="mb-0.5 shrink-0 rounded-full bg-[#171c26] px-3 py-2.5 text-[10px] font-semibold text-[#ada692]"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Filtros de estado */}
      <div className="mb-4 flex gap-2">
        {SCHEDULE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === f.value
                ? 'bg-[#d4b13c] text-black'
                : 'bg-[#171c26] text-[#ada692]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4b13c] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-900/30 p-4 text-center text-sm text-red-400">
          Error al cargar cobros.{' '}
          <button onClick={() => refetch()} className="underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {schedules.length === 0 && (
            <p className="py-12 text-center text-sm text-[#4a4e5a] md:col-span-2 lg:col-span-3">
              Sin cobros pendientes.
            </p>
          )}

          {schedules.map((schedule) => (
            <div key={schedule.id} className="rounded-xl bg-[#0e1218] p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {schedule.loan?.client?.name ?? '—'}
                  </p>
                  <p className="text-xs text-[#ada692]">
                    Préstamo #{schedule.loan_id} · Cuota {schedule.installment_number} ·{' '}
                    {new Date(schedule.due_date + 'T00:00:00').toLocaleDateString(
                      'es',
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )}
                  </p>
                </div>
                <StatusBadge schedule={schedule} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">
                  {formatCurrency(
                    schedule.status === 'overdue'
                      ? schedule.amount_due + (schedule.penalty_amount ?? 0)
                      : schedule.amount_due
                  )}
                </span>

                {(schedule.status === 'pending' || schedule.status === 'overdue') && (
                  <button
                    onClick={() => openPay(schedule)}
                    className="rounded-full bg-[#d4b13c]/10 px-4 py-1.5 text-xs font-bold text-[#d4b13c] transition hover:bg-[#d4b13c]/20"
                  >
                    Registrar pago
                  </button>
                )}

                {schedule.status === 'paid' && (
                  <button
                    onClick={() => setReverting(schedule)}
                    className="rounded-full bg-red-600/80 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-red-600"
                  >
                    Revertir pago
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal registrar pago ─── */}
      {paying && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPaying(null)} />

          <div className="relative w-full max-w-[460px] rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Registrar Pago</h3>
                <p className="text-xs text-[#ada692]">
                  {paying.client_name} · Cuota {paying.installment_number}
                </p>
              </div>
              <button onClick={() => setPaying(null)} className="text-[#ada692]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {formError && (
              <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {formError}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Monto *
                </label>
                <input
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  type="number"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Metodo de pago *
                </label>
                <select
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, payment_method: e.target.value }))
                  }
                  className={INPUT_CLASS}
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Deposito</option>
                  <option>Cheque</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Fecha de pago *
                </label>
                <input
                  value={form.payment_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, payment_date: e.target.value }))
                  }
                  type="date"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Notas
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="Opcional..."
                />
              </div>
            </div>

            <button
              onClick={submitPayment}
              disabled={createMutation.isPending}
              className="mt-5 w-full rounded-full bg-[#d4b13c] py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {createMutation.isPending ? 'Registrando...' : 'Confirmar Pago'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal revertir pago ─── */}
      {reverting && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setReverting(null)} />

          <div className="relative w-full max-w-[460px] rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-1 flex items-start justify-between">
              <h3 className="text-base font-bold text-white">Revertir pago</h3>
              <button onClick={() => setReverting(null)} className="text-[#ada692]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <p className="mb-5 text-xs text-[#ada692]">
              {reverting.client_name} · Cuota {reverting.installment_number}
            </p>

            <div className="rounded-xl bg-red-900/20 px-4 py-3.5">
              <p className="text-sm font-semibold text-red-400">¿Revertir este pago?</p>
              <p className="mt-1 text-xs text-[#ada692]">
                Esta acción marcará la cuota como pendiente y eliminará el registro del
                pago. No se puede deshacer.
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setReverting(null)}
                className="flex-1 rounded-full bg-[#171c26] py-3 text-sm font-semibold text-[#ada692]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRevert}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-full bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Revirtiendo...' : 'Sí, revertir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Wrapper con ErrorBoundary
// ============================================================
export default function Calendar() {
  return (
    <ErrorBoundary>
      <CalendarContent />
    </ErrorBoundary>
  );
}