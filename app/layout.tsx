// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "SIANA Vital",
  description: "Plataforma comercial multiusuario",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-950">
        {children}
      </body>
    </html>
  );
}