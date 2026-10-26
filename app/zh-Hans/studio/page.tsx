import '@/app/studio-styles';
import CatalogBoot from '@/components/CatalogBoot';
import DeviceStudio from '@/components/studio/DeviceStudio';
import { LocaleProvider } from '@/lib/i18n';
export default function Page() { return <LocaleProvider locale="zh-Hans"><CatalogBoot><DeviceStudio/></CatalogBoot></LocaleProvider>; }
