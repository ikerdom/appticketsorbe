export const CORPORATE_DOMAINS = [
  "editorialcep.com",
  "entenova.com",
  "entenova.gnosis.com",
  "orbe.es",
  "veprix.com"
] as const;

export const LEGACY_DOMAINS = ["bn-tic.es", "orbeformacion.com", "entenova-gnosis.com"] as const;

const LEGACY_TO_ACTIVE_DOMAIN: Record<string, string> = {
  "orbeformacion.com": "orbe.es",
  "entenova-gnosis.com": "entenova.gnosis.com"
};

const DOMAIN_TO_EMPRESA: Record<string, string> = {
  "editorialcep.com": "Editorial CEP",
  "entenova.com": "Entenova",
  "entenova.gnosis.com": "Entenova",
  "entenova-gnosis.com": "Entenova",
  "orbe.es": "ORBE",
  "bn-tic.es": "ORBE",
  "orbeformacion.com": "ORBE",
  "veprix.com": "Veprix"
};

export function parseAllowedDomains() {
  const envDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (envDomains.length > 0) return envDomains;
  return [...CORPORATE_DOMAINS, ...LEGACY_DOMAINS];
}

export function isEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function parseEmailDomain(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const domain = email.split("@")[1]?.trim().toLowerCase() ?? "";
  return domain;
}

export function normalizeLoginEmail(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const normalizedDomain = LEGACY_TO_ACTIVE_DOMAIN[domain] ?? domain;
  return `${local}@${normalizedDomain}`;
}

export function isAllowedDomain(domain: string) {
  return parseAllowedDomains().includes(domain.trim().toLowerCase());
}

export function isAllowedEmail(email: string) {
  return isAllowedDomain(parseEmailDomain(email));
}

export function detectEmpresaFromDomain(domain: string) {
  return DOMAIN_TO_EMPRESA[domain.toLowerCase()] ?? null;
}
