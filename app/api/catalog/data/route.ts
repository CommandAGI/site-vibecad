import { catalogParts } from '@/lib/studio/catalog';
import { objectReferences } from '@/lib/studio/object-catalog';

export const runtime = 'nodejs';

/** The ready-parts catalog and the museum references, for the browser's one load at boot (components/CatalogBoot.tsx).
 *  It is a static data file, so it is cached; the page itself never ships it in the JavaScript bundle. */
export async function GET() {
    return Response.json({ parts: catalogParts, objects: objectReferences }, { headers: { 'cache-control': 'public, max-age=900' } });
}
