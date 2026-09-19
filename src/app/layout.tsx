import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site/header";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

// Fonts are self-hosted by next/font at build time — required because the page
// is cross-origin isolated (COEP) and cannot load third-party font files.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    "Show what you can do on the job you actually want. Build a real project with an AI assistant and get a score that cites its evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased font-sans`}>
      <body className="flex min-h-full flex-col bg-background text-foreground selection:bg-primary selection:text-white">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
