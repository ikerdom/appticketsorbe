import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BienvenidaMarkSeen } from "@/components/layout/bienvenida-mark-seen";

export const metadata: Metadata = {
  title: "Bienvenida"
};

const secciones = [
  {
    titulo: "🔑 Cómo entrar",
    texto:
      "Introduce tu correo de empresa y la contraseña que te ha dado el administrador. Si no tienes cuenta, pídesela."
  },
  {
    titulo: "🎫 Cómo crear un ticket",
    texto:
      "Pulsa '+ Nuevo ticket de incidencia'. Lo más importante es elegir bien a qué empresa va dirigida la incidencia. Describe el problema con claridad."
  },
  {
    titulo: "🏢 A quién se manda",
    texto:
      "Los tickets se envían a una empresa, no a una persona. Cualquier miembro de esa empresa puede hacerse cargo. Si quieres, puedes asignar a alguien concreto (opcional)."
  },
  {
    titulo: "👀 Qué verás",
    texto:
      "Verás los tickets de tu empresa: los que vosotros habéis enviado y los que os han mandado. Los administradores ven todos."
  },
  {
    titulo: "🔄 Cómo evoluciona",
    texto:
      "Arrastra las tarjetas entre columnas: Abierto → En curso → Resuelto. Dentro del ticket hay un chat de evolución para ir comentando avances."
  },
  {
    titulo: "🔍 Buscar rápido",
    texto:
      "Pulsa Ctrl+K (o Cmd+K en Mac) desde cualquier pantalla para buscar un ticket al instante."
  }
];

export default function BienvenidaPage() {
  return (
    <section className="space-y-4">
      <BienvenidaMarkSeen />
      <h1 className="text-2xl font-bold">Guía de uso</h1>
      <p className="text-sm text-muted-foreground">Referencia rápida para trabajar con Tickets de Incidencia.</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {secciones.map((seccion) => (
          <Card key={seccion.titulo}>
            <CardHeader>
              <CardTitle className="text-lg">{seccion.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{seccion.texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-900">
        <p>
          💡 Idea: la app funciona como un panel compartido entre las empresas. Todo lo que ocurra con un ticket queda
          registrado y visible para ambas partes. No hace falta mandar correos: la conversación vive aquí dentro.
        </p>
      </div>
    </section>
  );
}
