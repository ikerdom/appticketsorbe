export interface NotificationTemplateInput {
  ticketNumero: number;
  titulo: string;
  mensaje: string;
}

export function incidenciaNotificationText({ ticketNumero, titulo, mensaje }: NotificationTemplateInput) {
  return `[Incidencia #${String(ticketNumero).padStart(3, "0")}] ${titulo} · ${mensaje}`;
}
