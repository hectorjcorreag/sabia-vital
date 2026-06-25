export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">
          Panel administrativo
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-900">
          Bienvenido al panel de administrador
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          Desde aquí podrás gestionar usuarios, vendedores, distribuidores,
          mercaderistas, clientes, visitas, ventas y reportes generales.
        </p>
      </section>
    </div>
  );
}