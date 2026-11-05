import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: siteConfig.iconUrl
    ? {
        icon: siteConfig.iconUrl,
        shortcut: siteConfig.iconUrl,
        apple: siteConfig.iconUrl,
      }
    : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans antialiased" style={{ fontFamily: "var(--font-sans), system-ui" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
