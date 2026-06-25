// app/mercaderista/layout.tsx

import AppShell from "@/components/layout/AppShell";
import { mercaderistaMenu } from "@/config/menus";

export default function MercaderistaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell menu={mercaderistaMenu} roleLabel="Mercaderista">
      {children}
    </AppShell>
  );
}