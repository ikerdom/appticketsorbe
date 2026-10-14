/**
 * Decodes a punycode/IDNA domain to its unicode representation.
 *
 * Uses url.domainToUnicode (Node.js 18+) when available — this is the case in
 * tests (vitest/Node.js) and Next.js server-side code. In browser bundles,
 * domainToUnicode is absent so we fall back to URL.hostname as best-effort.
 */
function decodePunycodeDomain(domain: string): string {
  try {
    /* The Node.js built-in `url` module exposes domainToUnicode.
       In browser bundles webpack replaces `require` with its own resolver;
       if domainToUnicode is absent we catch and continue to the fallback.
       eslint and Next.js both allow bare require() in utility libs. */
    // eslint-disable-next-line
    const urlMod: { domainToUnicode?: (d: string) => string } = require("url");
    if (typeof urlMod.domainToUnicode === "function") {
      const decoded = urlMod.domainToUnicode(domain);
      if (decoded) return decoded;
    }
  } catch {}
  // Browser / polyfill fallback — best-effort
  try {
    return new URL("https://" + domain).hostname;
  } catch {
    return domain;
  }
}

/**
 * Decodes punycode/IDNA domains in email addresses for display.
 * "rosa@xn--orbeformacin-bib.com" → "rosa@orbeformación.com"
 *
 * The browser encodes IDN domains (orbeformación.com → xn--orbeformacin-bib.com)
 * when autocompleting or validating email inputs. This helper makes them legible.
 */
export function decodeEmailForDisplay(email: string | null | undefined): string {
  if (!email) return "";
  const atIdx = email.lastIndexOf("@");
  if (atIdx === -1) return email;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  try {
    const decoded = decodePunycodeDomain(domain);
    return `${local}@${decoded}`;
  } catch {
    return email;
  }
}

/**
 * Decodes punycode/IDNA domains in URLs for display.
 * "https://xn--orbeformacin-bib.com/path" → "https://orbeformación.com/path"
 */
export function decodeUrlForDisplay(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const withProto = url.startsWith("http") ? url : "https://" + url;
    const parsed = new URL(withProto);
    const decodedHost = decodePunycodeDomain(parsed.hostname);
    return url.replace(parsed.hostname, decodedHost);
  } catch {
    return url;
  }
}
