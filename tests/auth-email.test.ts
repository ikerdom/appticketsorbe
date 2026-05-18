import { describe, expect, it } from "vitest";
import { detectEmpresaFromDomain, normalizeLoginEmail, parseEmailDomain } from "../lib/auth-email";

describe("auth-email helpers", () => {
  it("normaliza dominios legacy", () => {
    expect(normalizeLoginEmail("Jose.Perez@bn-tic.es")).toBe("jose.perez@orbe.es");
    expect(normalizeLoginEmail("iker.dominguez@entenova-gnosis.com")).toBe("iker.dominguez@entenova.gnosis.com");
  });

  it("detecta dominio y empresa correctamente", () => {
    expect(parseEmailDomain("A@Veprix.com")).toBe("veprix.com");
    expect(detectEmpresaFromDomain("orbeformacion.com")).toBe("ORBE");
  });
});
