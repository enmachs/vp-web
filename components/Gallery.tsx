'use client';

import { useState, useRef } from 'react';
import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';
import { PLACEHOLDERS, type GalleryPhoto } from '@/lib/data';
import Placeholder from './Placeholder';

interface Props {
  lang: Lang;
}

const SIZES = ['g-a', 'g-b', 'g-c', 'g-d', 'g-e', 'g-f', 'g-g', 'g-h'];

export default function Gallery({ lang }: Props) {
  const t = DICT[lang].gallery;
  const [filter, setFilter] = useState('all');
  const [uploads, setUploads] = useState<GalleryPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { k: 'all', v: t.all }, { k: 'trips', v: t.trips }, { k: 'pkg', v: t.pkg }, { k: 'clients', v: t.clients },
  ];
  const photos = [...uploads, ...PLACEHOLDERS].filter((p) => filter === 'all' || p.cat === filter);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newPhotos: GalleryPhoto[] = files.map((f) => ({
      src: URL.createObjectURL(f),
      label: f.name.replace(/\.[^.]+$/, ''),
      date: new Date().toLocaleDateString(lang === 'es' ? 'es-VE' : 'en-US', { month: 'short', year: 'numeric' }),
      cat: 'clients',
      bg: '#888',
    }));
    setUploads((prev) => [...newPhotos, ...prev]);
    e.target.value = '';
  }

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
        <div className="gallery-tabs">
          {tabs.map((tab) => (
            <button key={tab.k} className={filter === tab.k ? 'active' : ''} onClick={() => setFilter(tab.k)}>{tab.v}</button>
          ))}
          <button onClick={() => fileRef.current?.click()} style={{ marginLeft: 'auto', background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }}>
            + {t.upload}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFile} />
        </div>
        <div className="gallery">
          {photos.slice(0, 7).map((p, i) => (
            <div key={i} className={'gtile ' + SIZES[i % SIZES.length]}>
              {p.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.src} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Placeholder color={p.bg} hint={p.cat.toUpperCase()} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(14,14,14,0.55) 100%)' }} />
              <div className="cap">
                <strong>{p.label}</strong>
                <span className="date">{p.date}</span>
              </div>
            </div>
          ))}
          <div className={'gtile upload ' + SIZES[7]} onClick={() => fileRef.current?.click()}>
            <div className="upload-inner">
              <div className="plus">+</div>
              <p>{t.upload}</p>
              <p style={{ marginTop: 4, fontSize: 10, letterSpacing: '0.06em', textTransform: 'none', fontFamily: 'var(--font-crimson)', fontStyle: 'italic', opacity: 0.7, fontWeight: 400 }}>{t.uploadHint}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
