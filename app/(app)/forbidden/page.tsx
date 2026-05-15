import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "403"
};

export default function ForbiddenPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
      <p className="text-sm font-semibold text-red-600">403</p>
      <h1 className="mt-2 text-2xl font-bold">No autorizado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No tienes permiso para ver esta sección.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        No tienes permiso para acceder a esta sección. Si crees que es un error, contacta con un administrador.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md border px-4 py-2 text-sm">
        Volver al tablero
      </Link>
    </section>
  );
}
