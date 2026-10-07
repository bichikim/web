const assets = import.meta.glob<string>(
  '../../../node_modules/pdfjs-dist/{cmaps,standard_fonts,wasm}/*.{bcmap,pfb,ttf,wasm}',
  {eager: true, import: 'default', query: '?url'},
)
const resources = new Map(
  Object.entries(assets).map(([path, value]) => [path.split('/').at(-1), value]),
)

interface BinaryRequest {
  readonly filename: string
}

/** Provides PDF.js bundled fonts, CMaps and decoders without network requests. */
export class BinaryDataFactory {
  async fetch({filename}: BinaryRequest): Promise<Uint8Array> {
    const resource = resources.get(filename)
    if (resource === undefined || !resource.startsWith('data:')) {
      throw new Error(`Missing bundled PDF resource: ${filename}`)
    }
    const encoded = resource.slice(resource.indexOf(',') + 1)
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  }
}
