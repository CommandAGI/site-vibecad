'use client';
import LocalePicker from '@/components/LocalePicker';
import { LOCALES, useLocale, useT } from '@/lib/i18n';

type Props={active:'explore'|'studio'|'circuits';disabled?:boolean;onExplore?:()=>void;onStudio?:()=>void};
export default function WorkspaceNavigation({active,disabled=false,onExplore,onStudio}:Props){
 const t=useT();
 const studio=`${LOCALES.find(entry=>entry.locale===useLocale())?.path??'/'}studio/`;
 const items=[{id:'explore',label:t('nav.explore'),href:`${studio}?workspace=explore`,action:onExplore},{id:'studio',label:t('nav.studio'),href:`${studio}?workspace=studio`,action:onStudio},{id:'circuits',label:t('nav.circuits'),href:'/circuits',action:undefined}] as const;
 return <nav className="fx-navigation vibecad-workspace-nav" aria-label={t('nav.aria')}>{items.map(item=>item.action||disabled?<button key={item.id} aria-current={active===item.id?'page':undefined} disabled={disabled} onClick={item.action}>{item.label}</button>:<a key={item.id} href={item.href} aria-current={active===item.id?'page':undefined}>{item.label}</a>)}<LocalePicker compact page="studio/"/></nav>;
}
