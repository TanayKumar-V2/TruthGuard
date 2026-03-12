import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TruthGuard Dashboard Prototype",
  description:
    "TruthGuard is an educational misinformation analysis dashboard prototype."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
