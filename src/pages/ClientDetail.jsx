import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getClient } from '../api/clients';
import {
  CLIENT_STATUS_BADGES,
  formatCurrencyRound,
  formatDateShort,
  FREQUENCY_LABELS,
  getInitials,
  LOAN_STATUS_BADGES_ALT,
} from '../utils/format';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#1a1f2c] last:border-0">
      <span className="text-xs text-[#ada692] shrink-0">{label}</span>
      <span className="text-xs text-white text-right">{value}</span>
    </div>
  );
}

function LoanCard({ loan }) {
  const navigate = useNavigate();
  const badge = LOAN_STATUS_BADGES_ALT[loan.status] ?? LOAN_STATUS_BADGES_ALT.cancelled;
  const progress = loan.total_amount
    ? Math.min(100, Math.round(((loan.total_paid ?? 0) / loan.total_amount) * 100))
    : 0;

  return (
    <div
      onClick={() => navigate(`/prestamos/${loan.id}`)}
      className="cursor-pointer rounded-xl bg-[#0e1218] p-4 active:opacity-80"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {formatCurrencyRound(loan.amount)}
          </p>
          <p className="text-xs text-[#ada692]">
            {FREQUENCY_LABELS[loan.frequency] ?? loan.frequency} · {loan.term} cuotas ·{' '}
            {loan.interest_rate}%
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-[#ada692]">
          {formatDateShort(loan.disbursement_date)}
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
}

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = Number(id);
  const navigate = useNavigate();

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: !!clientId,
  });

  const loans = client?.loans ?? [];
  const statusBadge = client
    ? CLIENT_STATUS_BADGES[client.status] ?? CLIENT_STATUS_BADGES.inactive
    : null;

  return (
    <div className="min-h-full px-4 pt-4 pb-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171c26] text-[#ada692]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white leading-tight">
            {isLoading ? 'Cargando…' : client ? client.full_name : 'Cliente'}
          </h1>
          <p className="text-xs text-[#ada692]">Detalle del cliente</p>
        </div>
        {statusBadge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4b13c] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-900/30 p-4 text-center text-sm text-red-400">
          Error al cargar el cliente.
        </div>
      )}

      {!isLoading && !isError && client && (
        <>
          {/* Info */}
          <div className="mb-4 rounded-xl bg-[#0e1218] p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#d4b13c]/15 text-lg font-bold text-[#d4b13c]">
                {getInitials(client.name, client.last_name)}
              </div>
              <div>
                <p className="text-base font-bold text-white">
                  {client.full_name}
                </p>
                {client.dni && (
                  <p className="text-xs text-[#ada692]">DNI: {client.dni}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-[#171c26] px-3 py-1">
              <InfoRow label="Teléfono" value={client.phone} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Dirección" value={client.address} />
              <InfoRow
                label="Nacimiento"
                value={client.birth_date ? formatDateShort(client.birth_date) : null}
              />
              <InfoRow label="Notas" value={client.notes} />
            </div>
          </div>

          {/* Préstamos */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Préstamos</h2>
              <div className="flex items-center gap-2">
                {client.active_loans_count > 0 && (
                  <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    {client.active_loans_count} activos
                  </span>
                )}
                <span className="text-xs text-[#ada692]">
                  {loans.length} total
                </span>
              </div>
            </div>

            {loans.length === 0 && (
              <p className="py-8 text-center text-sm text-[#4a4e5a]">
                Sin préstamos registrados.
              </p>
            )}

            {loans.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {loans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}