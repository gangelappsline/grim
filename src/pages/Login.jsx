import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login, saveSession } from '../api/auth';
import logoUrl from '../assets/logo-DJ8zmtf5.webp';
// ↑ Si no tienes el archivo, muévelo a /public/assets/ y usa:
// src="/assets/logo-DJ8zmtf5.webp"

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      saveSession(data);
      navigate('/', { replace: true });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({ email: email.trim(), password });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06080d] text-[#d5d5d7]">
      {/* Brillo decorativo superior-izquierdo */}
      <div
        className="pointer-events-none absolute -left-20 top-14 h-36 w-72 rotate-[-22deg] bg-gradient-to-r from-white/20 via-slate-500/10 to-transparent blur-2xl"
        aria-hidden="true"
      />
      {/* Brillo decorativo inferior-derecho */}
      <div
        className="pointer-events-none absolute -right-20 bottom-48 h-36 w-72 rotate-[-22deg] bg-gradient-to-r from-white/15 via-slate-500/10 to-transparent blur-2xl"
        aria-hidden="true"
      />

      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* ─── Panel izquierdo (solo en lg+) ─── */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:items-center lg:justify-center lg:gap-8 lg:border-r lg:border-[#1a1f2c] lg:px-16">
          <img src={logoUrl} alt="GRIM" className="w-80 object-contain" />
          <p className="max-w-xs text-center text-base leading-relaxed text-[#ada692]">
            Sistema de gestión financiera seguro y eficiente para el control de préstamos y cartera.
          </p>
          <div className="flex gap-6 text-[0.8rem] text-[#4a4e5a]">
            <span>Clientes</span>
            <span>·</span>
            <span>Préstamos</span>
            <span>·</span>
            <span>Cobros</span>
            <span>·</span>
            <span>Reportes</span>
          </div>
        </div>

        {/* ─── Panel derecho / formulario ─── */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-8 sm:px-6">
          <header className="w-full max-w-[460px] text-center lg:hidden">
            <img
              src={logoUrl}
              alt="GRIM"
              className="mx-auto w-[min(82vw,330px)] max-w-full object-contain"
            />
          </header>

          <section
            className="w-full max-w-[460px] rounded-3xl border border-[#d4b13c]/35 bg-gradient-to-b from-black/90 to-[#04070b]/95 px-5 py-6 shadow-[0_20px_45px_rgba(0,0,0,0.55)]"
            aria-label="Acceso seguro"
          >
            <form className="mt-2 grid gap-3" onSubmit={handleSubmit}>
              <label
                htmlFor="identity"
                className="text-[1.08rem] font-semibold text-[#e0e0e2]"
              >
                Correo o usuario
              </label>
              <input
                id="identity"
                type="text"
                placeholder="Ej: juan.perez@grim.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#d4b13c]/25 bg-[#212126]/80 px-4 py-4 text-[1.04rem] text-[#c5beab] outline-none transition placeholder:text-[#a89f86]/50 focus:border-[#e8c34f]/80 focus:ring-2 focus:ring-[#d4b13c]/30"
              />

              <div className="mt-2 flex items-baseline justify-between gap-3">
                <label
                  htmlFor="password"
                  className="text-[1.08rem] font-semibold text-[#e0e0e2]"
                >
                  Contraseña
                </label>
                <a
                  href="#"
                  className="text-[0.95rem] font-semibold text-[#e8c84f] underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                id="password"
                type="password"
                placeholder="........"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#d4b13c]/25 bg-[#212126]/80 px-4 py-4 text-[1.04rem] text-[#c5beab] outline-none transition placeholder:text-[#a89f86]/50 focus:border-[#e8c34f]/80 focus:ring-2 focus:ring-[#d4b13c]/30"
              />

              {mutation.error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-950/60 px-4 py-2.5 text-[0.9rem] font-medium text-red-400 border border-red-800/40"
                >
                  Credenciales incorrectas. Verifica tu usuario y contraseña.
                </p>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="mt-7 rounded-2xl bg-gradient-to-b from-[#d5b23d] to-[#c6a131] py-4 text-[1.62rem] font-extrabold tracking-[0.13em] text-[#503f11] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  'INICIAR SESIÓN'
                )}
              </button>
            </form>
          </section>

          <footer className="w-full max-w-[460px] pb-1 text-center text-[#ada692]">
            <p className="text-[1.03rem]">
              ¿Nuevo en GRIM?{' '}
              <a
                href="#"
                className="font-semibold text-[#e3be49] underline-offset-4 hover:underline"
              >
                Crear cuenta
              </a>
            </p>
            <nav
              aria-label="Enlaces legales"
              className="mt-4 flex items-center justify-center gap-3 text-[0.95rem]"
            >
              <a href="#" className="underline-offset-4 hover:underline">
                Política de privacidad
              </a>
              <span aria-hidden="true">•</span>
              <a href="#" className="underline-offset-4 hover:underline">
                Términos de seguridad
              </a>
            </nav>
          </footer>
        </div>
      </div>
    </main>
  );
}