import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';
import LogoMark from './LogoMark';
import Placeholder from './Placeholder';

interface Props {
  lang: Lang;
}

export default function About({ lang }: Props) {
  const t = DICT[lang].about;
  return (
    <section className="section" id="about">
      <div className="page" style={{ padding: 0 }}>
        <div className="about">
          <div className="about-grid">
            <div>
              <div className="eyebrow">{t.eyebrow}</div>
              <h3>{t.title1} <span className="serif-it">{t.titleIt}</span> {t.title2}</h3>
              <p style={{ marginTop: 18 }}>{t.body1}</p>
              <p style={{ marginTop: 18, fontFamily: 'var(--font-crimson)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)' }}>{t.body2}</p>
              <div style={{ display: 'flex', gap: 36, marginTop: 36, flexWrap: 'wrap' }}>
                <div className="stat"><div className="num">{t.kpi1}</div><div className="lbl">{t.kpi1l}</div></div>
                <div className="stat"><div className="num">{t.kpi2}</div><div className="lbl">{t.kpi2l}</div></div>
                <div className="stat"><div className="num">{t.kpi3}</div><div className="lbl">{t.kpi3l}</div></div>
              </div>
            </div>
            <div className="about-photo">
              <Placeholder color="#6a6a6a" hint="TEAM.JPG · chófer + van" rounded="var(--radius-md)" />
            </div>
          </div>
          <div style={{ position: 'absolute', right: -80, bottom: -120, pointerEvents: 'none' }}>
            <LogoMark size={380} color="rgba(14,14,14,0.05)" />
          </div>
        </div>
      </div>
    </section>
  );
}
