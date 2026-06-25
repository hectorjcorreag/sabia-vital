// app/vendedor/layout.tsx

import AppShell from "@/components/layout/AppShell";
import { vendedorMenu } from "@/config/menus";

export default function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell menu={vendedorMenu} roleLabel="Vendedor">
      {children}
    </AppShell>
  );
}