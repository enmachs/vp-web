import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';
import { REVIEWS } from '@/lib/data';

interface Props {
  lang: Lang;
}

export default function Testimonials({ lang }: Props) {
  const t = DICT[lang].testimonials;
  const reviews = REVIEWS[lang];
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
        <div className="testimonials-row">
          {reviews.map((r, i) => (
            <div key={i} className={'tcard ' + (r.dark ? 'dark' : '')}>
              <div className="stars">{'★'.repeat(r.stars)}</div>
              <div className="t-quote">{r.q}</div>
              <div className="t-who">
                <div className="avatar">{r.initials}</div>
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.where}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
