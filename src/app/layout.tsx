import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Stella — Intelligent Query Assistant",
  description: "AI-powered public query assistant with auto-ticketing, department routing, and knowledge base lookup.",
};

import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 font-sans">
        
        {/* DataNet Top Navigation Bar */}
        <nav className="w-full bg-white border-b border-zinc-200 py-4 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          {/* Logo */}
          <div className="flex flex-col items-start leading-none cursor-pointer">
            <div className="flex items-start" style={{ fontFamily: 'Arial, Helvetica, sans-serif', transform: 'scaleY(1.05)', transformOrigin: 'left' }}>
              <span className="text-4xl font-black text-[#00818a] tracking-tight">DATA</span>
              <span className="text-4xl font-black text-[#2a2a2a] tracking-tight">NET</span>
              <span className="text-[10px] text-zinc-500 font-bold ml-1 mt-1">™</span>
            </div>
            <span className="text-[11px] tracking-[0.35em] text-[#555555] mt-1.5 ml-0.5 font-medium uppercase" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              Solutions Group
            </span>
          </div>

          {/* Links */}
          <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-zinc-600">
            <Link href="/" className="text-[#008b8b] flex items-center gap-1">
              Home <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors flex items-center gap-1">
              About Us <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors">
              AI Solutions
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors flex items-center gap-1">
              IT Services <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors flex items-center gap-1">
              Understanding IT <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors flex items-center gap-1">
              Compliance <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors flex items-center gap-1">
              News <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors">
              Blog
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors flex items-center gap-1">
              Support <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#" className="hover:text-[#008b8b] transition-colors">
              Contact Us
            </Link>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
