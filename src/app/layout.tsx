import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/layout/main-layout";
import { BarChartHorizontalBig } from "lucide-react"; // Import the icon

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlgoVision",
  description: "Visualize sorting, searching, and graph algorithms",
  // Add icon information. Note: Linking directly to a component might not work as expected.
  // A static file in /public is the standard approach.
  // Using '/favicon.svg' as a placeholder path, assuming an SVG file would be placed there.
  // In a real scenario, you'd create public/favicon.ico, public/icon.svg, public/apple-icon.png etc.
  icons: {
    icon: '/icon.svg', // Placeholder for standard favicon
    shortcut: '/shortcut-icon.png', // Placeholder
    apple: '/apple-icon.png', // Placeholder
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-touch-icon-precomposed.png', // Placeholder
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <MainLayout>{children}</MainLayout>
        <Toaster />
      </body>
    </html>
  );
}

