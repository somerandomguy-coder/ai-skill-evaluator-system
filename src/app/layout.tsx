import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { SiteHeader } from "@/components/site/header";
import { THEME_INIT_SCRIPT } from "@/components/site/theme-script";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

// Fonts are self-hosted by next/font at build time — required because the page
// is cross-origin isolated (COEP) and cannot load third-party font files.
// Google Sans for the interface, Google Sans Code for code and data.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-google-sans-code",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "Show what you can do on the job you actually want. Build a real project with an AI assistant and get a score that cites its evidence.";

// Social previews need absolute URLs. Set NEXT_PUBLIC_SITE_URL in production;
// Vercel's own URL and then localhost are fallbacks.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const OG_IMAGE = { url: "/brand/og.jpg", width: 1200, height: 630, alt: `${APP_NAME} logo` };

// Favicons come from the file conventions next to this layout:
// icon.svg (vector, any DPI), favicon.ico (16–256 px) and apple-icon.png (180 px).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: { default: `${APP_NAME} · ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: DESCRIPTION,
    url: "/",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#131314",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may add `dark` before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`dark ${googleSans.variable} ${googleSansCode.variable} h-full font-sans tracking-tight antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="relative isolate flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
