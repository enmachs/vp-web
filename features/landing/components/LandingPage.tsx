'use client';

import { useState, useEffect } from 'react';
import type { Lang } from '@/features/landing/lib/types';
import type { ContactInfo } from '@/features/landing/lib/getContactInfo';
import type { SocialLink } from '@/features/landing/lib/getSocialLinks';
import type { Service } from '@/features/landing/lib/getServices';
import type { ServiceType } from '@/features/landing/lib/getServiceTypes';
import type { GalleryItem } from '@/features/landing/lib/getGalleryItems';
import type { Review } from '@/features/landing/lib/getReviews';
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
  socialLinks: SocialLink[] | null;
  services: Service[] | null;
  serviceTypes: ServiceType[] | null;
  galleryItems: GalleryItem[] | null;
  reviews: Review[] | null;
}

export default function LandingPage({
  contact,
  socialLinks,
  services,
  serviceTypes,
  galleryItems,
  reviews,
}: Props) {
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
      <Services lang={lang} services={services} />
      <Gallery lang={lang} items={galleryItems} serviceTypes={serviceTypes} />
      <Testimonials lang={lang} reviews={reviews} />
      <Tender lang={lang} />
      <Footer lang={lang} contact={contact} socialLinks={socialLinks} />
    </>
  );
}
