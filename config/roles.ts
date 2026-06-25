export const ROLES = {
  ADMIN: "administrador",
  VENDEDOR: "vendedor",
  MERCADERISTA: "mercaderista",
  DISTRIBUIDOR: "distribuidor",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];