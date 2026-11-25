import {describe, expect, it} from 'vitest'
import {readThemeArchive, writeThemeArchive} from '../theme-archive'
import type {ThemeManifest} from '../theme'

const theme: ThemeManifest = {
  assets: [
    {id: 'art', kind: 'photo', name: 'Dusk.webp', source: 'embedded', type: 'image/webp'},
    {builtinId: 'builtin:ash', id: 'cat', kind: 'puppet', name: 'Ash', source: 'builtin'},
  ],
  background: {
    mediaIds: ['art'],
    mode: 'album',
    order: 'sequential',
    photoSeconds: 10,
    transition: 'none',
    videoMode: 'end',
  },
  format: 'poffo-theme',
  name: 'Dusk',
  version: 1,
  widgets: [{assetId: 'cat', x: 0.8, y: 0.5}],
}

describe('theme archive', () => {
  it('should round trip settings and the referenced original bytes', () => {
    const assets = {art: new Uint8Array([6, 3, 17])}
    expect(readThemeArchive(writeThemeArchive({assets, manifest: theme}))).toEqual({
      assets,
      manifest: theme,
    })
  })

  it('should reject missing or mismatched asset references', () => {
    expect(() => writeThemeArchive({assets: {}, manifest: theme})).toThrow()
    expect(() =>
      writeThemeArchive({
        assets: {art: new Uint8Array([1])},
        manifest: {...theme, widgets: [{assetId: 'art', x: 0.5, y: 0.5}]},
      }),
    ).toThrow()
  })

  it('should round trip a website background without a widget section', () => {
    const manifest: ThemeManifest = {
      assets: [],
      background: {mode: 'website', url: 'https://example.com/'},
      format: 'poffo-theme',
      name: 'Website',
      version: 1,
    }
    expect(readThemeArchive(writeThemeArchive({assets: {}, manifest})).manifest).toEqual(manifest)
  })

  it('should round trip widgets without a background section', () => {
    const manifest: ThemeManifest = {
      assets: [theme.assets[1]!],
      format: 'poffo-theme',
      name: 'Widgets',
      version: 1,
      widgets: theme.widgets,
    }
    expect(readThemeArchive(writeThemeArchive({assets: {}, manifest})).manifest).toEqual(manifest)
  })

  it('should reject a theme without either section', () => {
    const manifest: ThemeManifest = {assets: [], format: 'poffo-theme', name: 'Empty', version: 1}
    expect(() => writeThemeArchive({assets: {}, manifest})).toThrow()
  })
})
