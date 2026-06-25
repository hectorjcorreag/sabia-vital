"use client";

import Link from "next/link";

export default function ConfiguracionPage() {
  const items = [
    {
      title: "Usuarios",
      desc: "Ver usuarios registrados, asignar rol/estado y vincularlos a vendedores.",
      href: "/dashboard/admin/configuracion/usuarios",
      icon: "👤",
    },
    {
      title: "Distribuidores",
      desc: "Listar, crear y editar distribuidores para asignarlos a vendedores.",
      href: "/dashboard/admin/configuracion/distribuidores",
      icon: "🏢",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black">Configuración</h1>
        <p className="text-sm text-black/60">
          Administración de datos base del sistema.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow transition"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{c.icon}</div>
              <div>
                <div className="text-lg font-extrabold">{c.title}</div>
                <div className="text-sm text-black/60">{c.desc}</div>
                <div className="mt-3 text-sm font-black text-blue-700">
                  Entrar →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}