import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';
import LogoMark from './LogoMark';
import Placeholder from './Placeholder';

interface Props {
  lang: Lang;
}

export default function Hero({ lang }: Props) {
  const t = DICT[lang].hero;
  const marquee = DICT[lang].marquee;
  return (
    <section className="hero">
      <div className="page" style={{ padding: 0 }}>
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">{t.eyebrow}</div>
            <h1>
              {t.title1}<br />
              <span className="it">{t.titleIt}</span><br />
              {t.title2}
            </h1>
            <p className="hero-sub">{t.sub}</p>
            <div className="hero-cta">
              <a href="#tender" className="btn big">{t.ctaPrimary} →</a>
              <a href="#services" className="btn ghost big">{t.ctaSecondary}</a>
            </div>
          </div>
          <div className="hero-card">
            <Placeholder color="#8a8a8a" hint="HERO.JPG · carretera" rounded="var(--radius-xl)" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(14,14,14,0.55) 100%)', borderRadius: 'var(--radius-xl)' }} />
            <div style={{ position: 'absolute', right: -20, top: -20 }}>
              <LogoMark size={180} color="rgba(14,14,14,0.18)" />
            </div>
            <div className="stats">
              <div className="stat"><div className="num">2.400+</div><div className="lbl">{lang === 'es' ? 'clientes' : 'clients'}</div></div>
              <div className="stat"><div className="num">12</div><div className="lbl">{lang === 'es' ? 'rutas' : 'routes'}</div></div>
              <div className="stat"><div className="num">98%</div><div className="lbl">{lang === 'es' ? 'a tiempo' : 'on time'}</div></div>
            </div>
          </div>
        </div>
        <div className="marquee">
          <div className="marquee-track">
            {[...marquee, ...marquee].map((w, i) => <span key={i}>{w}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}
