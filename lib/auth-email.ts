export function parseAllowedDomains() {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function normalizeLoginEmail(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  // Alias legacy permitidos
  if (domain === "bn-tic.es" || domain === "orbeformacion.com") {
    return `${local}@orbe.es`;
  }

  // Compatibilidad de dominio histórico de Entenova para login
  if (domain === "entenova-gnosis.com") {
    return `${local}@entenova.gnosis.com`;
  }

  return email;
}

export function isAllowedEmail(email: string) {
  const domains = parseAllowedDomains();
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domains.includes(domain);
}
