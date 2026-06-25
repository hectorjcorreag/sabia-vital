// config/menus.ts

export type MenuItem = {
  label: string;
  href: string;
};

export const adminMenu: MenuItem[] = [
  { label: "Panel general", href: "/admin" },
  { label: "Usuarios", href: "/admin/usuarios" },
  { label: "Vendedores", href: "/admin/vendedores" },
  { label: "Distribuidores", href: "/admin/distribuidores" },
  { label: "Mercaderistas", href: "/admin/mercaderistas" },
  { label: "Clientes", href: "/admin/clientes" },
  { label: "Visitas", href: "/admin/visitas" },
  { label: "Ventas", href: "/admin/ventas" },
  { label: "Ranking", href: "/admin/ranking" },
  { label: "Configuración", href: "/admin/configuracion" },
];

export const vendedorMenu: MenuItem[] = [
  { label: "Mi panel", href: "/vendedor" },
  { label: "Clientes", href: "/vendedor/clientes" },
  { label: "Visitas", href: "/vendedor/visitas" },
  { label: "Ventas", href: "/vendedor/ventas" },
  { label: "Ranking", href: "/vendedor/ranking" },
  { label: "Mi perfil", href: "/vendedor/perfil" },
];

export const distribuidorMenu: MenuItem[] = [
  { label: "Mi panel", href: "/distribuidor" },
  { label: "Mis vendedores", href: "/distribuidor/vendedores" },
  { label: "Ventas", href: "/distribuidor/ventas" },
  { label: "Ranking", href: "/distribuidor/ranking" },
  { label: "Reportes", href: "/distribuidor/reportes" },
  { label: "Mi perfil", href: "/distribuidor/perfil" },
];

export const mercaderistaMenu: MenuItem[] = [
  { label: "Mi panel", href: "/mercaderista" },
  { label: "Rutas", href: "/mercaderista/rutas" },
  { label: "Visitas", href: "/mercaderista/visitas" },
  { label: "Evidencias", href: "/mercaderista/evidencias" },
  { label: "Mi perfil", href: "/mercaderista/perfil" },
];