import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the full Next.js server in the packaged desktop application.  The
  // Electron shell starts `.next/standalone/server.js`, so the customer does
  // not need Node.js installed on their machine.
  output: "standalone",

  // Explicitly pass NEXT_PUBLIC_ env vars to the client bundle.
  // Required when using output: "standalone" in Next.js 15.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },

  // Image server actions receive multipart/form-data. Next.js defaults to a
  // 1 MB action body limit, which rejects otherwise valid CMS image uploads.
  // Keep the limit bounded while allowing the documented 10 MB image cap and
  // a small amount of multipart overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },

  // Keep browser-facing responses hardened in both the web deployment and
  // the loopback server embedded in Electron. These headers do not change the
  // CMS data flow and avoid policies (such as HSTS) that would break the
  // packaged app's HTTP-only localhost origin.
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";
    const contentSecurityPolicy = [
      "default-src 'self'",
      // Code Library previews run user-authored documents in a sandboxed
      // iframe.  The bundled blocks use jsDelivr for Supabase/@fontsource,
      // Google Fonts for typography, and Postimages for review QR images.
      // Keep the allow-list explicit; the sandbox still denies access to the
      // admin document, cookies, and storage.
      `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://i.postimg.cc",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDevelopment ? " ws: http://localhost:*" : ""}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
