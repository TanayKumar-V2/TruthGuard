import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";
import { NotificationProvider } from "@/components/providers/notification-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TruthGuard",
  description: "AI-powered truth verification platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        <Toaster position="top-center" richColors theme="dark" />
        <NotificationProvider>
          <Navbar />
          <div className="pt-16">
            {children}
          </div>
        </NotificationProvider>
      </body>
    </html>
  );
}
