import type { Metadata, Viewport } from "next";
import { Figtree, Sora } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const display = Sora({ subsets: ["latin"], weight: ["200", "300", "400", "600"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Casa",
  description: "Panel de control de la casa",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1f26",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${body.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
