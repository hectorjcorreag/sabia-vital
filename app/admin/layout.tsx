// app/admin/layout.tsx

import AppShell from "@/components/layout/AppShell";
import { adminMenu } from "@/config/menus";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell menu={adminMenu} roleLabel="Administrador">
      {children}
    </AppShell>
  );
}