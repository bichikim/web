import {strFromU8, strToU8, unzipSync, zipSync} from 'fflate'
import {THEME_ASSET_LIMIT, THEME_MAX_BYTES, type ThemeArchive, themeManifestSchema} from './theme'

const MANIFEST = 'manifest.json'
const MANIFEST_LIMIT = 4_194_304
const ASSET_PREFIX = 'assets/'
const ASSET_PATH = /^assets\/[\da-z-]{1,48}$/iu

const embeddedEntries = (archive: ThemeArchive): Record<string, Uint8Array> => {
  const embedded = archive.manifest.assets.filter((asset) => asset.source === 'embedded')
  if (Object.keys(archive.assets).length !== embedded.length) {
    throw new Error('The theme has unexpected or missing files.')
  }
  return Object.fromEntries(
    embedded.map(({id}) => {
      const bytes = Object.hasOwn(archive.assets, id) ? archive.assets[id] : undefined
      if (bytes === undefined || bytes.byteLength === 0) {
        throw new Error('The theme has an empty or missing asset.')
      }
      return [`assets/${id}`, bytes]
    }),
  )
}

export const writeThemeArchive = (archive: ThemeArchive): Uint8Array<ArrayBuffer> => {
  const manifest = themeManifestSchema.parse(archive.manifest)
  const header = strToU8(JSON.stringify(manifest))
  const files = embeddedEntries({assets: archive.assets, manifest})
  const size = Object.values(files).reduce(
    (total, data) => total + data.byteLength,
    header.byteLength,
  )
  if (header.byteLength > MANIFEST_LIMIT || size >= THEME_MAX_BYTES) {
    throw new Error('The theme exceeds its size limit.')
  }
  const result = zipSync({...files, [MANIFEST]: header}, {level: 0})
  if (result.byteLength > THEME_MAX_BYTES) {
    throw new Error('The theme exceeds its size limit.')
  }
  return new Uint8Array(result)
}

export const readThemeArchive = (source: Uint8Array): ThemeArchive => {
  if (source.byteLength > THEME_MAX_BYTES) {
    throw new Error('The theme exceeds its size limit.')
  }
  const names = new Set<string>()
  let total = 0
  const files = unzipSync(source, {
    filter(entry) {
      const {name, originalSize} = entry
      total += originalSize
      const fileLimit = name === MANIFEST ? MANIFEST_LIMIT : THEME_MAX_BYTES
      if (
        names.size > THEME_ASSET_LIMIT ||
        names.has(name) ||
        total > THEME_MAX_BYTES ||
        originalSize > fileLimit ||
        (name !== MANIFEST && !ASSET_PATH.test(name))
      ) {
        throw new Error('The theme contains invalid ZIP entries.')
      }
      names.add(name)
      return true
    },
  })
  const header = files[MANIFEST]
  if (header === undefined) {
    throw new Error('The theme manifest is missing.')
  }
  const manifest = themeManifestSchema.parse(JSON.parse(strFromU8(header)))
  const assets = Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => ASSET_PATH.test(path))
      .map(([path, data]) => [path.slice(ASSET_PREFIX.length), data]),
  )
  const archive = {assets, manifest}
  embeddedEntries(archive)
  return archive
}
