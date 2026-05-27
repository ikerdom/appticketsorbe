export const ACTIVE_COMPANIES = [
  { nombre: "Editorial CEP", dominio: "editorialcep.com", color: "#D946EF" },
  { nombre: "Entenova", dominio: "entenova.com", color: "#0EA5A4" },
  { nombre: "ORBE", dominio: "orbe.es", color: "#EA580C" },
  { nombre: "Veprix", dominio: "veprix.com", color: "#059669" }
] as const;

export const LEGACY_DOMAIN_TO_ACTIVE: Record<string, string> = {
  "bn-tic.es": "orbe.es",
  "orbeformacion.com": "orbe.es",
  "entenova-gnosis.com": "entenova.gnosis.com",
  "grupocep.es": "editorialcep.com",
  "grupocep.eu": "editorialcep.com"
};

export function resolveActiveDomain(domain: string) {
  return LEGACY_DOMAIN_TO_ACTIVE[domain] ?? domain;
}

// Para buscar usuarios creados con la normalización antigua (guión → punto)
const LEGACY_EMAIL_DOMAIN: Record<string, string> = {
  "entenova-gnosis.com": "entenova.gnosis.com"
};

export function legacyNormalizeEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const mapped = LEGACY_EMAIL_DOMAIN[domain] ?? domain;
  return `${local}@${mapped}`;
}

export function companyFromDomain(rawDomain: string) {
  const domain = resolveActiveDomain(rawDomain.toLowerCase());
  const company = ACTIVE_COMPANIES.find((item) => item.dominio === domain);
  if (company) return company;

  return {
    nombre: domain.split(".")[0]?.toUpperCase() || domain,
    dominio: domain,
    color: "#64748b"
  };
}
