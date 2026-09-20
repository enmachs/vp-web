import type { Lang } from '@/features/landing/lib/types';
import type { Review } from '@/features/landing/lib/getReviews';
import DICT from '@/features/landing/lib/dict';
import EmptyState from './EmptyState';

interface Props {
  lang: Lang;
  reviews: Review[] | null;
}

export default function Testimonials({ lang, reviews }: Props) {
  const t = DICT[lang].testimonials;
  const rows = reviews ?? [];
  return (
    <section className="section" id="testimonials">
      <div className="page" style={{ padding: 0 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <h2>{t.title1} <span className="it serif-it">{t.titleIt}</span></h2>
          </div>
          <p className="lead">{t.lead}</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <div className="testimonials-row">
            {rows.map((r) => {
              const quote = (lang === 'en' && r.quoteEn) || r.quoteEs;
              const where = (lang === 'en' && r.contextEn) || r.contextEs;
              return (
                // isFeatured is the content flag; the dark card is how this
                // component chooses to style it.
                <div key={r.id} className={'tcard' + (r.isFeatured ? ' dark' : '')}>
                  <div className="stars" aria-label={`${r.rating}/5`}>{'★'.repeat(r.rating)}</div>
                  <div className="t-quote">{quote}</div>
                  <div className="t-who">
                    <div className="avatar">{r.initials}</div>
                    <div>
                      <strong>{r.authorName}</strong>
                      {where && <span>{where}</span>}
                    </div>
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
