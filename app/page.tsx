import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8fc] text-slate-950">
      <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f4f8fc_42%,#ffffff_100%)]" />

        <div className="absolute left-[-120px] top-[-120px] -z-10 h-72 w-72 rounded-full bg-[#0B3D91]/10 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute bottom-[-140px] right-[-120px] -z-10 h-72 w-72 rounded-full bg-[#0B3D91]/10 blur-3xl sm:h-96 sm:w-96" />

        <div className="w-full max-w-6xl">
          <div className="mx-auto rounded-[2rem] border border-white/80 bg-white/85 px-5 py-8 text-center shadow-2xl shadow-blue-950/10 backdrop-blur sm:px-8 sm:py-10 md:px-12 lg:px-16">
            <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:h-28 sm:w-28">
                <Image
                  src="/brand/siana-vital.png"
                  alt="Logo SIANA Vital"
                  width={120}
                  height={120}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="hidden h-16 w-px bg-slate-200 sm:block" />

              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:h-28 sm:w-28">
                <Image
                  src="/brand/pues2.png"
                  alt="Logo PUES"
                  width={120}
                  height={120}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#0B3D91] sm:text-sm">
              SIANA Vital · Ecosistema PUES
            </p>

            <h1 className="mx-auto mt-5 max-w-4xl text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-6xl">
              Plataforma comercial multiusuario
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-pretty text-sm leading-7 text-slate-600 sm:text-base md:text-lg md:leading-8">
              Gestiona vendedores, distribuidores, mercaderistas, visitas,
              ventas, clientes y rankings desde un entorno moderno, seguro y
              organizado por roles.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#0B3D91] px-8 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-[#092f70] focus:outline-none focus:ring-4 focus:ring-[#0B3D91]/25 sm:w-auto"
              >
                Iniciar sesión
                <span className="ml-3">→</span>
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#0B3D91]">
                  Administrador
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Control general de usuarios, roles, ventas, visitas y
                  reportes.
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#0B3D91]">Vendedor</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Gestión comercial, clientes asignados, visitas, ventas y
                  ranking.
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#0B3D91]">
                  Mercaderista
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Seguimiento en punto de venta, rutas, evidencias y visitas.
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-[#0B3D91]">
                  Distribuidor
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Consulta de desempeño, fuerza de ventas, reportes y ranking.
                </p>
              </article>
            </div>

            <footer className="mt-10 border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold leading-6 text-slate-400">
                Gestión comercial inteligente · Acceso seguro por roles ·
                Tecnología para equipos comerciales
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}