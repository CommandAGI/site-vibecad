import '@/app/studio-styles';
import CatalogBoot from '@/components/CatalogBoot';
import Workbench from '@/components/Workbench';
import { LocaleProvider } from '@/lib/i18n';
export default function Page() { return <LocaleProvider locale="en"><CatalogBoot><Workbench/></CatalogBoot></LocaleProvider>; }
