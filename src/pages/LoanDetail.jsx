import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLoan, updateLoan } from "../api/loans";
import { createPayment, deletePayment } from "../api/payments";
import { useToast } from "../components/Toast";
import { generateLoanPdf, generatePaymentTicket } from "../utils/pdf";
import {
  formatCurrency,
  formatDateShort,
  FREQUENCY_LABELS,
  INPUT_CLASS,
  LOAN_STATUS_BADGES,
  LOAN_STATUS_OPTIONS,
  SCHEDULE_STATUS_TEXT,
  toISODate,
} from "../utils/format";

// ============================================================
// KPI cell pequeño (label + value) — usado en el grid de info
// ============================================================
function KpiCell({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-[#4a4e5a]">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

// ============================================================
// Página
// ============================================================
export default function LoanDetail() {
  const { id } = useParams();
  const loanId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Modales ───
  const [editOpen, setEditOpen] = useState(false);
  const [paying, setPaying] = useState(null); // schedule o null
  const [reverting, setReverting] = useState(null); // schedule o null
  const [confirmTermChange, setConfirmTermChange] = useState(false);
  const [ticket, setTicket] = useState(null); // datos del ticket post-pago

  // ─── Form: editar ───
  const [editForm, setEditForm] = useState({
    status: "active",
    notes: "",
    term: "",
  });
  const [editError, setEditError] = useState("");

  // ─── Form: pago ───
  const [payForm, setPayForm] = useState({
    amount: "",
    payment_method: "Efectivo",
    payment_date: toISODate(),
    notes: "",
  });
  const [payError, setPayError] = useState("");
  const [payingScheduleNumber, setPayingScheduleNumber] = useState(0);

  // ─── Form: revertir ───
  const [revertingNumber, setRevertingNumber] = useState(0);

  // ─── Query ───
  const {
    data: loan,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => getLoan(loanId),
    enabled: !!loanId,
  });

  // ─── Mutations ───
  const updateMutation = useMutation({
    mutationFn: (payload) => updateLoan(loanId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setEditOpen(false);
      toast.success("Préstamo actualizado correctamente");
    },
    onError: (err) => setEditError(err.message),
  });

  const payMutation = useMutation({
    mutationFn: (payload) => createPayment(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setPaying(null);
      toast.success("Pago registrado exitosamente");

      // Abre el modal de ticket post-pago
      if (loan) {
        setTicket({
          id: data.id,
          loanId,
          installmentNumber: payingScheduleNumber,
          clientName: loan.client.full_name,
          amount: data.amount,
          paymentMethod: data.payment_method,
          paymentDate: data.payment_date,
          notes: data.notes,
        });
      }
    },
    onError: (err) => setPayError(err.message),
  });

  const revertMutation = useMutation({
    mutationFn: (paymentId) => deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setReverting(null);
      toast.success("Pago revertido exitosamente");
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Handlers ───
  function openEdit() {
    if (!loan) return;
    setEditForm({
      status: loan.status,
      notes: loan.notes ?? "",
      term: String(loan.term),
    });
    setEditError("");
    setEditOpen(true);
  }

  function openPay(schedule) {
    const amount =
      schedule.status === "overdue"
        ? schedule.amount_due + (schedule.penalty_amount ?? 0)
        : schedule.amount_due;

    setPayForm({
      amount: String(amount),
      payment_method: "Efectivo",
      payment_date: toISODate(),
      notes: "",
    });
    setPayError("");
    setPaying(schedule);
    setPayingScheduleNumber(schedule.installment_number);
  }

  function submitPayment() {
    if (!payForm.amount || !payForm.payment_method) {
      setPayError("Completa los campos requeridos");
      return;
    }
    payMutation.mutate({
      loan_id: loanId,
      payment_schedule_id: paying.id,
      amount: Number(payForm.amount),
      payment_method: payForm.payment_method,
      payment_date: payForm.payment_date,
      ...(payForm.notes.trim() ? { notes: payForm.notes.trim() } : {}),
    });
  }

  function openRevert(schedule) {
    setReverting(schedule);
    setRevertingNumber(schedule.installment_number);
  }

  function confirmRevert() {
    const payment = loan?.payments?.find(
      (p) => p.payment_schedule_id === reverting.id,
    );
    if (!payment) {
      toast.error("No se encontró el pago asociado a esta cuota.");
      return;
    }
    revertMutation.mutate(payment.id);
  }

  function submitEdit() {
    const payload = { status: editForm.status };
    if (editForm.notes.trim()) payload.notes = editForm.notes.trim();
    if (editForm.term && Number(editForm.term) > 0) {
      payload.term = Number(editForm.term);
    }

    // Si cambia el número de cuotas → modal de advertencia
    if (
      loan &&
      Number(editForm.term) !== loan.term &&
      Number(editForm.term) > 0
    ) {
      setConfirmTermChange(true);
      return;
    }

    updateMutation.mutate(payload);
  }

  function confirmTermChangeAndSubmit() {
    setConfirmTermChange(false);
    const payload = { status: editForm.status, term: Number(editForm.term) };
    if (editForm.notes.trim()) payload.notes = editForm.notes.trim();
    updateMutation.mutate(payload);
  }

  // ─── Loading / Error ───
  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4b13c] border-t-transparent" />
      </div>
    );
  }

  if (isError || !loan) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-400">No se pudo cargar el préstamo.</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-[#d4b13c] underline"
        >
          Reintentar
        </button>
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-[#ada692] underline"
        >
          Volver
        </button>
      </div>
    );
  }

  // ─── Cálculos ───
  const badge = LOAN_STATUS_BADGES[loan.status] ?? LOAN_STATUS_BADGES.cancelled;
  const paidCount = loan.payment_schedules.filter(
    (s) => s.status === "paid",
  ).length;
  const totalSchedules = loan.payment_schedules.length;
  const progress =
    loan.total_amount && loan.total_amount > 0
      ? Math.min(100, Math.round((loan.total_paid / loan.total_amount) * 100))
      : 0;

  return (
    <div className="min-h-full pb-8">
      {/* ─── Header sticky ─── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-[#060a10] px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="shrink-0 text-[#ada692]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h1
            className="truncate text-sm font-bold text-white"
            title={loan.client.full_name}
          >
            {loan.client.full_name}
          </h1>
          <p className="text-xs text-[#ada692]">Préstamo #{loan.id}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => generateLoanPdf(loan)}
            className="flex items-center gap-1.5 rounded-full bg-[#171c26] px-3 py-1.5 text-xs font-semibold text-[#ada692]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            PDF
          </button>

          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-full bg-[#171c26] px-3 py-1.5 text-xs font-semibold text-[#ada692]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            Editar
          </button>
        </div>
      </div>

      {/* ─── Contenido ─── */}
      <div className="space-y-4 px-4 pt-2">
        {/* Card: monto + progreso */}
        <div className="rounded-xl bg-[#0e1218] p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-[#ada692]">Monto desembolsado</p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(loan.amount)}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="mb-1 flex items-baseline justify-between text-xs text-[#ada692]">
            <span>Cobrado: {formatCurrency(loan.total_paid)}</span>
            <span>Total: {formatCurrency(loan.total_amount)}</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#1a1f2c]">
            <div
              className="h-full rounded-full bg-[#d4b13c] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-[#ada692]">
            {progress}% cobrado
          </p>
        </div>

        {/* Card: información del préstamo */}
        <div className="rounded-xl bg-[#0e1218] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#ada692]">
            Información del préstamo
          </p>

          <div className="grid grid-cols-2 gap-3">
            <KpiCell label="Tasa de interés" value={`${loan.interest_rate}%`} />
            <KpiCell
              label="Frecuencia"
              value={FREQUENCY_LABELS[loan.frequency] ?? loan.frequency}
            />
            <KpiCell
              label="Cuota"
              value={formatCurrency(loan.installment_amount)}
            />
            <KpiCell
              label="Cuotas"
              value={`${paidCount} / ${loan.term} pagadas`}
            />
            <KpiCell
              label="Desembolso"
              value={formatDateShort(loan.disbursement_date)}
            />
            <KpiCell
              label="Vencimiento"
              value={formatDateShort(loan.due_date)}
            />
            <KpiCell
              label="Saldo restante"
              value={formatCurrency(loan.remaining_balance)}
            />
          </div>

          {loan.notes && (
            <div className="mt-3 border-t border-[#1a1f2c] pt-3">
              <p className="mb-1 text-xs font-semibold text-[#ada692]">Notas</p>
              <p className="text-sm text-white">{loan.notes}</p>
            </div>
          )}
        </div>

        {/* Card: cuotas */}
        <div className="rounded-xl bg-[#0e1218] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#ada692]">
            Cuotas ({totalSchedules})
          </p>

          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {loan.payment_schedules.map((schedule) => {
              const statusCfg =
                SCHEDULE_STATUS_TEXT[schedule.status] ??
                SCHEDULE_STATUS_TEXT.pending;
              const displayAmount =
                schedule.status === "overdue"
                  ? schedule.amount_due + (schedule.penalty_amount ?? 0)
                  : schedule.amount_due;

              return (
                <div
                  key={schedule.id}
                  className="rounded-lg bg-[#171c26] px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a1f2c] text-[11px] font-bold text-[#ada692]">
                      {schedule.installment_number}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </p>
                      <p className="text-[11px] text-[#4a4e5a]">
                        {formatDateShort(schedule.due_date)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(displayAmount)}
                      </p>
                      {schedule.amount_paid > 0 && (
                        <p className="text-[10px] text-emerald-400">
                          +{formatCurrency(schedule.amount_paid)}
                        </p>
                      )}
                      {schedule.balance > 0 && schedule.status !== "paid" && (
                        <p className="text-[10px] text-[#ada692]">
                          Saldo: {formatCurrency(schedule.balance)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción por cuota */}
                  {(schedule.status === "pending" ||
                    schedule.status === "overdue") && (
                    <button
                      onClick={() => openPay(schedule)}
                      className="mt-2.5 w-full rounded-lg bg-[#d4b13c]/15 py-2 text-xs font-semibold text-[#d4b13c]"
                    >
                      Registrar pago
                    </button>
                  )}

                  {schedule.status === "paid" && (
                    <button
                      onClick={() => openRevert(schedule)}
                      disabled={revertMutation.isPending}
                      className="mt-2.5 w-full rounded-lg bg-red-600/80 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Revertir pago
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Modal: Revertir pago ─── */}
      {reverting !== null && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setReverting(null)}
          />

          <div className="relative w-full max-w-[460px] rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-1 flex items-start justify-between">
              <h3 className="text-base font-bold text-white">Revertir pago</h3>
              <button
                onClick={() => setReverting(null)}
                className="text-[#ada692]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <p className="mb-5 text-xs text-[#ada692]">
              · Cuota {revertingNumber}
            </p>

            <div className="rounded-xl bg-red-900/20 px-4 py-3.5">
              <p className="text-sm font-semibold text-red-400">
                ¿Revertir este pago?
              </p>
              <p className="mt-1 text-xs text-[#ada692]">
                Esta acción marcará la cuota como pendiente y eliminará el
                registro del pago. No se puede deshacer.
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
                disabled={revertMutation.isPending}
                className="flex-1 rounded-full bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {revertMutation.isPending ? "Revirtiendo..." : "Sí, revertir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Registrar pago ─── */}
      {paying !== null && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setPaying(null)}
          />

          <div className="relative w-full max-w-[460px] rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Registrar Pago
                </h3>
                <p className="mt-0.5 text-xs text-[#ada692]">
                  · Cuota {payingScheduleNumber}
                </p>
              </div>
              <button
                onClick={() => setPaying(null)}
                className="text-[#ada692]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {payError && (
              <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {payError}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Monto *
                </label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Metodo de pago *
                </label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) =>
                    setPayForm((f) => ({
                      ...f,
                      payment_method: e.target.value,
                    }))
                  }
                  className={`${INPUT_CLASS} appearance-none cursor-pointer`}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Fecha de pago *
                </label>
                <input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, payment_date: e.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Notas
                </label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  className={INPUT_CLASS}
                  placeholder="Opcional..."
                />
              </div>
            </div>

            <button
              onClick={submitPayment}
              disabled={
                payMutation.isPending ||
                !payForm.amount ||
                !payForm.payment_date
              }
              className="mt-5 w-full rounded-full bg-[#d4b13c] py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {payMutation.isPending ? "Guardando..." : "Confirmar Pago"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal: Editar préstamo ─── */}
      {editOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setEditOpen(false)}
          />

          <div className="relative w-full max-w-[460px] rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Editar préstamo
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="text-[#ada692]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {editError && (
              <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {editError}
              </p>
            )}

            <div className="space-y-3">
              {/* ─── Estado ─── */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Estado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LOAN_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setEditForm((f) => ({ ...f, status: opt.value }))
                      }
                      className={`rounded-lg py-2.5 text-xs font-semibold transition ${
                        editForm.status === opt.value
                          ? "bg-[#d4b13c] text-black"
                          : "bg-[#171c26] text-[#ada692]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Número de cuotas ─── */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Número de cuotas
                </label>
                <input
                  type="number"
                  value={editForm.term}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, term: e.target.value }))
                  }
                  min="1"
                  className={INPUT_CLASS}
                  placeholder="Ej. 12"
                />
              </div>

              {/* ─── Notas ─── */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#ada692]">
                  Notas
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  className={INPUT_CLASS}
                  placeholder="Observaciones..."
                />
              </div>
            </div>

            <button
              onClick={submitEdit}
              disabled={updateMutation.isPending}
              className="mt-5 w-full rounded-full bg-[#d4b13c] py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal: Advertencia cambio de cuotas ─── */}
      {confirmTermChange && loan && (
        <div className="fixed inset-0 z-300 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setConfirmTermChange(false)}
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-[#0e1218] p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-amber-400"
                fill="currentColor"
              >
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>

            <h3 className="mb-1 text-base font-bold text-white">
              ¿Confirmar cambio de cuotas?
            </h3>
            <p className="mb-2 text-sm text-[#ada692]">
              Estás cambiando el número de cuotas de{" "}
              <span className="font-semibold text-white">{loan.term}</span> a{" "}
              <span className="font-semibold text-amber-400">
                {editForm.term}
              </span>
              .
            </p>
            <p className="mb-5 rounded-lg bg-red-900/20 px-3 py-2.5 text-xs text-red-400">
              ⚠ Todos los pagos registrados y el calendario de cuotas serán
              eliminados. El préstamo se recalculará desde cero con el nuevo
              número de cuotas.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTermChange(false)}
                className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-[#ada692]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmTermChangeAndSubmit}
                disabled={updateMutation.isPending}
                className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-black disabled:opacity-60"
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Ticket post-pago ─── */}
      {ticket !== null && (
        <div className="fixed inset-0 z-300 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setTicket(null)}
          />

          <div className="relative mx-4 w-full max-w-[360px] rounded-2xl bg-[#0e1218] px-6 py-6 shadow-xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#d4b13c]/15">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-[#d4b13c]"
                fill="currentColor"
              >
                <path d="M20 6h-2.18c.07-.44.18-.88.18-1.35C18 2.53 15.47 0 12.33 0c-1.7 0-3.21.8-4.33 2.05C6.88.8 5.37 0 3.67 0 .53 0-2 2.53-2 5.65-2 6.12-1.89 6.56-1.82 7H-4v2h24V6zm-7.67-4c1.48 0 2.67 1.22 2.67 2.65 0 .48-.14.93-.33 1.35H13V4.67C13 3.19 14.03 2 15.33 2zM4 5.65C4 4.22 5.19 3 6.67 3S9.33 4.22 9.33 5.65c0 .48-.14.93-.33 1.35H4.33C4.14 6.58 4 6.13 4 5.65zM4 9h16v13H4V9z" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-white">
              ¿Descargar ticket de pago?
            </h3>
            <p className="mt-1.5 text-sm text-[#ada692]">
              El pago fue registrado correctamente. ¿Desea generar y descargar
              el recibo en PDF?
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setTicket(null)}
                className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-[#ada692] hover:bg-white/5"
              >
                No, gracias
              </button>
              <button
                onClick={() => {
                  generatePaymentTicket(ticket);
                  setTicket(null);
                }}
                className="flex-1 rounded-full bg-[#d4b13c] py-2.5 text-sm font-bold text-black"
              >
                Sí, descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
