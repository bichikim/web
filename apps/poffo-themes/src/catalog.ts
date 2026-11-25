import type {ThemeManifest} from '@winter-love/wallpaper/theme'
import {THEME_ORIGIN, THEME_PORT} from '@winter-love/wallpaper/theme-location'

interface CatalogTheme {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly covers: readonly string[]
  readonly preview: string
  readonly widgetX: number
}

export const themes: readonly CatalogTheme[] = [
  {
    covers: ['window', 'shop-window'],
    description: '창가의 오후 햇살과 애시. 사진 두 장이 차례로 바뀝니다.',
    name: '창가의 오후',
    preview: 'window',
    slug: 'window-light',
    widgetX: 0.85,
  },
  {
    covers: ['lemon-soda', 'blue-ribbon'],
    description: '레몬 소다와 파란 리본을 담은 배경 두 장, 그리고 애시.',
    name: '레몬 소다',
    preview: 'lemon-soda',
    slug: 'lemon-soda',
    widgetX: 0.78,
  },
]

export const downloadPath = (slug: string) => `/download/${slug}.poffotheme`

export const installUrl = (slug: string) => {
  const origin = import.meta.env.DEV ? `http://127.0.0.1:${THEME_PORT}` : THEME_ORIGIN
  const target = new URL(downloadPath(slug), origin)
  const link = new URL('poffo-wallpaper://theme/install')
  link.searchParams.set('url', target.href)
  return link.href
}

export const themeManifest = (theme: CatalogTheme): ThemeManifest => ({
  assets: [
    {builtinId: 'builtin:ash', id: 'ash', kind: 'puppet', name: 'Ash', source: 'builtin'},
    ...theme.covers.map((cover) => ({
      builtinId: `builtin:cover:${cover}`,
      id: cover,
      kind: 'photo' as const,
      name: cover,
      source: 'builtin' as const,
    })),
  ],
  background: {
    fit: 'cover',
    mediaIds: theme.covers,
    mode: 'album',
    order: 'sequential',
    photoSeconds: 30,
    transition: 'fade',
    videoMode: 'end',
  },
  format: 'poffo-theme',
  name: theme.name,
  version: 1,
  widgets: [{assetId: 'ash', connections: {tracking: 'cursor'}, x: theme.widgetX, y: 0.72}],
})
