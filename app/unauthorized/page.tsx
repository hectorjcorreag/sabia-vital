// app/page.tsx
import Link from "next/link";

const values = ["Lealtad", "Fe", "Consistencia", "Autenticidad", "Sinergia"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Minimal background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#0B3D91]/10 blur-3xl" />
        <div className="absolute -bottom-48 right-[-140px] h-[520px] w-[520px] rounded-full bg-[#FF6A00]/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-[#F7F9FF]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logos (opcional) */}
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm">
                <span className="text-sm font-black text-[#0B3D91]">SV</span>
              </div>
              <div className="h-8 w-px bg-black/15" />
              <div className="leading-tight">
                <p className="text-sm font-black">Siana Vital</p>
                <p className="text-[11px] font-semibold text-black/55">Ecosistema PUES</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#proposito"
              className="hidden rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold text-black shadow-sm transition hover:bg-black/5 md:inline-flex"
            >
              Propósito
            </a>
            <a
              href="#valores"
              className="hidden rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold text-black shadow-sm transition hover:bg-black/5 md:inline-flex"
            >
              Valores
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-[#0B3D91] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:opacity-95"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-extrabold text-black/70 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#FF6A00]" />
              SIANA VITAL · Libertad · Propósito · Metas
            </span>

            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
              Entrena tu disciplina,
              <br />
              <span className="text-[#0B3D91]">conquista</span> tus metas.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/70 md:text-base">
              En <b>Siana Vital</b> encuentras tu libertad: nos conectamos y nos comprometemos contigo para ayudarte a
              desarrollar tu potencial, lograr metas y encontrar propósito.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-[#FF6A00] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:opacity-95"
              >
                Acceder al panel
              </Link>

              <a
                href="#proposito"
                className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-white px-5 py-3 text-sm font-extrabold text-black shadow-sm transition hover:bg-black/5"
              >
                Conoce nuestra misión
              </a>
            </div>

            <p className="mt-4 text-xs font-semibold text-black/55">
              Acceso privado por roles (Admin / Vendedores). Sin registro público.
            </p>
          </div>

          {/* Right minimal card */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
            <p className="text-xs font-black uppercase tracking-wide text-black/60">Enfoque</p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-black/10 p-4">
                <p className="text-sm font-black">Indicadores claros</p>
                <p className="mt-2 text-xs text-black/65">
                  “Los números y los promedios respaldan la fe”. Medimos por rangos para mejorar decisiones.
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 p-4">
                <p className="text-sm font-black">Equipos sólidos</p>
                <p className="mt-2 text-xs text-black/65">
                  Formación y acompañamiento con cultura de alto rendimiento: disciplina, seguimiento y resultados.
                </p>
              </div>

              <div className="rounded-2xl bg-black p-4 text-white">
                <p className="text-sm font-black">Ranking + Tableros</p>
                <p className="mt-2 text-xs text-white/75">
                  Índice PRO por vendedor y distribuidor: efectivas, reset, ventas, promedio por cita y referidos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section id="proposito" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[#0B3D91]/20 bg-[#0B3D91]/5 p-6 shadow-sm">
            <p className="text-xs font-black tracking-wide text-black/60">MISIÓN</p>
            <h2 className="mt-2 text-lg font-black">En Siana Vital encuentras tu libertad</h2>
            <p className="mt-2 text-sm leading-relaxed text-black/70">
              Porque nos conectamos y nos comprometemos contigo, ayudándote a desarrollar tu potencial, a lograr tus metas
              y encontrar tu propósito de vida.
            </p>
          </div>

          <div className="rounded-3xl border border-[#FF6A00]/20 bg-[#FF6A00]/5 p-6 shadow-sm">
            <p className="text-xs font-black tracking-wide text-black/60">VISIÓN</p>
            <h2 className="mt-2 text-lg font-black">Seremos un territorio único</h2>
            <p className="mt-2 text-sm leading-relaxed text-black/70">
              En constante expansión, con equipos sólidos de alto rendimiento, enfocados en la formación y entrenamiento
              de líderes que logran sus metas y llevan a otros a desarrollar su potencial.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="valores" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-black/60">VALORES</p>
              <h2 className="mt-2 text-2xl font-black">Carácter que sostiene resultados</h2>
              <p className="mt-2 max-w-2xl text-sm text-black/70">
                El valor sostiene el hábito; el hábito sostiene el resultado. Eso es alto rendimiento.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-extrabold text-black/70 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#0B3D91]" />
              Cultura de equipo
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {values.map((v) => (
              <span
                key={v}
                className="rounded-full border border-black/10 bg-[#F7F9FF] px-4 py-2 text-sm font-extrabold text-black/80"
              >
                {v}
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-black">Disciplina</p>
              <p className="mt-2 text-xs text-black/65">Hacemos lo correcto incluso cuando nadie está mirando.</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-black">Seguimiento</p>
              <p className="mt-2 text-xs text-black/65">Indicadores por rango para decidir mejor cada semana.</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-black">Crecimiento</p>
              <p className="mt-2 text-xs text-black/65">Entrenamos líderes que construyen equipos y sostienen resultados.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
          <div>
            <p className="text-sm font-black">Siana Vital</p>
            <p className="mt-2 text-sm text-black/70">Libertad · Propósito · Metas</p>
            <p className="mt-3 text-xs text-black/55">Panel privado (Admin / Vendedores).</p>
          </div>

          <div>
            <p className="text-sm font-black">Ubicación</p>
            <p className="mt-2 text-sm text-black/70">
              Calle 15 # 13b-31 · Barrio Floresta
              <br />
              Edificio San Marcos · Local 03
              <br />
              La Ceja, Antioquia
            </p>
          </div>

          <div>
            <p className="text-sm font-black">Contacto</p>
            <p className="mt-2 text-sm text-black/70">+57 302 439 7944</p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-[#0B3D91] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:opacity-95"
              >
                Iniciar sesión
              </Link>
              <a
                href="#proposito"
                className="inline-flex items-center justify-center rounded-2xl border border-black/15 bg-white px-5 py-3 text-sm font-extrabold text-black shadow-sm hover:bg-black/5"
              >
                Propósito
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-black/10 py-4">
          <p className="text-center text-xs text-black/50">
            © {new Date().getFullYear()} Siana Vital SAS · Ecosistema PUES
          </p>
        </div>
      </footer>
    </main>
  );
}