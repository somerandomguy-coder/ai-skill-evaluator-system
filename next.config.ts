import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cross-origin isolation is mandatory: WebContainers need SharedArrayBuffer,
   * which the browser only exposes to cross-origin-isolated pages.
   *
   * `credentialless` is used instead of `require-corp` because it is far more
   * forgiving about third-party resources (they load, just without cookies).
   * Chromium only — demo on Chrome/Edge/Brave. Anything embedded that does not
   * send matching CORP headers is stripped of credentials; self-host fonts and
   * images (next/font already does this for the fonts we use).
   *
   * The same headers are applied to every route, including /api/*, so a page
   * never loses isolation when navigating client-side.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },

  // duck-duck-scrape pulls in Node-only HTTP code; keep it out of the bundle.
  serverExternalPackages: ["duck-duck-scrape"],
};

export default nextConfig;
