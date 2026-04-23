import type { TweakValues } from './types';

export interface GalleryPhoto {
  bg: string;
  label: string;
  date: string;
  cat: string;
  src?: string;
}

export interface Review {
  q: string;
  name: string;
  where: string;
  initials: string;
  stars: number;
  dark?: boolean;
}

export const TWEAK_DEFAULTS: TweakValues = {
  accent: '#4a4a4a',
  radius: 'rounded',
  heroVariant: 'split',
};

export const PLACEHOLDERS: GalleryPhoto[] = [
  { bg: '#b0b0b0', label: 'Punto Fijo → Caracas', date: 'Mar 2025', cat: 'trips' },
  { bg: '#6a6a6a', label: 'Adícora beach run', date: 'Dic 2024', cat: 'trips' },
  { bg: '#3a3a3a', label: 'Family parcel · Coro', date: 'Ene 2025', cat: 'pkg' },
  { bg: '#8a8a8a', label: 'Valencia route', date: 'Feb 2025', cat: 'trips' },
  { bg: '#c8c8c8', label: 'Happy clients · Judibana', date: 'Nov 2024', cat: 'clients' },
  { bg: '#4e4e4e', label: 'Airport transfer', date: 'Abr 2025', cat: 'trips' },
  { bg: '#a0a0a0', label: 'Packages · Maracaibo', date: 'May 2025', cat: 'pkg' },
  { bg: '#7a7a7a', label: 'Group trip · Cabo San Román', date: 'Jul 2024', cat: 'clients' },
];

export const REVIEWS: Record<'es' | 'en', Review[]> = {
  es: [
    { q: 'Llevé a mi mamá al aeropuerto y fue la primera vez en años que no pasé nervios con el trayecto. El chofer súper atento, puntual, todo impecable.', name: 'Yolimar G.', where: 'Punto Fijo → Maiquetía', initials: 'YG', stars: 5 },
    { q: 'Me enviaron unos repuestos desde Caracas en el mismo día. Me avisaron cuando salieron, cuando llegaron, y me los entregaron en la puerta. Así sí.', name: 'Rafael B.', where: 'Encomienda · Coro', initials: 'RB', stars: 5, dark: true },
    { q: 'Viajamos un grupo de 8 a Adícora y el servicio fue espectacular. Van impecable, hielera incluida, y el precio súper justo.', name: 'Alejandra P.', where: 'Grupo · Adícora', initials: 'AP', stars: 5 },
  ],
  en: [
    { q: "Took my mom to the airport and for the first time in years I didn't stress over the trip. The driver was attentive, on time, everything spotless.", name: 'Yolimar G.', where: 'Punto Fijo → Maiquetía', initials: 'YG', stars: 5 },
    { q: "They shipped me some spare parts from Caracas the same day. I got updates when they left, when they arrived, delivered to my door. That's the way.", name: 'Rafael B.', where: 'Parcel · Coro', initials: 'RB', stars: 5, dark: true },
    { q: 'A group of 8 of us went to Adícora and the service was outstanding. Impeccable van, cooler included, and the price more than fair.', name: 'Alejandra P.', where: 'Group · Adícora', initials: 'AP', stars: 5 },
  ],
};
