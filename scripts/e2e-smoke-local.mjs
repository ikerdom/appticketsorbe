const BASE_URL = process.env.E2E_BASE_URL || process.env.APP_URL || "http://127.0.0.1:3000";

function parseSetCookie(setCookieValue) {
  if (!setCookieValue) return null;
  const pair = setCookieValue.split(";")[0];
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  return { name: pair.slice(0, eq), value: pair.slice(eq + 1) };
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function http(session, path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (Object.keys(session.jar).length) {
    headers.set("cookie", cookieHeader(session.jar));
  }
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: options.redirect || "manual"
  });

  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")]
        : [];

  for (const item of setCookies) {
    const parsed = parseSetCookie(item);
    if (!parsed) continue;
    if (parsed.value === "") {
      delete session.jar[parsed.name];
    } else {
      session.jar[parsed.name] = parsed.value;
    }
  }

  let payload = null;
  const text = await res.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    status: res.status,
    location: res.headers.get("location"),
    payload
  };
}

function expect(cond, message) {
  if (!cond) throw new Error(message);
}

async function login(email, password) {
  const session = { jar: {} };
  const body = password ? { email, password } : { email };
  const result = await http(session, "/api/auth/login", {
    method: "POST",
    body
  });
  expect(result.status === 200 && result.payload?.ok, `Login fallido para ${email}: ${JSON.stringify(result.payload)}`);
  return session;
}

async function run() {
  console.log(`[E2E] Base URL: ${BASE_URL}`);

  const user = await login("jose.perez@orbe.es");
  const userMe = await http(user, "/api/auth/me");
  expect(userMe.status === 200, "USER /api/auth/me fallo");
  expect(userMe.payload?.user?.rol === "USER", "USER rol inesperado");
  console.log("[E2E] Login USER OK");

  const userAdminPage = await http(user, "/admin/dashboard");
  expect(userAdminPage.status === 307 || userAdminPage.status === 308, "USER deberia ser redirigido desde /admin/dashboard");
  expect((userAdminPage.location || "").includes("/forbidden"), "USER deberia ir a /forbidden");
  console.log("[E2E] Restriccion USER->admin OK");

  const empresasRes = await http(user, "/api/empresas/activas");
  expect(empresasRes.status === 200, "No se pudieron cargar empresas activas");
  const empresas = empresasRes.payload?.empresas || [];
  const byName = Object.fromEntries(empresas.map((e) => [e.nombre, e]));
  expect(byName.ORBE && byName.Veprix, "Faltan ORBE o Veprix");

  const ticketEnCursoRes = await http(user, "/api/tickets", {
    method: "POST",
    body: {
      titulo: "Impresora Veprix en curso",
      descripcion: "Incidencia de impresion en Veprix para gestion por ORBE.",
      destinatarios: [byName.Veprix.id],
      contactoNombre: "Impresora oficina Veprix",
      contactoTelefono: "947123456",
      contactoEmail: "soporte@veprix.com",
      prioridad: "ALTA",
      categoria: "TECNICO"
    }
  });
  expect(ticketEnCursoRes.status === 201, `No se pudo crear ticket en curso: ${JSON.stringify(ticketEnCursoRes.payload)}`);
  const ticketEnCurso = ticketEnCursoRes.payload.ticket;
  console.log(`[E2E] Ticket creado #${ticketEnCurso.numero}: ${ticketEnCurso.titulo}`);

  const takeRes = await http(user, `/api/tickets/${ticketEnCurso.id}/estado`, {
    method: "PATCH",
    body: { action: "take" }
  });
  expect(takeRes.status === 200, "No se pudo coger ticket");
  expect(takeRes.payload?.ticket?.estado === "EN_CURSO", "Ticket no paso a EN_CURSO");
  console.log("[E2E] Cambio a EN_CURSO OK");

  const comment1 = await http(user, `/api/tickets/${ticketEnCurso.id}/comentarios`, {
    method: "POST",
    body: { contenido: "Inicio revision remota de la impresora y cola de impresion." }
  });
  expect(comment1.status === 201, "No se pudo crear comentario USER");
  console.log("[E2E] Comentario USER OK");

  const resolveRes = await http(user, `/api/tickets/${ticketEnCurso.id}/estado`, {
    method: "PATCH",
    body: { action: "resolve" }
  });
  expect(resolveRes.status === 200, "No se pudo resolver ticket");
  expect(resolveRes.payload?.ticket?.estado === "RESUELTO", "Ticket no paso a RESUELTO");
  console.log("[E2E] Cambio a RESUELTO OK");

  const ticketPropioRes = await http(user, "/api/tickets", {
    method: "POST",
    body: {
      titulo: "Aplicacion SINLI y cuentas correo 365",
      descripcion: "Ticket propio ORBE sobre acceso y sincronizacion de cuentas 365.",
      destinatarios: [byName.ORBE.id],
      contactoNombre: "Usuarios internos ORBE",
      prioridad: "MEDIA",
      categoria: "ADMINISTRATIVO"
    }
  });
  expect(ticketPropioRes.status === 201, `No se pudo crear ticket propio: ${JSON.stringify(ticketPropioRes.payload)}`);
  const ticketPropio = ticketPropioRes.payload.ticket;

  const takePropio = await http(user, `/api/tickets/${ticketPropio.id}/estado`, {
    method: "PATCH",
    body: { action: "take" }
  });
  expect(takePropio.status === 200, "No se pudo coger ticket propio");

  const propioResuelto = await http(user, `/api/tickets/${ticketPropio.id}/estado`, {
    method: "PATCH",
    body: { action: "resolve" }
  });
  expect(propioResuelto.status === 200, "No se pudo resolver ticket propio");
  console.log("[E2E] Ticket propio resuelto OK");

  const admin = await login("iker.dominguez@entenova.gnosis.com", "6924");
  const adminMe = await http(admin, "/api/auth/me");
  expect(adminMe.status === 200 && adminMe.payload?.user?.rol === "ADMIN", "Login ADMIN fallido");
  console.log("[E2E] Login ADMIN OK");

  const commentAdmin = await http(admin, `/api/tickets/${ticketEnCurso.id}/comentarios`, {
    method: "POST",
    body: { contenido: "Validado por admin. Incidencia cerrada correctamente." }
  });
  expect(commentAdmin.status === 201, "No se pudo crear comentario ADMIN");
  console.log("[E2E] Comentario ADMIN OK");

  const userDeleteAttempt = await http(user, `/api/tickets/${ticketPropio.id}`, { method: "DELETE" });
  expect(userDeleteAttempt.status === 403, "USER no deberia poder borrar tickets");
  console.log("[E2E] Bloqueo borrado para USER OK");

  const adminDelete = await http(admin, `/api/tickets/${ticketPropio.id}`, { method: "DELETE" });
  expect(adminDelete.status === 200, "ADMIN deberia poder borrar ticket");
  console.log("[E2E] Borrado de ticket por ADMIN OK");

  const listUser = await http(user, "/api/tickets");
  expect(listUser.status === 200, "USER no pudo listar tickets");
  const visibleCount = (listUser.payload?.tickets || []).length;

  console.log("========================================");
  console.log("[E2E] TODAS LAS PRUEBAS PASARON");
  console.log(`Ticket en curso/resuelto: #${ticketEnCurso.numero}`);
  console.log(`Ticket propio (borrado por admin): #${ticketPropio.numero}`);
  console.log(`Tickets visibles para USER tras pruebas: ${visibleCount}`);
  console.log("========================================");
}

run().catch((error) => {
  console.error("[E2E] ERROR:", error.message);
  process.exit(1);
});
