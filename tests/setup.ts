/**
 * The browser loads the CAD catalog from `/api/catalog/data` at boot (components/CatalogBoot.tsx); the Worker bundles
 * the same JSON (server/index.ts). A test runs the modules directly, so it fills the catalog here, once.
 */
import parts from '../lib/studio/catalog-data/parts.json';
import objects from '../lib/studio/catalog-data/objects.json';
import { setCatalogData, type CatalogPart } from '../lib/studio/catalog';
import { setObjectData, type ObjectReference } from '../lib/studio/object-catalog';

setCatalogData(parts as CatalogPart[]);
setObjectData(objects as ObjectReference[]);
