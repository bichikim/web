import {type ThemeAsset, themeManifestSchema} from '@winter-love/wallpaper/theme'
import {writeThemeArchive} from '@winter-love/wallpaper/theme-archive'
import {poffoConnectionsSchema} from '@winter-love/wallpaper/settings/connections'
import type {WallpaperMonitor} from '../settings/monitors'
import {exportPlacement, findThemeWidgetMonitor} from './placement'
import {type ThemeRepositories, withThemeRepositories} from './repositories'
import type {ThemeExportSelection} from './types'

const embeddedAsset = async (
  input: {readonly id: string; readonly kind: ThemeAsset['kind']; readonly name: string},
  source: Blob | string,
) => {
  const blob =
    typeof source === 'string' ? new Blob([source], {type: 'application/octet-stream'}) : source
  return {
    asset: {...input, source: 'embedded', type: blob.type || 'application/octet-stream'},
    bytes: new Uint8Array(await blob.arrayBuffer()),
  }
}

const readAsset = async (id: string, key: string, repositories: ThemeRepositories) => {
  const [media, puppets] = await Promise.all([
    repositories.media.read(),
    repositories.settings.listPuppets(),
  ])
  const puppet = puppets.find((item) => item.id === id)
  const photo = media.items.find((item) => item.id === id)
  const item = puppet ?? photo
  if (item === undefined) {
    throw new Error('Theme asset is missing.')
  }
  const kind: ThemeAsset['kind'] = photo?.kind ?? 'puppet'
  const input = {id: key, kind, name: item.name}
  if (id.startsWith('builtin:')) {
    return {asset: {...input, builtinId: id, source: 'builtin'}, bytes: undefined}
  }
  const source =
    puppet === undefined
      ? await repositories.media.load(id)
      : await repositories.settings.loadPuppet(id)
  return embeddedAsset(input, source)
}

interface ExportThemeOptions extends ThemeExportSelection {
  /** Screen whose background and widgets will be included. */
  readonly monitor: WallpaperMonitor
  /** Connected screens used to locate existing widgets. */
  readonly monitors: readonly WallpaperMonitor[]
}

export const exportTheme = (options: ExportThemeOptions) =>
  withThemeRepositories(async (repositories) => {
    const {background, monitor, monitors, widgetIds} = options
    const selected = new Set(widgetIds)
    const library = selected.size > 0 ? await repositories.library.read() : undefined
    const widgets = library?.widgets.filter(
      (widget) =>
        selected.has(widget.id) && findThemeWidgetMonitor(widget, monitors)?.id === monitor.id,
    )
    const ids = new Set(widgets?.map((widget) => widget.assetId))
    if ((widgets?.length ?? 0) !== selected.size) {
      throw new Error('A selected widget is no longer on this screen.')
    }
    if (background?.mode === 'album') {
      background.mediaIds.forEach((id) => ids.add(id))
    }
    if (background?.mode === 'puppet' && background.assetId !== null) {
      ids.add(background.assetId)
    }
    const keys = new Map([...ids].map((id, index) => [id, `asset-${index + 1}`]))
    const payloads = await Promise.all(
      [...keys].map(([id, key]) => readAsset(id, key, repositories)),
    )
    const manifest = themeManifestSchema.parse({
      assets: payloads.map(({asset}) => asset),
      background:
        background?.mode === 'album'
          ? {...background, mediaIds: background.mediaIds.map((id) => keys.get(id))}
          : background?.mode === 'puppet' && background.assetId !== null
            ? {...background, assetId: keys.get(background.assetId)}
            : background,
      format: 'poffo-theme',
      name: options.name,
      version: 1,
      widgets: widgets?.map((widget) => ({
        ...exportPlacement(widget, options.monitor),
        assetId: keys.get(widget.assetId),
        connections: poffoConnectionsSchema.parse({...widget.speech, ...widget}),
        motionId: widget.motionId,
        size: widget.size,
      })),
    })
    const assets = Object.fromEntries(
      payloads.flatMap(({asset, bytes}) => (bytes === undefined ? [] : [[asset.id, bytes]])),
    )
    return writeThemeArchive({assets, manifest})
  })
