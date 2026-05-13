/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Packages workspace transpilés à la volée par Next plutôt que pré-build via tsc.
  // Garde `main` pointant vers `src/index.ts` et évite un build step intermédiaire.
  transpilePackages: [
    "@delta/contracts",
    "@delta/core",
    "@delta/db",
    "@delta/ui-web",
  ],
}

export default nextConfig
