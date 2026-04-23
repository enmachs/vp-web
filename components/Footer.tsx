import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';
import LogoMark from './LogoMark';

interface Props {
  lang: Lang;
}

export default function Footer({ lang }: Props) {
  const t = DICT[lang].footer;
  const navT = DICT[lang].nav;
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
              <li>Punto Fijo, Falcón</li>
              <li>+58 414 000 0000</li>
              <li>hola@viajerosparaguana.com</li>
            </ul>
          </div>
          <div>
            <h4>{t.social}</h4>
            <ul>
              <li><a href="#">Instagram</a></li>
              <li><a href="#">Facebook</a></li>
              <li><a href="#">TikTok</a></li>
              <li><a href="#">WhatsApp</a></li>
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
