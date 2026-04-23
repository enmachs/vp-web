'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/types';
import DICT from '@/lib/dict';
import LogoMark from './LogoMark';

interface Props {
  lang: Lang;
}

const EMPTY = { name: '', from: '', to: '', type: '', phone: '', heard: '', notes: '' };

export default function Tender({ lang }: Props) {
  const t = DICT[lang].tender;
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: false }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const required = ['name', 'from', 'to', 'type', 'phone', 'heard'];
    const errs: Record<string, boolean> = {};
    required.forEach((k) => { if (!form[k as keyof typeof form]) errs[k] = true; });
    if (form.phone && form.phone.length < 7) errs.phone = true;
    setErrors(errs);
    if (Object.keys(errs).length === 0) setSubmitted(true);
  }

  function reset() {
    setSubmitted(false);
    setForm(EMPTY);
  }

  return (
    <section className="section" id="tender">
      <div className="page" style={{ padding: 0 }}>
        <div className="tender">
          <div style={{ position: 'absolute', right: -80, top: -80, pointerEvents: 'none' }}>
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
              {submitted ? (
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
                      <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t.namePh} style={errors.name ? { borderColor: 'var(--ink)' } : {}} />
                    </div>
                    <div className="field">
                      <label>{t.from}</label>
                      <input value={form.from} onChange={(e) => set('from', e.target.value)} placeholder={t.fromPh} style={errors.from ? { borderColor: 'var(--ink)' } : {}} />
                    </div>
                    <div className="field">
                      <label>{t.to}</label>
                      <input value={form.to} onChange={(e) => set('to', e.target.value)} placeholder={t.toPh} style={errors.to ? { borderColor: 'var(--ink)' } : {}} />
                    </div>
                    <div className="field">
                      <label>{t.type}</label>
                      <select value={form.type} onChange={(e) => set('type', e.target.value)} style={errors.type ? { borderColor: 'var(--ink)' } : {}}>
                        {t.typeOpt.map((o, i) => <option key={i} value={i === 0 ? '' : o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>{t.phone}</label>
                      <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder={t.phonePh} style={errors.phone ? { borderColor: 'var(--ink)' } : {}} />
                    </div>
                    <div className="field full">
                      <label>{t.heard}</label>
                      <select value={form.heard} onChange={(e) => set('heard', e.target.value)} style={errors.heard ? { borderColor: 'var(--ink)' } : {}}>
                        {t.heardOpt.map((o, i) => <option key={i} value={i === 0 ? '' : o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field full">
                      <label>{t.notes}</label>
                      <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t.notesPh} />
                    </div>
                  </div>
                  <div className="form-foot">
                    <div className="consent">{t.consent}</div>
                    <button type="submit" className="submit-btn">{t.submit} →</button>
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
