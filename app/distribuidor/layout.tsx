// app/distribuidor/layout.tsx

import AppShell from "@/components/layout/AppShell";
import { distribuidorMenu } from "@/config/menus";

export default function DistribuidorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell menu={distribuidorMenu} roleLabel="Distribuidor">
      {children}
    </AppShell>
  );
}