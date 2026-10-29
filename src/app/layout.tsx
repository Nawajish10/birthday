import type { Metadata, Viewport } from "next";
import "./styles.css";

export const viewport: Viewport = {
  themeColor: "#4A1525",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "A Birthday World for Meerah · ہماری یادوں کی جھلک",
  description: "A little romantic birthday sanctuary created with love for Meerah.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Meerah's Birthday",
  },
  openGraph: {
    title: "A Birthday World for Meerah",
    description: "A little romantic birthday sanctuary created with love for Meerah.",
    siteName: "Birthday Experience",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="love">
      <body>{children}</body>
    </html>
  );
}
