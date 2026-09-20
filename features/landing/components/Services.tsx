import type { Lang } from '@/features/landing/lib/types';
import type { Service } from '@/features/landing/lib/getServices';
import DICT from '@/features/landing/lib/dict';
import EmptyState from './EmptyState';

interface Props {
  lang: Lang;
  services: Service[] | null;
}

export default function Services({ lang, services }: Props) {
  const t = DICT[lang].services;
  const rows = services ?? [];
  return (
    <section className="section" id="services">
      <div className="page" style={{ padding: 0 }}>
        <div className="section-head">
          <h2>{t.title1} <span className="it serif-it">{t.titleIt}</span></h2>
          <p className="lead">{t.lead}</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <div className="services-grid">
            {rows.map((s, i) => {
              // Bilingual fields are siblings on the one row; fall back to Spanish
              // when the English side was left blank in the dashboard.
              const title = (lang === 'en' && s.titleEn) || s.titleEs;
              const body = (lang === 'en' && s.bodyEn) || s.bodyEs;
              const tags = lang === 'en' && s.tagsEn.length ? s.tagsEn : s.tagsEs;
              return (
                // Every other card gets the light "alt" treatment, as the two
                // original hardcoded cards did.
                <div key={s.id} className={'service' + (i % 2 === 1 ? ' alt' : '')}>
                  <div>
                    <div className="svc-num">{t.numPrefix} {String(i + 1).padStart(2, '0')}</div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                    {tags.length > 0 && (
                      <div className="svc-list">
                        {tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="arrow">→</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
