import Landing from '@/components/landing/Landing';
import { LocaleProvider } from '@/lib/i18n';
export default function Page() { return <LocaleProvider locale="en"><Landing/></LocaleProvider>; }
