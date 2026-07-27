import { describe, expect, it } from "vitest";
import { detectEmpresaFromDomain, normalizeLoginEmail, parseEmailDomain } from "../lib/auth-email";
import { legacyNormalizeEmail, resolveActiveDomain } from "../lib/company-config";

describe("auth-email helpers", () => {
  // normalizeLoginEmail solo recorta espacios y pasa a minúsculas — NO reescribe
  // dominios legacy (eso es responsabilidad de company-config.ts, usado aparte
  // en app/api/auth/login/route.ts para buscar el usuario por ambos candidatos).
  it("normaliza mayúsculas y espacios, sin tocar el dominio", () => {
    expect(normalizeLoginEmail(" Jose.Perez@BN-TIC.es ")).toBe("jose.perez@bn-tic.es");
    expect(normalizeLoginEmail("Iker.Dominguez@Entenova-Gnosis.com")).toBe("iker.dominguez@entenova-gnosis.com");
  });

  it("detecta dominio y empresa correctamente", () => {
    expect(parseEmailDomain("A@Veprix.com")).toBe("veprix.com");
    expect(detectEmpresaFromDomain("orbeformacion.com")).toBe("ORBE");
  });
});

describe("company-config — remapeo de dominios legacy (login)", () => {
  it("resuelve dominios legacy al dominio activo real", () => {
    expect(resolveActiveDomain("bn-tic.es")).toBe("orbe.es");
    expect(resolveActiveDomain("orbeformacion.com")).toBe("orbe.es");
    expect(resolveActiveDomain("entenova-gnosis.com")).toBe("entenova.gnosis.com");
    expect(resolveActiveDomain("grupocep.es")).toBe("editorialcep.com");
  });

  it("deja igual un dominio que ya es activo", () => {
    expect(resolveActiveDomain("orbe.es")).toBe("orbe.es");
  });

  it("reescribe el email con guión antiguo (entenova-gnosis.com) al dominio con punto, para encontrar cuentas creadas con la normalización vieja", () => {
    expect(legacyNormalizeEmail("iker.dominguez@entenova-gnosis.com")).toBe("iker.dominguez@entenova.gnosis.com");
  });

  it("deja igual un email cuyo dominio no tiene alias legacy conocido", () => {
    expect(legacyNormalizeEmail("jose.perez@bn-tic.es")).toBe("jose.perez@bn-tic.es");
  });
});
