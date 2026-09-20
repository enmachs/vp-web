'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Lang } from '@/features/landing/lib/types';
import type { GalleryItem } from '@/features/landing/lib/getGalleryItems';
import type { ServiceType } from '@/features/landing/lib/getServiceTypes';
import DICT from '@/features/landing/lib/dict';
import Placeholder from './Placeholder';
import EmptyState from './EmptyState';

interface Props {
  lang: Lang;
  items: GalleryItem[] | null;
  serviceTypes: ServiceType[] | null;
}

// Tile shapes cycle through the 12-column grid; 8 fills it exactly.
const SIZES = ['g-a', 'g-b', 'g-c', 'g-d', 'g-e', 'g-f', 'g-g', 'g-h'];
const MAX_TILES = SIZES.length;
const ALL = 'all';

function formatTakenOn(iso: string | null, lang: Lang): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // 'Mar 2025' vs 'mar 2025' is a locale difference, so format here rather
  // than storing a bilingual pair.
  return d.toLocaleDateString(lang === 'es' ? 'es-VE' : 'en-US', { month: 'short', year: 'numeric' });
}

export default function Gallery({ lang, items, serviceTypes }: Props) {
  const t = DICT[lang].gallery;
  const [filter, setFilter] = useState(ALL);

  const rows = items ?? [];
  // One tab per published ServiceType, keyed on `key` to match
  // GalleryItem.serviceTypeKey; "All" is always first.
  const tabs = [
    { key: ALL, label: t.all },
    ...(serviceTypes ?? []).map((st) => ({
      key: st.key,
      label: (lang === 'en' && st.nameEn) || st.nameEs,
    })),
  ];
  const photos = rows
    .filter((p) => filter === ALL || p.serviceTypeKey === filter)
    .slice(0, MAX_TILES);

  return (
    <section className="section" id="gallery">
      <div className="page" style={{ padding: 0 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <h2>{t.title1} <span className="it serif-it">{t.titleIt}</span></h2>
          </div>
          <p className="lead">{t.lead}</p>
        </div>
        {tabs.length > 1 && (
          <div className="gallery-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={filter === tab.key}
                className={filter === tab.key ? 'active' : ''}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {photos.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <div className="gallery">
            {photos.map((p, i) => {
              const label = (lang === 'en' && p.labelEn) || p.labelEs;
              const date = formatTakenOn(p.takenOn, lang);
              return (
                <div key={p.id} className={'gtile ' + SIZES[i % SIZES.length]}>
                  {p.image ? (
                    <Image
                      src={p.image.url}
                      alt={label}
                      fill
                      sizes="(max-width: 900px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Placeholder color={p.placeholderColor} hint={p.serviceTypeKey?.toUpperCase()} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(14,14,14,0.55) 100%)' }} />
                  <div className="cap">
                    <strong>{label}</strong>
                    {date && <span className="date">{date}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
