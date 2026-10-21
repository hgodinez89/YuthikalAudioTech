import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";

// CSP: 'unsafe-inline' en script-src es requerido por la hidratación de
// Next.js sin nonces; el resto de directivas quedan cerradas. YouTube
// (IFrame API) y Supabase están pre-autorizados para las fases 3–7.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob: https://*.supabase.co",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  // Service worker de consulta sin conexión (/serwist/sw.js, mismo origen).
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // El login de Google es por redirección (sin popup): aislar la ventana es seguro.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig: NextConfig = {
  images: {
    // Avatares de la cuenta de Google (menú de usuario).
    remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }],
  },
  // URLs anteriores a la navegación por instrumento.
  async redirects() {
    return [
      { source: "/guitar/strings", destination: "/guitar/basics", permanent: false },
      { source: "/guitar/notes", destination: "/guitar/basics", permanent: false },
      { source: "/playlists", destination: "/guitar/songs", permanent: false },
      {
        source: "/playlists/:id/songs/:songId",
        destination: "/guitar/songs/:songId",
        permanent: false,
      },
      {
        source: "/playlists/:id",
        destination: "/guitar/songs?list=:id",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // El service worker: siempre fresco (cada deploy trae el suyo), y con
        // alcance sobre todo el sitio aunque viva en /serwist/.
        source: "/serwist/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withSerwist(withNextIntl(nextConfig));
