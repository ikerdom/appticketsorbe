import type { Metadata } from "next";
import "./globals.css";
import { SonnerProvider } from "@/components/layout/sonner-provider";
import { PwaRegister } from "@/components/layout/pwa-register";

export const metadata: Metadata = {
  title: {
    template: "Incidencia - %s",
    default: "Incidencia - Tickets de Incidencia"
  },
  description: "Sistema de tickets de incidencias multiempresa",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <SonnerProvider />
        <PwaRegister />
      </body>
    </html>
  );
}
