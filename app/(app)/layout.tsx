import { AppHeader } from "@/components/layout/app-header";
import { GlobalCommandPalette } from "@/components/layout/global-command-palette";
import { requireCurrentPageUser } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentPageUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        empresaNombre={user.empresa.nombre ?? "Mi empresa"}
        empresaColor={user.empresa.color}
        userEmail={user.email ?? ""}
        userName={user.nombre ?? user.name ?? user.email ?? "Usuario"}
        isAdmin={user.rol === "ADMIN"}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <GlobalCommandPalette />
    </div>
  );
}
