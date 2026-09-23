import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { getDashboard } from "../api/loans";
import { getReportSummary, getReportPayments } from "../api/reports";
import { formatCurrencyCompact, getGreeting, toISODate } from "../utils/format";

// ============================================================
// Tooltip personalizado para todos los gráficos (CB)
// ============================================================
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#2a2f3c] bg-[#0e1218] px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-[#ada692]">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.fill ?? entry.color ?? "#fff" }}>
          {entry.name}:{" "}
          <span className="font-bold">
            {formatCurrencyCompact(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ============================================================
// Card wrapper para gráficos (wB)
// ============================================================
function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-[#0d0f14] p-5">
      <p className="mb-4 text-[0.62rem] font-bold tracking-[0.14em] text-[#ada692]">
        {title}
      </p>
      {children}
    </div>
  );
}

// ============================================================
// KPI superior (DB)
// ============================================================
function KPI({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-[#0d0f14] px-4 py-3.5">
      <p className="text-[0.62rem] font-bold tracking-[0.14em] text-[#ada692]">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[1.8rem] font-bold leading-none text-[#d4b13c]">
          {value}
        </span>
        {sub && <span className="text-[0.8rem] text-[#ada692]">{sub}</span>}
      </div>
    </div>
  );
}

// ============================================================
// Card de cartera (OB)
// ============================================================
function CarteraCard({ icon, title, amount, sub, danger }) {
  return (
    <div className="rounded-2xl bg-[#0d0f14] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171c26] text-[#d4b13c]">
          {icon}
        </div>
        <span className="text-[0.9rem] text-[#c0bfbd]">{title}</span>
      </div>
      <p
        className={`mt-2 text-[2rem] font-bold leading-none ${
          danger ? "text-[#e05252]" : "text-white"
        }`}
      >
        {amount}
      </p>
      <p className="mt-1 text-[0.78rem] text-[#ada692]">{sub}</p>
    </div>
  );
}

// ============================================================
// Iconos (kB, AB, jB, MB, NB)
// ============================================================
const IconMoney = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
  </svg>
);

const IconTrendDown = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
  </svg>
);

const IconWarning = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 text-[#e05252]"
    fill="currentColor"
  >
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

const IconCard = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
  </svg>
);

// ============================================================
// Serie de cobros últimos 6 meses (SB)
// ============================================================
function buildMonthlySeries(payments) {
  const byMonth = {};
  payments.forEach((p) => {
    const key = p.payment_date.substring(0, 7); // YYYY-MM
    byMonth[key] = (byMonth[key] ?? 0) + p.amount;
  });

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      mes: d.toLocaleDateString("es", { month: "short" }),
      cobrado: Math.round(byMonth[key] ?? 0),
    };
  });
}

