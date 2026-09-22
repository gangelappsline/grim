import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLoan, deleteLoan, getLoans } from '../api/loans';
import { getClients } from '../api/clients';
import { useToast } from '../components/Toast';
import {
  formatCurrencyRound,
  FREQUENCY_OPTIONS,
  INPUT_CLASS,
  LOAN_FILTERS,
  LOAN_STATUS_BADGES,
  toISODate,
} from '../utils/format';

// ============================================================
// Formulario vacío
// ============================================================
const EMPTY_FORM = {
  client_id: '',
  amount: '',
  interest_rate: '',
  term: '',
  frequency: 'monthly',
  disbursement_date: toISODate(),
  notes: '',
  late_fee_type: 'percentage',
  late_fee_value: '',
};

// ============================================================
// Página
// ============================================================
export default function Loans() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  // Filtros y modales
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [invalidFields, setInvalidFields] = useState(new Set());
  const [deleting, setDeleting] = useState(null);

  // Selector de cliente
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // ─── Queries ───
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['loans', status],
    queryFn: () => getLoans(status || undefined),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
    staleTime: 60_000,
  });

  const loans = data?.loans ?? [];
  const clients = clientsData?.clients ?? [];

  const filteredClients = clients.filter((c) =>
    `${c.name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(
    (c) => String(c.id) === form.client_id
  );

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: (payload) => createLoan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      toast.success('Préstamo creado exitosamente');
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setDeleting(null);
      toast.success('Préstamo eliminado');
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Handlers ───
  function openModal() {
    setForm(EMPTY_FORM);
    setFormError('');
    setInvalidFields(new Set());
    setClientSearch('');
    setDropdownOpen(false);
    setModalOpen(true);
  }

  function handleSubmit() {
    const invalid = new Set();
    if (!form.client_id) invalid.add('client_id');
    if (!form.amount) invalid.add('amount');
    if (!form.interest_rate) invalid.add('interest_rate');
    if (!form.term) invalid.add('term');

    if (invalid.size > 0) {
      setInvalidFields(invalid);
      setFormError('Completa los campos requeridos');
      return;
    }

    setInvalidFields(new Set());
    setFormError('');

    const payload = {
      client_id: Number(form.client_id),
      amount: Number(form.amount),
      interest_rate: Number(form.interest_rate),
      term: Number(form.term),
      frequency: form.frequency,
      disbursement_date: form.disbursement_date,
      ...(form.notes ? { notes: form.notes } : {}),
      ...(form.late_fee_value === ''
        ? {}
        : {
            late_fee_type: form.late_fee_type,
            late_fee_value: Number(form.late_fee_value),
          }),
    };

    createMutation.mutate(payload);
  }

  // Clase de input que cambia si el campo está marcado como inválido
  function inputClass(fieldName) {
    return `${INPUT_CLASS}${
      fieldName && invalidFields.has(fieldName) ? ' ring-1 ring-red-500' : ''
    }`;
  }

  return (
    <div className="min-h-full px-4 pt-4 pb-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Prestamos</h1>
          <p className="text-xs text-[#ada692]">{loans.length} registros</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 rounded-full bg-[#d4b13c] px-3.5 py-1.5 text-xs font-bold text-black"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {LOAN_FILTERS.map((f) => (
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

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4b13c] border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-red-900/30 p-4 text-center text-sm text-red-400">
          Error al cargar prestamos.{' '}
          <button onClick={() => refetch()} className="underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {loans.length === 0 && (
            <p className="py-12 text-center text-sm text-[#4a4e5a] md:col-span-2 lg:col-span-3">
              No hay prestamos.
            </p>
          )}

          {loans.map((loan) => {
            const badge = LOAN_STATUS_BADGES[loan.status] ?? LOAN_STATUS_BADGES.cancelled;
            const progress = loan.total_amount
              ? Math.min(
                  100,
                  Math.round(((loan.total_paid ?? 0) / loan.total_amount) * 100)
                )
              : 0;

            return (
              <div
                key={loan.id}
                onClick={() => navigate(`/prestamos/${loan.id}`)}
                className="w-full cursor-pointer rounded-xl bg-[#0e1218] p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {loan.client?.name ?? `Cliente #${loan.client_id}`}
                    </p>
                    <p className="text-xs text-[#ada692]">
                      {FREQUENCY_OPTIONS.find((f) => f.value === loan.frequency)?.label}{' '}
                      · {loan.term} cuotas · {loan.interest_rate}%
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(loan);
                      }}
                      className="text-[#4a4e5a] hover:text-red-400"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-white">
                    {formatCurrencyRound(loan.amount)}
                  </span>
                  <span className="text-xs text-[#ada692]">
                    {formatCurrencyRound(loan.total_paid ?? 0)} /{' '}
                    {formatCurrencyRound(loan.total_amount ?? loan.amount)}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1f2c]">
                  <div
                    className="h-full rounded-full bg-[#d4b13c]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-[#ada692]">
                  {progress}% cobrado
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal crear préstamo ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />

          <div className="relative flex max-h-[90dvh] w-full max-w-[460px] flex-col overflow-y-auto rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" />

            <div className="mb-5 flex shrink-0 items-center justify-between">
              <h3 className="text-base font-bold text-white">Nuevo Prestamo</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#ada692]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {formError && (
              <p className="mb-3 shrink-0 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {formError}
              </p>
            )}

            <div className="space-y-3">
              {/* ─── Cliente ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Cliente <span className="text-red-500">*</span>
                </label>

                <div
                  onClick={() => setDropdownOpen((v) => !v)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg bg-[#171c26] px-3 py-2.5${
                    invalidFields.has('client_id') ? ' ring-1 ring-red-500' : ''
                  }`}
                >
                  {selectedClient ? (
                    <span className="text-sm text-white">
                      {selectedClient.name} {selectedClient.last_name}
                    </span>
                  ) : (
                    <span className="text-sm text-[#4a4e5a]">
                      Seleccionar cliente...
                    </span>
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 shrink-0 text-[#ada692] transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </div>

                {dropdownOpen && (
                  <div className="mt-1 overflow-hidden rounded-lg bg-[#1a1f2c]">
                    <div className="p-2">
                      <input
                        autoFocus
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="w-full rounded-md bg-[#0e1218] px-3 py-2 text-sm text-white outline-none placeholder:text-[#4a4e5a]"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <p className="px-3 py-3 text-center text-xs text-[#4a4e5a]">
                          Sin resultados
                        </p>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, client_id: String(c.id) }));
                              setInvalidFields((prev) => {
                                const next = new Set(prev);
                                next.delete('client_id');
                                return next;
                              });
                              setDropdownOpen(false);
                              setClientSearch('');
                            }}
                            className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                              String(c.id) === form.client_id
                                ? 'text-[#d4b13c]'
                                : 'text-white'
                            }`}
                          >
                            {c.name} {c.last_name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Monto ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.amount}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, amount: e.target.value }));
                    setInvalidFields((prev) => {
                      const next = new Set(prev);
                      next.delete('amount');
                      return next;
                    });
                  }}
                  type="number"
                  className={inputClass('amount')}
                  placeholder="Ej. 50000"
                />
              </div>

              {/* ─── Tasa ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Tasa de interes (%) <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.interest_rate}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, interest_rate: e.target.value }));
                    setInvalidFields((prev) => {
                      const next = new Set(prev);
                      next.delete('interest_rate');
                      return next;
                    });
                  }}
                  type="number"
                  step="0.1"
                  className={inputClass('interest_rate')}
                  placeholder="Ej. 5"
                />
              </div>

              {/* ─── Cuotas ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Numero de cuotas <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.term}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, term: e.target.value }));
                    setInvalidFields((prev) => {
                      const next = new Set(prev);
                      next.delete('term');
                      return next;
                    });
                  }}
                  type="number"
                  className={inputClass('term')}
                  placeholder="Ej. 12"
                />
              </div>

              {/* ─── Frecuencia ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Frecuencia de pago <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {FREQUENCY_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, frequency: f.value }))}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        form.frequency === f.value
                          ? 'bg-[#d4b13c] text-black'
                          : 'bg-[#171c26] text-[#ada692]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Fecha desembolso ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Fecha de desembolso <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.disbursement_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, disbursement_date: e.target.value }))
                  }
                  type="date"
                  className={inputClass()}
                />
              </div>

              {/* ─── Monto moratorio ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Monto moratorio
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.late_fee_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, late_fee_type: e.target.value }))
                    }
                    className="w-36 shrink-0 rounded-lg bg-[#171c26] px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#d4b13c]/50"
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Cantidad fija</option>
                  </select>
                  <input
                    value={form.late_fee_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, late_fee_value: e.target.value }))
                    }
                    type="number"
                    step="0.01"
                    className={inputClass()}
                    placeholder={form.late_fee_type === 'percentage' ? 'Ej. 5' : 'Ej. 200'}
                  />
                </div>
              </div>

              {/* ─── Notas ─── */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#ada692]">
                  Notas
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={inputClass()}
                  placeholder="Observaciones opcionales..."
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="mt-5 w-full rounded-full bg-[#d4b13c] py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Prestamo'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal eliminar ─── */}
      {deleting && (
        <div className="fixed inset-0 z-300 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !deleteMutation.isPending && setDeleting(null)}
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-[#0e1218] p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-red-400"
                fill="currentColor"
              >
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </div>

            <h3 className="mb-1 text-base font-bold text-white">
              Eliminar préstamo
            </h3>
            <p className="mb-5 text-sm text-[#ada692]">
              ¿Seguro que deseas eliminar el préstamo de{' '}
              <span className="font-semibold text-white">
                {deleting.client?.name ?? `Cliente #${deleting.client_id}`}
              </span>{' '}
              por{' '}
              <span className="font-semibold text-white">
                {formatCurrencyRound(deleting.amount)}
              </span>
              ? Esta acción no se puede deshacer.
            </p>

            {deleteMutation.isError && (
              <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {deleteMutation.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-[#ada692] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleting.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}