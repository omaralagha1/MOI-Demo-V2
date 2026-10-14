'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Accessibility, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type Prefs = { size: 'default' | 'large' | 'x-large'; contrast: 'default' | 'high'; motion: 'default' | 'reduce' };
const KEY = 'kms-a11y';
const defaults: Prefs = { size: 'default', contrast: 'default', motion: 'default' };

/** Runs in <head> before paint so saved preferences never flash. Keep in sync with `apply`. */
export const accessibilityBootScript = `try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}'),d=document.documentElement;if(p.size&&p.size!=='default')d.dataset.textSize=p.size;if(p.contrast==='high')d.dataset.contrast='high';if(p.motion==='reduce')d.dataset.motion='reduce';}catch(e){}`;

function apply(prefs: Prefs) {
  const root = document.documentElement;
  if (prefs.size === 'default') delete root.dataset.textSize; else root.dataset.textSize = prefs.size;
  if (prefs.contrast === 'high') root.dataset.contrast = 'high'; else delete root.dataset.contrast;
  if (prefs.motion === 'reduce') root.dataset.motion = 'reduce'; else delete root.dataset.motion;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage unavailable: settings last for this page only */ }
}

export function AccessibilityMenu({ variant = 'dark', inline = false }: { variant?: 'dark' | 'light'; inline?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setPrefs({ ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }); } catch { /* defaults */ }
  }, []);
  useEffect(() => {
    if (!open || inline) return;
    const onClick = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open, inline]);

  const update = (next: Partial<Prefs>) => { const merged = { ...prefs, ...next }; setPrefs(merged); apply(merged); };
  const group = <K extends keyof Prefs>(label: string, key: K, options: [Prefs[K], string][]) => (
    <div className="a11y-group" role="group" aria-label={label}>
      <span className="a11y-label">{label}</span>
      <div className="segmented">
        {options.map(([value, text]) => (
          <button key={value} type="button" aria-pressed={prefs[key] === value} onClick={() => update({ [key]: value } as Partial<Prefs>)}>{text}</button>
        ))}
      </div>
    </div>
  );
  const panel = (
    <div className="a11y-panel-body">
      {group(t.a11y.textSize, 'size', [['default', t.a11y.sizeDefault], ['large', t.a11y.sizeLarge], ['x-large', t.a11y.sizeXLarge]])}
      {group(t.a11y.contrast, 'contrast', [['default', t.a11y.contrastDefault], ['high', t.a11y.contrastHigh]])}
      {group(t.a11y.motion, 'motion', [['default', t.a11y.motionDefault], ['reduce', t.a11y.motionReduce]])}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(defaults)}><RotateCcw size={16} aria-hidden="true" />{t.a11y.reset}</button>
    </div>
  );

  if (inline) return <section className="a11y-inline" aria-label={t.a11y.menuTitle}><h2 className="a11y-inline-title">{t.a11y.menuTitle}</h2>{panel}</section>;

  return (
    <div className="a11y-menu" ref={wrapper}>
      <button type="button" className={`utility-button ${variant === 'light' ? 'is-light' : ''}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        <Accessibility size={18} aria-hidden="true" />
        <span>{t.a11y.menu}</span>
      </button>
      {open && (
        <div className="popover a11y-panel" id={panelId} role="dialog" aria-label={t.a11y.menuTitle}>
          <p className="popover-title">{t.a11y.menuTitle}</p>
          {panel}
        </div>
      )}
    </div>
  );
}
