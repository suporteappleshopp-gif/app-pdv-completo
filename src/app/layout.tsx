import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDV Operador - Ponto de Venda",
  description: "Sistema completo de PDV para desktop e tablets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="/env-config.js" async></script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
