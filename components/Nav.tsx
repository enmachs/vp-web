import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export default function Nav({ lang, setLang }: Props) {
  const t = DICT[lang];
  return (
    <nav className="nav" id="top">
      <div className="nav-inner">
        <a href="#top" className="logo-lockup" aria-label="Viajeros Paraguaná">
          <img src="/images/horizontal-full-logo-black.png" alt="Viajeros Paraguaná" width={180} />
        </a>
        <div className="nav-links">
          <a href="#about">{t.nav.about}</a>
          <a href="#services">{t.nav.services}</a>
          <a href="#gallery">{t.nav.gallery}</a>
          <a href="#testimonials">{t.nav.testimonials}</a>
          <a href="#tender">{t.nav.tender}</a>
        </div>
        <div className="nav-right">
          <div className="lang-switch">
            <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <a href="#tender" className="btn">{t.cta}</a>
        </div>
      </div>
    </nav>
  );
}