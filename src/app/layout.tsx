import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nick Glushien Coaching",
  description: "Clear coaching. Real progress. Premium personal training management for plans, workouts, progress, and client support.",
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
      <body className="min-h-full font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
