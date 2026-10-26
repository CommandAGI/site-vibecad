import { partsGzip, objectsGzip } from 'virtual:catalog-data';
import { setCatalogData, type CatalogPart } from '../lib/studio/catalog';
import { setObjectData, type ObjectReference } from '../lib/studio/object-catalog';

/**
 * The catalog's geometry is 6.4 MB of JSON. Inside the Worker it travels gzipped (about 1 MB) and is filled once per
 * isolate on the first request; the browser gets it from `/api/catalog/data`, never in the page bundle.
 */
let ready: Promise<void> | undefined;

async function inflate(base64: string): Promise<unknown> {
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
}

export function loadCatalog(): Promise<void> {
    ready ??= (async () => {
        setCatalogData(await inflate(partsGzip) as CatalogPart[]);
        setObjectData(await inflate(objectsGzip) as ObjectReference[]);
    })();
    return ready;
}
