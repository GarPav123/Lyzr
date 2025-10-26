import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Poll",
  description: "Real-time opinion polling platform",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%239333ea"/></linearGradient></defs><rect width="256" height="256" rx="64" fill="url(%23grad)"/><path d="M64 160H48C44.4 160 42 161.4 40 164V200H136V164C134 161.4 131.6 160 128 160H112M64 160V96C64 92.4 65.4 90 68 92H92C94.6 92 96 94.4 96 98V160M64 160H112M112 160V56C112 52.4 113.4 50 116 52H140C142.6 52 144 54.4 144 58V160M112 160H176M176 160V192C176 195.6 174.6 198 172 200H148C145.4 200 144 197.6 144 194V160M176 160H192" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
