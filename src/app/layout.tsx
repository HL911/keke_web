import type { Metadata } from "next";
import "../style/globals.css";
import ShadcnProvider from "@/components/ShadcnProvider";
import { Navigation } from "@/components/Navigation";
import AppkitProvider from "@/components/AppkitProvider";
import "../lib/startup";
import "@/lib/database-init";


export const metadata: Metadata = {
  title: "KekeSwap",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <ShadcnProvider>
          <AppkitProvider>
            <Navigation />
            {children}
          </AppkitProvider>
        </ShadcnProvider>
      </body>
    </html>
  );
}
