import type { Lang } from '@/features/landing/lib/types';
import type { ContactInfo } from '@/features/landing/lib/getContactInfo';
import DICT from '@/features/landing/lib/dict';
import LogoMark from './LogoMark';

interface Props {
  lang: Lang;
  contact: ContactInfo | null;
}

export default function Footer({ lang, contact }: Props) {
  const t = DICT[lang].footer;
  const navT = DICT[lang].nav;
  // Bilingual fields are siblings on the one row; pick by the active language.
  const address = lang === 'es' ? contact?.addressEs : contact?.addressEn;
  const hours = lang === 'es' ? contact?.hoursEs : contact?.hoursEn;
  // The raw value is stored machine-readable ('+584140000000'); wa.me wants digits only.
  const whatsappHref = contact?.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`
    : '#';
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-line">
              <LogoMark size={44} color="var(--bg)" />
              <div><strong>VIAJEROS</strong><small>PARAGUANÁ</small></div>
            </div>
            <p style={{ color: 'rgba(244,244,243,0.7)', fontSize: 14, maxWidth: 300, lineHeight: 1.6 }}>{t.tag}</p>
          </div>
          <div>
            <h4>{t.explore}</h4>
            <ul>
              <li><a href="#about">{navT.about}</a></li>
              <li><a href="#services">{navT.services}</a></li>
              <li><a href="#gallery">{navT.gallery}</a></li>
              <li><a href="#tender">{navT.tender}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t.contact}</h4>
            <ul>
              {address && (
                <li>
                  {contact?.mapsUrl ? (
                    <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer">{address}</a>
                  ) : (
                    address
                  )}
                </li>
              )}
              {contact?.phone && <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></li>}
              {contact?.email && <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
              {hours && <li>{hours}</li>}
            </ul>
          </div>
          <div>
            <h4>{t.social}</h4>
            <ul>
              <li><a href="#">Instagram</a></li>
              <li><a href="#">Facebook</a></li>
              <li><a href="#">TikTok</a></li>
              <li><a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
            </ul>
          </div>
        </div>
        <div className="giant">VIAJEROS PARAGUANÁ</div>
        <div className="footer-meta">
          <div>{t.rights}</div>
          <div>{t.made} ◆</div>
        </div>
      </div>
    </footer>
  );
}
