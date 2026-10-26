'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Cpu, LoaderCircle, Play, Plus, Sparkles, Upload } from 'lucide-react';
import type { DeviceDocument } from '@/lib/studio/types';
import { desktopComputer } from '@/lib/studio/desktop';
import ObjectPreview from './ObjectPreview';
import { useT } from '@/lib/i18n';

interface Props {
  document: DeviceDocument; prompt: string; model: string | null; available: boolean;
  partNames: string[]; busy: boolean; progress: string; elapsed: number; error: string;
  onPrompt: (value: string) => void; onGenerate: () => void; onCancel: () => void;
  onContinue: () => void; onKeyboard: (explain?: boolean) => void;
  onDesktop: () => void; onImport: () => void; onBoard: () => void; onLibrary:()=>void;
}

export default function ObjectGallery(props: Props) {
  const t = useT();
  const [keyboard, setKeyboard] = useState<DeviceDocument | null>(null);
  useEffect(() => { let alive = true; import('@/lib/studio/corne').then(module=>module.loadCorneReference()).then(reference=>{if(alive)setKeyboard(reference);}).catch(()=>{}); return () => { alive = false; }; }, []);
  return <section className="fx-gallery" aria-label={t('gallery.aria')}>
    <div className="fx-gallery-copy">
      <span className="fx-overline"><i/>{t('gallery.overline')}</span>
      <h1>{t('gallery.title.first')}<br/><em>{t('gallery.title.second')}</em></h1>
      <p>{t('gallery.sub')}</p>
      <form className="fx-create-form" onSubmit={event => { event.preventDefault(); props.onGenerate(); }}>
        <label htmlFor="fx-object-prompt"><Sparkles size={15}/>{t('gallery.form.label')}</label>
        <textarea id="fx-object-prompt" aria-label="Describe a new device" placeholder={t('gallery.form.placeholder')} value={props.prompt} onChange={event => props.onPrompt(event.target.value)} disabled={props.busy}/>
        <div><span><i/>{props.available ? props.model || 'the model' : t('gallery.unavailable')}</span><button type="submit" disabled={props.busy || !props.prompt.trim()} aria-label={t('gallery.form.create')}>{props.busy ? <LoaderCircle className="ds-spin" size={15}/> : <ArrowRight size={18}/>}</button></div>
      </form>
      {props.busy && <div className="fx-generation" role="status"><LoaderCircle className="ds-spin" size={15}/><span>{props.progress}<small>{props.elapsed}s · Building an editable object</small></span><button onClick={props.onCancel}>Cancel</button></div>}
      {props.busy && !!props.partNames.length && <div className="fx-generation-parts" aria-label={t('gallery.receiving.aria')}><span>{t('gallery.receiving', { count: props.partNames.length })}</span><div>{props.partNames.slice(-6).map((name,index)=><small key={`${index}-${name}`}><i/>{name}</small>)}</div><p>{t('gallery.receiving.checked')}</p></div>}
      {props.error && !props.busy && <p className="fx-generation-error" role="alert">{props.error}</p>}
      <button className="fx-continue" disabled={props.busy} onClick={props.onContinue}>{t('gallery.continue', { name: props.document.name })}<ArrowUpRight size={15}/></button>
      <button className="vibecad-gallery-library" disabled={props.busy} onClick={props.onLibrary}><span><Cpu size={18}/></span><span><strong>{t('gallery.real')}</strong><small>{t('gallery.real.detail')}</small></span><ArrowUpRight size={17}/></button>
    </div>
    <button className="fx-hero-caption" disabled={props.busy} onClick={props.onContinue}><span><i/>{props.busy?(props.partNames.length?t('gallery.caption.progress'):t('gallery.caption.current')):t('gallery.caption.live')}</span><strong>{props.document.name}<ArrowUpRight size={18}/></strong><small>{props.busy&&props.partNames.length?t('gallery.parts.pending', { count: props.partNames.length }):t(props.busy?'gallery.parts.saved':'gallery.parts.count', { count: props.document.parts.length })}</small></button>
    <div className="fx-gallery-collection">
      <div className="fx-collection-heading"><span>{t('gallery.collection')}</span><span>01 — 03</span></div>
      <div className="fx-reference-grid">
        <article className="fx-reference fx-keyboard-reference"><button className="fx-reference-main" disabled={props.busy} onClick={() => props.onKeyboard()}><span className="fx-reference-image">{keyboard && <ObjectPreview document={keyboard}/>}</span><span><small>{t('gallery.card.corne.kicker')}</small><strong>{t('gallery.card.corne.title')}</strong><span>{t('gallery.card.corne.meta')}<ArrowUpRight size={13}/></span></span></button><button className="fx-reference-story" disabled={props.busy} onClick={() => props.onKeyboard()}><Play size={12}/>{t('gallery.card.corne.open')}<ArrowRight size={13}/></button></article>
        <article className="fx-reference"><button className="fx-reference-main" disabled={props.busy} onClick={props.onDesktop}><span className="fx-reference-image"><ObjectPreview document={desktopComputer}/></span><span><small>{t('gallery.card.desktop.kicker')}</small><strong>{t('gallery.card.desktop.title')}</strong><span>{t('gallery.card.desktop.meta')}<ArrowUpRight size={13}/></span></span></button><button className="fx-reference-story" disabled={props.busy} onClick={props.onBoard}><Cpu size={12}/>{t('gallery.card.desktop.open')}<ArrowRight size={13}/></button></article>
        <article className="fx-reference fx-import-reference"><button className="fx-reference-main" disabled={props.busy} onClick={props.onImport}><span className="fx-import-orbit"><Upload size={27}/><i/><b/></span><span><small>{t('gallery.card.import.kicker')}</small><strong>{t('gallery.card.import.title')}</strong><span>{t('gallery.card.import.meta')}<ArrowUpRight size={13}/></span></span></button><button className="fx-reference-story" disabled={props.busy} onClick={props.onImport}><Upload size={12}/>{t('gallery.card.import.open')}<ArrowRight size={13}/></button></article>
      </div>
    </div>
  </section>;
}
