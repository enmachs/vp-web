'use client';

import { useState, useEffect } from 'react';
import type { Lang } from '@/features/landing/lib/types';
import type { ContactInfo } from '@/features/landing/lib/getContactInfo';
import Nav from './Nav';
import Hero from './Hero';
import About from './About';
import Services from './Services';
import Gallery from './Gallery';
import Testimonials from './Testimonials';
import Tender from './Tender';
import Footer from './Footer';

interface Props {
  contact: ContactInfo | null;
}

export default function LandingPage({ contact }: Props) {
  const [lang, setLang] = useState<Lang>('es');

  // Restore saved language on mount (localStorage is browser-only)
  useEffect(() => {
    const saved = localStorage.getItem('vp-lang') as Lang | null;
    if (saved === 'es' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('vp-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <Hero lang={lang} />
      <About lang={lang} />
      <Services lang={lang} />
      <Gallery lang={lang} />
      <Testimonials lang={lang} />
      <Tender lang={lang} />
      <Footer lang={lang} contact={contact} />
    </>
  );
}
