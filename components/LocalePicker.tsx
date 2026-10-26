'use client';
import { useLocale, useT, LOCALES } from '@/lib/i18n';

/**
 * The A/文 picker: one link per static locale route, the current one marked. `A` is the Latin side (English), `文`
 * the Chinese one; Spanish keeps its own two letters because that is what its readers look for. `page` is the route
 * under the locale's root (`studio/` in the studio), so switching language keeps the visitor on the same page.
 */
export default function LocalePicker({ compact = false, page = '' }: { compact?: boolean; page?: string }) {
    const current = useLocale();
    const t = useT();
    return (
        <nav className="vibecad-locale-picker" aria-label={t('picker.aria')}>
            {LOCALES.map(entry => (
                <a key={entry.locale} href={entry.path + page} hrefLang={entry.lang} aria-current={entry.locale === current ? 'page' : undefined} title={entry.name}>
                    {compact ? entry.label : `${entry.label} ${entry.name}`}
                </a>
            ))}
        </nav>
    );
}
