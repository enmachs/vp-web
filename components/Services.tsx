import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';

interface Props {
  lang: Lang;
}

export default function Services({ lang }: Props) {
  const t = DICT[lang].services;
  return (
    <section className="section" id="services">
      <div className="page" style={{ padding: 0 }}>
        <div className="section-head">
          <h2>{t.title1} <span className="it serif-it">{t.titleIt}</span></h2>
          <p className="lead">{t.lead}</p>
        </div>
        <div className="services-grid">
          <div className="service">
            <div>
              <div className="svc-num">{t.s1Num}</div>
              <h3>{t.s1Title}</h3>
              <p>{t.s1Body}</p>
              <div className="svc-list">
                {t.s1Tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
              </div>
            </div>
            <div className="arrow">→</div>
          </div>
          <div className="service alt">
            <div>
              <div className="svc-num">{t.s2Num}</div>
              <h3>{t.s2Title}</h3>
              <p>{t.s2Body}</p>
              <div className="svc-list">
                {t.s2Tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
              </div>
            </div>
            <div className="arrow">→</div>
          </div>
        </div>
      </div>
    </section>
  );
}
