import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Modeling Portfolio Admin",
  description: "Admin panel for managing models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

