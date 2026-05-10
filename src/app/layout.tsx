import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Thu Chi Gia Đình",
  description: "Ứng dụng quản lý thu chi & tiết kiệm cho gia đình",
  applicationName: "Thu Chi",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Thu Chi",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
