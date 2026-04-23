import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurelian Coach",
  description: "Premium personal trainer client management for plans, workouts, progress, and coaching.",
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
