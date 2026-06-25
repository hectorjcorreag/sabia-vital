export type AppRole =
  | "administrador"
  | "vendedor"
  | "distribuidor"
  | "mercaderista";

export const dashboardRoutes: Record<AppRole, string> = {
  administrador: "/admin",
  vendedor: "/vendedor",
  distribuidor: "/distribuidor",
  mercaderista: "/mercaderista",
};

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;

  const cleanRole = role.toLowerCase().trim();

  if (cleanRole === "administrador" || cleanRole === "admin") {
    return "administrador";
  }

  if (cleanRole === "vendedor" || cleanRole === "seller") {
    return "vendedor";
  }

  if (cleanRole === "distribuidor" || cleanRole === "distributor") {
    return "distribuidor";
  }

  if (cleanRole === "mercaderista") {
    return "mercaderista";
  }

  return null;
}

export function getDashboardRouteByRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return "/pendiente";
  }

  return dashboardRoutes[normalizedRole];
}