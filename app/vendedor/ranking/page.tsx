export default function VendedorRankingPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#FF6A00]">
          Ranking
        </p>
        <h2 className="mt-1 text-2xl font-black">Mi posición en ranking</h2>
        <p className="mt-2 text-sm text-black/65">
          Aquí podrás revisar tu desempeño en las distintas categorías del sistema.
        </p>
      </div>

      <div className="rounded-3xl border border-dashed border-black/15 bg-[#FCFCFC] p-8 text-center">
        <p className="text-lg font-black">Espacio listo para conectar tu ranking</p>
        <p className="mt-2 text-sm text-black/60">
          Aquí puedes renderizar el componente que ya vienes construyendo para posición,
          indicadores y categorías.
        </p>
      </div>
    </div>
  );
}