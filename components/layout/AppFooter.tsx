// components/layout/AppFooter.tsx

export default function AppFooter() {
  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-black/55">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0B3D91]" />
                Siana Vital <span className="text-black/35">®</span>
              </span>

              <span className="text-black/25">·</span>

              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#FF6A00]" />
                PUES <span className="text-black/35">®</span>
              </span>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-black/60">
            <p className="font-extrabold text-black/75">Contacto</p>

            <div className="mt-1 space-y-0.5">
              <p>Calle 15 # 13B-31</p>
              <p>Barrio Floresta · Edificio San Marcos · Local 03</p>
              <p>La Ceja, Antioquia</p>

              <p className="mt-2">
                <span className="text-black/45">Tel:</span>{" "}
                <a
                  href="tel:+573024397944"
                  className="font-extrabold text-[#0B3D91] hover:underline"
                >
                  302 439 7944
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold text-black/40">
            © {new Date().getFullYear()} Siana Vital. Todos los derechos reservados.
          </p>

          <p className="text-[11px] font-semibold text-black/40">
            Acceso por roles: Admin / Vendedor / Mercaderista / Distribuidor
          </p>
        </div>
      </div>
    </footer>
  );
}