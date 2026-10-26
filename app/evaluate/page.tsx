import '@/app/studio-styles';
import CatalogBoot from '@/components/CatalogBoot';
import DesignEvaluation from '@/components/studio/DesignEvaluation';
import { LocaleProvider } from '@/lib/i18n';
export default function EvaluatePage(){return <LocaleProvider locale="en"><CatalogBoot><DesignEvaluation/></CatalogBoot></LocaleProvider>;}
