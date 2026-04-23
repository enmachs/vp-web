import type { Metadata } from 'next';
import { Montserrat, Crimson_Pro } from 'next/font/google';
import './globals.css';

// next/font downloads and self-hosts these fonts at build time.
// No external CDN request at runtime — faster and more private than a <link> tag.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Viajeros Paraguaná — Viajes y Encomiendas',
  description: 'Viajes y encomiendas confiables entre Paraguaná y el resto del país.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang is managed client-side; 'es' is the SSR default
    <html lang="es" className={`${montserrat.variable} ${crimsonPro.variable}`}>
      <body className="grain">{children}</body>
    </html>
  );
}
