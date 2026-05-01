import type { Metadata } from "next";
import { Cormorant_Garamond, Gelasio, Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const gelasio = Gelasio({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-gelasio",
  display: "swap",
});

const geistSans = Geist({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-geist-mono",
  display: "swap",
});

const fontVariables = `${cormorant.variable} ${gelasio.variable} ${geistSans.variable} ${geistMono.variable}`;

export const metadata: Metadata = {
  title: "Arthur & Linda — Celebration in Siem Reap",
  description:
    "Celebration of Arthur & Linda — November 7, 2026 in Siem Reap. Ceremony and reception at Angkor Grace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
