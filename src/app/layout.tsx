import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

import Script from "next/script"

export const metadata: Metadata = {
  title: {
    default: "Sınav Asistanım — SPL, YDS ve Daha Fazlası",
    template: "%s | Sınav Asistanım",
  },
  description: "SPL, YDS ve diğer sınavlara hazırlıkta yapay zeka destekli akıllı asistanınız. Kapsamlı ders notları, soru bankası ve flashcard'lar.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Sınav Asistanım",
    description: "SPL, YDS ve diğer sınavlara hazırlıkta yapay zeka destekli akıllı asistanınız.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sınav Asistanım",
    description: "SPL, YDS ve diğer sınavlara hazırlıkta yapay zeka destekli akıllı asistanınız.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#020617",
};

import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Sınav Asistanım",
              "description": "SPL, MASAK ve diğer sınavlara hazırlıkta yapay zeka destekli akıllı asistan",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TRY" },
              "inLanguage": "tr",
              "educationalLevel": "Professional",
              "about": [
                { "@type": "Thing", "name": "SPL Sermaye Piyasası Lisanslama" },
                { "@type": "Thing", "name": "MASAK Uyum Görevlisi" }
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        {/* A11y: Skip-to-content link */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:font-bold focus:text-sm focus:shadow-lg">
          İçeriğe atla
        </a>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <main id="main-content">
              {children}
            </main>
            <Toaster 
              position="top-right" 
              toastOptions={{
                classNames: {
                  toast: 'bg-[#060912]/90 border border-white/[0.08] shadow-[0_0_50px_rgba(59,130,246,0.15)] backdrop-blur-md rounded-2xl font-sans',
                  title: 'text-white font-bold text-sm',
                  description: 'text-slate-400 text-xs',
                  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                  error: 'bg-red-500/10 border-red-500/20 text-red-400',
                  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                  closeButton: 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors'
                }
              }}
            />
          </ThemeProvider>
        </AuthProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
              // Önce eski cache'leri temizle
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  names.forEach(function(name) {
                    if (name !== 'sinav-asistanim-v4' && name !== 'static-v4' && name !== 'fonts-v4' && name !== 'images-v4') {
                      caches.delete(name);
                      console.log('Eski cache silindi:', name);
                    }
                  });
                });
              }
              // SW'yi kaydet
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  registration.update();
                  console.log('SW registered:', registration.scope);
                },
                function(err) { console.log('SW registration failed:', err); }
              );
            }
          `}
        </Script>
      </body>
    </html>
  );
}
