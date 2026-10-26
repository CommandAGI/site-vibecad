declare module 'virtual:catalog-data' {
    export const partsGzip: string;
    export const objectsGzip: string;
}

declare module 'virtual:site-assets' {
    /** Path (no leading `/`) → [content type, gzip base64]; scripts/site-assets.mjs packs it. */
    export const ASSETS: import('./assets').AssetMap;
}
