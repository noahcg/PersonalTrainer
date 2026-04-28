import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: brand.businessName,
  description: `${brand.tagline} Premium personal training management for plans, workouts, progress, and client support.`,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
