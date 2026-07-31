/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    },
    // sanitize-html depende de htmlparser2 (ESM-only) — sin esto, webpack
    // intenta bundlearlo como CJS y el build falla ("ESM packages need to be
    // imported"). Al marcarlo externo, Next lo deja a require() de Node en
    // runtime en vez de empaquetarlo. (Next 14.2.5: sigue bajo experimental,
    // el nombre estable serverExternalPackages llego en una version mas nueva.)
    serverComponentsExternalPackages: ["sanitize-html"]
  }
};

export default nextConfig;

