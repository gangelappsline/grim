import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from '../api/clients';
import { useToast } from '../components/Toast';
import { CLIENT_FILTERS, getInitials, INPUT_CLASS } from '../utils/format';

// ============================================================
// Formulario vacío
// ============================================================
const EMPTY_FORM = {
  name: '',
  last_name: '',
  dni: '',
  phone: '',
  email: '',
  address: '',
  birth_date: '',
  notes: '',
};

// ============================================================
// Wrapper de campo
// ============================================================
function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#ada692]">
        {label}
      </label>
      {children}
    </div>
  );
}

// ============================================================
// Página
// ============================================================
export default function Clients() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [shouldScroll, setShouldScroll] = useState(false);
  const endRef = useRef(null);

  // Modales
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Formulario
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // ─── Query ───
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clients', search, status],
    queryFn: () => getClients(search || undefined, status || undefined),
  });

  const clients = data?.clients ?? [];

  // Auto-scroll al final después de crear
  useEffect(() => {
    if (shouldScroll && !isLoading) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShouldScroll(false);
    }
  }, [clients, shouldScroll, isLoading]);

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: (payload) => createClient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
      toast.success('Cliente creado exitosamente');
      setShouldScroll(true);
    },
    onError: (err) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateClient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
      toast.success('Cliente actualizado correctamente');
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleting(null);
      toast.success('Cliente eliminado');
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Handlers ───
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setEditing(null);
    setModalMode('create');
  }

  function openEdit(client) {
    setForm({
      name: client.name,
      last_name: client.last_name,
      dni: client.dni ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
      birth_date: client.birth_date ?? '',
      notes: client.notes ?? '',
    });
    setFormError('');
    setEditing(client);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditing(null);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.last_name.trim()) {
      setFormError('Nombre y apellido son requeridos');
      return;
    }

    // Construye payload solo con campos no vacíos
    const payload = {
      name: form.name.trim(),
      last_name: form.last_name.trim(),
      ...(form.dni.trim() ? { dni: form.dni.trim() } : {}),
      ...(form.phone ? { phone: form.phone } : {}),
      ...(form.email ? { email: form.email } : {}),
      ...(form.address ? { address: form.address } : {}),
      ...(form.birth_date ? { birth_date: form.birth_date } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    };

    if (modalMode === 'create') {
      createMutation.mutate(payload);
    } else if (modalMode === 'edit' && editing) {
      updateMutation.mutate({ id: editing.id, payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Render ───
  return (
    <div className="min-h-full px-4 pt-4 pb-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Clientes</h1>
          <p className="text-xs text-[#ada692]">{clients.length} registros</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-[#d4b13c] px-3.5 py-1.5 text-xs font-bold text-black"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="currentColor"
          >
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Nuevo
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a4e5a]"
          fill="currentColor"
        >
          <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI o telefono..."
          className="w-full rounded-xl bg-[#171c26] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[#4a4e5a] outline-none focus:ring-1 focus:ring-[#d4b13c]/50"
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        {CLIENT_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
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
          Error al cargar clientes.{' '}
          <button onClick={() => refetch()} className="underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {clients.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-[#4a4e5a]">
              No se encontraron clientes.
            </p>
          )}
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/clientes/${client.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#0e1218] p-3.5 active:opacity-80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4b13c]/15 text-sm font-bold text-[#d4b13c]">
                {getInitials(client.name, client.last_name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {client.name} {client.last_name}
                </p>
                <p className="text-xs text-[#ada692]">
                  {client.dni ?? ''}
                  {client.phone ? ` · ${client.phone}` : ''}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    client.status === 'active'
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : 'bg-[#1a1f2c] text-[#4a4e5a]'
                  }`}
                >
                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
                {(client.loans_count ?? 0) > 0 && (
                  <span className="text-[10px] text-[#ada692]">
                    {client.loans_count} prestamo
                    {(client.loans_count ?? 0) === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {/* Editar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(client);
                }}
                className="ml-1 shrink-0 text-[#4a4e5a] hover:text-[#ada692]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>

              {/* Eliminar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(client);
                }}
                className="ml-1 shrink-0 text-[#4a4e5a] hover:text-red-400"
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
          ))}
        </div>
      )}

      {/* Ancla para scroll */}
      <div ref={endRef} />

      {/* ─── Modal crear/editar ─── */}
      {modalMode && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />

          <div className="relative w-full max-w-[460px] rounded-t-2xl bg-[#0e1218] px-5 pb-10 pt-5 max-h-[90dvh] overflow-y-auto md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {modalMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
              </h3>
              <button
                onClick={closeModal}
                className="text-[#ada692] hover:text-white"
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

            {formError && (
              <p className="mb-3 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {formError}
              </p>
            )}

            <div className="space-y-3">
              <Field label="Nombre *">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Ej. Juan"
                />
              </Field>

              <Field label="Apellido *">
                <input
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Ej. Perez"
                />
              </Field>

              <Field label="Cedula / DNI">
                <input
                  value={form.dni}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dni: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Ej. 001-0000000-0"
                />
              </Field>

              <Field label="Telefono">
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Ej. +1 809 555 0000"
                  type="tel"
                />
              </Field>

              <Field label="Correo electronico">
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="correo@ejemplo.com"
                  type="email"
                />
              </Field>

              <Field label="Fecha de nacimiento">
                <input
                  value={form.birth_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, birth_date: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  type="date"
                />
              </Field>

              <Field label="Direccion">
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Calle, ciudad..."
                />
              </Field>

              <Field label="Notas">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  className={INPUT_CLASS}
                  placeholder="Observaciones opcionales..."
                />
              </Field>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="mt-5 w-full rounded-full bg-[#d4b13c] py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {isSaving
                ? 'Guardando...'
                : modalMode === 'create'
                  ? 'Crear Cliente'
                  : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal eliminar ─── */}
      {deleting && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
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
              Eliminar cliente
            </h3>
            <p className="mb-5 text-sm text-[#ada692]">
              ¿Seguro que deseas eliminar a{' '}
              <span className="font-semibold text-white">
                {deleting.name} {deleting.last_name}
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