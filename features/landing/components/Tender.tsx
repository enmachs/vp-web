'use client';

import { useState } from 'react';
import type { Lang } from '@/features/landing/lib/types';
import type { ServiceType } from '@/features/landing/lib/getServiceTypes';
import { HEARD_OPTIONS } from '@/features/keystone/lib/heard-options';
import DICT from '@/features/landing/lib/dict';
import LogoMark from './LogoMark';

interface Props {
  lang: Lang;
  serviceTypes: ServiceType[] | null;
}

// Keys match the payload app/api/quote/route.ts expects, so the form object
// posts as-is. They used to carry the visible label, which meant the same
// answer arrived as 'Viaje' or 'Trip' depending on the language toggle.
const EMPTY = {
  fullName: '',
  fromLocation: '',
  toLocation: '',
  serviceTypeId: '',
  phone: '',
  howHeardFromUs: '',
  details: '',
};

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Tender({ lang, serviceTypes }: Props) {
  const t = DICT[lang].tender;
  const [form, setForm] = useState(EMPTY);

  // Only sellable types are quotable; `showcase` rows are gallery tags.
  const quotable = (serviceTypes ?? []).filter((st) => st.kind === 'service');

  // nameEn is optional in the model, so English falls back to Spanish — same
  // rule the gallery filters use.
  const serviceTypeName = (st: ServiceType) =>
    (lang === 'en' && st.nameEn) || st.nameEs;

  const serviceTypeLabel = (id: string) => {
    const st = quotable.find((s) => s.id === id);
    return st ? serviceTypeName(st) : '';
  };
  const [status, setStatus] = useState<Status>('idle');
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: false }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation (UX only — server validates too).
    // serviceTypeId is only required when there is something to pick: the
    // ServiceType read degrades to null on failure (see published.ts), and an
    // empty dropdown must not make the form unsubmittable.
    const required = ['fullName', 'fromLocation', 'toLocation', 'phone', 'howHeardFromUs'];
    if (quotable.length > 0) required.push('serviceTypeId');
    const errs: Record<string, boolean> = {};
    required.forEach((k) => { if (!form[k as keyof typeof form]) errs[k] = true; });
    if (form.phone && form.phone.length < 7) errs.phone = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus('loading');
    setServerError('');

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          language: lang,
          // Snapshot of the option the visitor saw, so the record stays
          // readable even if the taxonomy row is later renamed or removed.
          serviceTypeLabel: serviceTypeLabel(form.serviceTypeId),
        }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        // The API's own error strings are English and meant for logs, so the
        // visitor gets the localized copy instead. 429 is the one case worth
        // distinguishing, because waiting actually fixes it.
        setServerError(res.status === 429 ? t.errors.rateLimited : t.errors.generic);
        setStatus('error');
      }
    } catch {
      setServerError(t.errors.network);
      setStatus('error');
    }
  }

  function reset() {
    setStatus('idle');
    setServerError('');
    setForm(EMPTY);
  }

  const isLoading = status === 'loading';

  return (
    <section className="section" id="tender">
      <div className="page" style={{ padding: 0 }}>
        <div className="tender">
          <div style={{ position: 'absolute', right: -60, top: -35, opacity: 0.25, pointerEvents: 'none' }}>
            <LogoMark size={440} color="rgba(244,244,243,0.05)" />
          </div>
          <div className="tender-grid">
            <div>
              <div className="eyebrow" style={{ color: 'rgba(244,244,243,0.7)' }}>{t.eyebrow}</div>
              <h2>{t.title1} <span className="it">{t.titleIt}</span></h2>
              <p className="tender-lead">{t.lead}</p>
              <div className="side-info">
                <div className="info-row">
                  <div className="ico">◎</div>
                  <div><strong>{t.info1l}</strong>{t.info1v}</div>
                </div>
                <div className="info-row">
                  <div className="ico">✉</div>
                  <div><strong>{t.info2l}</strong>{t.info2v}</div>
                </div>
                <div className="info-row">
                  <div className="ico">◷</div>
                  <div><strong>{t.info3l}</strong>{t.info3v}</div>
                </div>
              </div>
            </div>
            <div>
              {status === 'success' ? (
                <div className="success">
                  <div className="check">✓</div>
                  <h3>{t.successT}</h3>
                  <p>{t.successB}</p>
                  <button onClick={reset} className="btn" style={{ marginTop: 24 }}>↺</button>
                </div>
              ) : (
                <form className="form" onSubmit={submit} noValidate>
                  <div className="form-grid">
                    <div className="field full">
                      <label>{t.name}</label>
                      <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder={t.namePh} style={errors.fullName ? { borderColor: 'var(--ink)' } : {}} disabled={isLoading} />
                    </div>
                    <div className="field">
                      <label>{t.from}</label>
                      <input value={form.fromLocation} onChange={(e) => set('fromLocation', e.target.value)} placeholder={t.fromPh} style={errors.fromLocation ? { borderColor: 'var(--ink)' } : {}} disabled={isLoading} />
                    </div>
                    <div className="field">
                      <label>{t.to}</label>
                      <input value={form.toLocation} onChange={(e) => set('toLocation', e.target.value)} placeholder={t.toPh} style={errors.toLocation ? { borderColor: 'var(--ink)' } : {}} disabled={isLoading} />
                    </div>
                    <div className="field">
                      <label>{t.type}</label>
                      <select value={form.serviceTypeId} onChange={(e) => set('serviceTypeId', e.target.value)} style={errors.serviceTypeId ? { borderColor: 'var(--ink)' } : {}} disabled={isLoading || quotable.length === 0}>
                        <option value="">{t.typePh}</option>
                        {quotable.map((st) => (
                          <option key={st.id} value={st.id}>{serviceTypeName(st)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>{t.phone}</label>
                      <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder={t.phonePh} style={errors.phone ? { borderColor: 'var(--ink)' } : {}} disabled={isLoading} />
                    </div>
                    <div className="field full">
                      <label>{t.heard}</label>
                      <select value={form.howHeardFromUs} onChange={(e) => set('howHeardFromUs', e.target.value)} style={errors.howHeardFromUs ? { borderColor: 'var(--ink)' } : {}} disabled={isLoading}>
                        <option value="">{t.heardPh}</option>
                        {HEARD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{lang === 'en' ? o.labelEn : o.labelEs}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field full">
                      <label>{t.notes}</label>
                      <textarea rows={3} value={form.details} onChange={(e) => set('details', e.target.value)} placeholder={t.notesPh} disabled={isLoading} />
                    </div>
                  </div>
                  {serverError && (
                    <p style={{ marginTop: 16, fontSize: 13, color: '#c0392b', lineHeight: 1.4 }}>
                      {serverError}
                    </p>
                  )}
                  <div className="form-foot">
                    <div className="consent">{t.consent}</div>
                    <button type="submit" className="submit-btn" disabled={isLoading} style={isLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                      {isLoading ? t.sending : `${t.submit} →`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
