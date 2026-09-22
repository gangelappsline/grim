import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';

const menuItems = [
  {
    path: '/',
    label: 'Inicio',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
      </svg>
    ),
  },
  {
    path: '/clientes',
    label: 'Clientes',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
  {
    path: '/prestamos',
    label: 'Préstamos',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    ),
  },
  {
    path: '/calendario',
    label: 'Calendario',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
      </svg>
    ),
  },
  {
    path: '/reportes',
    label: 'Reportes',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
      </svg>
    ),
  },
];

// Rutas donde se oculta el header móvil (detalle de préstamo)
const HIDE_MOBILE_ROUTES = ['/prestamos/'];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hideMobileChrome = HIDE_MOBILE_ROUTES.some(
    (prefix) =>
      location.pathname.startsWith(prefix) &&
      location.pathname !== '/prestamos'
  );

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function isActive(path) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  function handleNavigate(path) {
    navigate(path);
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-[#060a10]">
      {/* Overlay para móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-[#1a1f2c] bg-[#0e1218] transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1a1f2c] px-5">
          <span className="text-base font-extrabold tracking-widest text-[#d4b13c]">
            GRIM
          </span>
          {/* Botón cerrar (solo móvil) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[#ada692] hover:text-white md:hidden"
            title="Cerrar menú"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                title={item.label}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#d4b13c]/15 text-[#d4b13c]'
                    : 'text-[#ada692] hover:bg-[#1a1f2c] hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[#1a1f2c] px-2 py-3">
          <button
            onClick={handleLogout}
            title="Salir"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#ada692] transition-colors hover:bg-[#1a1f2c] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              fill="currentColor"
            >
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* ─── Contenido principal ─── */}
      <div className="flex flex-1 flex-col md:ml-56">
        {/* Header móvil con botón hamburguesa */}
        {!hideMobileChrome && (
          <header className="flex items-center justify-between px-4 py-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-lg p-2 text-[#d4b13c] hover:bg-[#1a1f2c]"
              title="Abrir menú"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              </svg>
            </button>
            <span className="text-base font-extrabold tracking-widest text-[#d4b13c]">
              GRIM
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full bg-[#0e1218] px-3 py-1.5 text-xs font-semibold text-[#ada692]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Salir
            </button>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}