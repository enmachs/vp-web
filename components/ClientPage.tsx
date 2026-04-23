'use client';

import { useState, useEffect } from 'react';
import type { Lang, TweakValues } from '@/lib/types';
import { TWEAK_DEFAULTS } from '@/lib/data';
import Nav from './Nav';
import Hero from './Hero';
import About from './About';
import Services from './Services';
import Gallery from './Gallery';
import Testimonials from './Testimonials';
import Tender from './Tender';
import Footer from './Footer';

const RADIUS_MAP: Record<TweakValues['radius'], [number, number, number, number]> = {
  sharp:   [6,  10, 16, 22],
  soft:    [10, 18, 28, 40],
  rounded: [14, 24, 40, 64],
  pillow:  [20, 32, 52, 80],
};

export default function ClientPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [tweaks, setTweaks] = useState<TweakValues>(TWEAK_DEFAULTS);

  // Restore saved language on mount (localStorage is browser-only)
  useEffect(() => {
    const saved = localStorage.getItem('vp-lang') as Lang | null;
    if (saved === 'es' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('vp-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    const [sm, md, lg, xl] = RADIUS_MAP[tweaks.radius];
    document.documentElement.style.setProperty('--radius-sm', sm + 'px');
    document.documentElement.style.setProperty('--radius-md', md + 'px');
    document.documentElement.style.setProperty('--radius-lg', lg + 'px');
    document.documentElement.style.setProperty('--radius-xl', xl + 'px');
  }, [tweaks]);

  return (
    <>
      <Nav lang={lang} setLang={setLang} />
      <Hero lang={lang} />
      <About lang={lang} />
      <Services lang={lang} />
      <Gallery lang={lang} />
      <Testimonials lang={lang} />
      <Tender lang={lang} />
      <Footer lang={lang} />
    </>
  );
}
