import type { Metadata, Viewport } from "next";
import { Outfit, Syne } from "next/font/google";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/AppProviders";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AuraHUD",
  description: "A private life HUD. Capture in seconds. Leave.",
  applicationName: "AuraHUD",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AuraHUD",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#070709",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable}`}>
      <body className="font-sans antialiased">
        <RegisterServiceWorker />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
