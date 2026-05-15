export const GLOBAL_COMPANY_DOMAIN = "global.local";
export const GLOBAL_COMPANY_NAME = "Global";
export const GLOBAL_COMPANY_COLOR = "#0f172a";
export const GLOBAL_DESTINATION_SENTINEL = "__GLOBAL__";

export function isGlobalCompanyDomain(domain?: string | null) {
  return (domain ?? "").toLowerCase() === GLOBAL_COMPANY_DOMAIN;
}