// ============================================================
// Página
// ============================================================
export default function Dashboard() {
  // Rango por defecto: últimos 6 meses hasta hoy
  const today = toISODate();
  const sixMonthsAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return toISODate(d);
  })();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const { data: summary } = useQuery({
    queryKey: ["report-summary"],
    queryFn: getReportSummary,
  });

  const { data: payments } = useQuery({
    queryKey: ["report-payments-6m", sixMonthsAgo, today],
    queryFn: () => getReportPayments(sixMonthsAgo, today),
  });

  // ─── Cálculos derivados ───
  const recoveryRate =
    data && data.loans.total_disbursed > 0
      ? (data.loans.total_collected / data.loans.total_disbursed) * 100
      : 0;

  const portfolioData = data
    ? [
        { name: "Cobrado", value: data.loans.total_collected, fill: "#34d399" },
        { name: "Pendiente", value: data.loans.total_pending, fill: "#d4b13c" },
        { name: "Vencido", value: data.overdue.total_amount, fill: "#f87171" },
      ].filter((d) => d.value > 0)
    : [];

  const clientsData = summary
    ? [
        { name: "Activos", value: summary.clients.active, fill: "#34d399" },
        { name: "Inactivos", value: summary.clients.inactive, fill: "#4a4e5a" },
      ].filter((d) => d.value > 0)
    : [];

  const loansByStatus = summary
    ? [
        { name: "Activos", value: summary.loans.active, fill: "#34d399" },
        { name: "Pagados", value: summary.loans.paid, fill: "#60a5fa" },
        { name: "En mora", value: summary.loans.defaulted, fill: "#f87171" },
        { name: "Cancelados", value: summary.loans.cancelled, fill: "#4a4e5a" },
      ]
    : [];

  const monthlySeries = payments ? buildMonthlySeries(payments) : [];
  const showAnalytics = (summary || payments) && !isLoading;

  return (
    <div className="px-4 py-5 text-[#d5d5d7]">
      <h1 className="text-[2rem] font-bold leading-tight text-white">
        {getGreeting()}
      </h1>
      <p className="mt-1 text-[0.92rem] text-[#ada692]">
        Aquí tienes el resumen ejecutivo de hoy.
      </p>

      {isLoading && (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d4b13c] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="mt-6 rounded-xl bg-red-900/30 p-4 text-center text-sm text-red-400">
          Error al cargar el dashboard.
        </div>
      )}

      {data && (
        <>
          {/* ─── KPIs superiores ─── */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <KPI
              label="CLIENTES ACTIVOS"
              value={String(data.clients.active)}
              sub={`${data.clients.total} totales`}
            />
            <KPI label="PRÉSTAMOS ACTIVOS" value={String(data.loans.active)} />
            <KPI
              label="RECUPERACIÓN"
              value={`${recoveryRate.toFixed(1)}%`}
              sub="↗"
            />
          </div>

          {/* ─── Cobros de hoy ─── */}
          <div className="mt-4 rounded-2xl border border-[#d4b13c]/55 bg-[#0d0f14] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[0.62rem] font-bold tracking-[0.14em] text-[#d4b13c]">
                COBROS DE HOY
              </span>
              <span className="text-[#d4b13c]/60">
                <IconCard />
              </span>
            </div>
            <p className="mt-2 text-[2.4rem] font-extrabold leading-none text-white">
              {formatCurrencyCompact(data.payments.amount_today)}
            </p>
          </div>

          {/* ─── Resumen de cartera ─── */}
          <p className="mt-6 text-[0.62rem] font-bold tracking-[0.14em] text-[#ada692]">
            RESUMEN DE CARTERA
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <CarteraCard
              icon={<IconMoney />}
              title="Capital Prestado"
              amount={formatCurrencyCompact(data.loans.total_disbursed)}
              sub="Total histórico emitido"
            />
            <CarteraCard
              icon={<IconTrendDown />}
              title="Recuperado"
              amount={formatCurrencyCompact(data.loans.total_collected)}
              sub="Capital retornado a caja"
            />
            <CarteraCard
              icon={<IconClock />}
              title="Pendiente"
              amount={formatCurrencyCompact(data.loans.total_pending)}
              sub="En proceso de cobro activo"
            />
            <CarteraCard
              icon={<IconWarning />}
              title="Vencido"
              amount={formatCurrencyCompact(data.overdue.total_amount)}
              sub="En mora"
              danger
            />
          </div>

          {/* ─── Analítica ─── */}
          {showAnalytics && (
            <div className="mt-8">
              <p className="mb-4 text-[0.62rem] font-bold tracking-[0.14em] text-[#ada692]">
                ANALÍTICA
              </p>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Distribución de cartera */}
                {portfolioData.length > 0 && (
                  <ChartCard title="DISTRIBUCIÓN DE CARTERA">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={portfolioData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={78}
                          dataKey="value"
                          paddingAngle={3}
                        >
                          {portfolioData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.fill}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
                      {portfolioData.map((entry) => (
                        <span
                          key={entry.name}
                          className="flex items-center gap-1.5 text-[11px] text-[#ada692]"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: entry.fill }}
                          />
                          {entry.name}
                        </span>
                      ))}
                    </div>
                  </ChartCard>
                )}

                {/* Estado de clientes */}
                {clientsData.length > 0 && (
                  <ChartCard title="ESTADO DE CLIENTES">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={clientsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={78}
                          dataKey="value"
                          paddingAngle={3}
                        >
                          {clientsData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.fill}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-1 flex justify-center gap-6">
                      {clientsData.map((entry) => (
                        <span
                          key={entry.name}
                          className="flex flex-col items-center gap-0.5"
                        >
                          <span
                            className="text-xl font-bold"
                            style={{ color: entry.fill }}
                          >
                            {entry.value}
                          </span>
                          <span className="text-[11px] text-[#ada692]">
                            {entry.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  </ChartCard>
                )}

                {/* Préstamos por estado (barras horizontales) */}
                {loansByStatus.length > 0 && (
                  <ChartCard title="PRÉSTAMOS POR ESTADO">
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart
                        data={loansByStatus}
                        layout="vertical"
                        margin={{ left: 0, right: 20, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid horizontal={false} stroke="#1a1f2c" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={72}
                          tick={{ fill: "#ada692", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "#1a1f2c" }}
                        />
                        <Bar
                          dataKey="value"
                          name="Cantidad"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={18}
                        >
                          {loansByStatus.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>

              {/* Total de préstamos (efectivo) por mes */}
              {data.loans.by_month?.length > 0 && (
                <div className="mt-4">
                  <ChartCard title="TOTAL PRESTADO POR MES">
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart
                        data={data.loans.by_month.map((item) => ({
                          mes: new Date(item.month + "-01").toLocaleDateString(
                            "es",
                            {
                              month: "short",
                              timeZone: "UTC",
                            },
                          ),
                          total: Number(item.total),
                        }))}
                        margin={{ left: 8, right: 8, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid vertical={false} stroke="#1a1f2c" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fill: "#ada692", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={formatCurrencyCompact}
                          tick={{ fill: "#4a4e5a", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "#1a1f2c" }}
                        />
                        <Bar
                          dataKey="total"
                          name="Prestado"
                          fill="#60a5fa"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={52}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}

              {/* Cobros últimos 6 meses */}
              {monthlySeries.some((m) => m.cobrado > 0) && (
                <div className="mt-4">
                  <ChartCard title="COBROS ÚLTIMOS 6 MESES">
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart
                        data={monthlySeries}
                        margin={{ left: 8, right: 8, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid vertical={false} stroke="#1a1f2c" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fill: "#ada692", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={formatCurrencyCompact}
                          tick={{ fill: "#4a4e5a", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "#1a1f2c" }}
                        />
                        <Bar
                          dataKey="cobrado"
                          name="Cobrado"
                          fill="#d4b13c"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={52}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
