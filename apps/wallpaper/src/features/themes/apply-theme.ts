import type {ThemeArchive, ThemeAsset} from '@winter-love/wallpaper/theme'
import {
  createMonitorWallpaper,
  type MonitorWallpaper,
  type WallpaperContent,
} from '@winter-love/wallpaper/settings/model'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {mergeConnections} from '@winter-love/wallpaper/settings/merge-connections'
import {builtinConnectionProfile} from '../connection-profiles/builtin-profile'
import {readPuppetFile} from '../settings/read-puppet-file'
import type {WallpaperMonitor} from '../settings/monitors'
import {findThemeWidgetMonitor, importPlacement} from './placement'
import {type ThemeRepositories, withThemeRepositories} from './repositories'
import catalog from '../../../builtin-assets.json'

const builtinAsset = (asset: Extract<ThemeAsset, {source: 'builtin'}>) => {
  const found =
    asset.kind === 'puppet'
      ? catalog.puppets.some((item) => item.id === asset.builtinId)
      : catalog.media.some((item) => item.id === asset.builtinId && item.kind === asset.kind)
  if (!found) {
    throw new Error('This Wallpaper version is missing a theme asset.')
  }
  return asset.builtinId
}

const prepareAsset = async (asset: ThemeAsset, bytes: Uint8Array | undefined) => {
  if (asset.source === 'builtin') {
    const id = builtinAsset(asset)
    return () => Promise.resolve(id)
  }
  if (bytes === undefined) {
    throw new Error('Missing theme asset.')
  }
  const file = new File([new Uint8Array(bytes)], asset.name, {type: asset.type})
  if (asset.kind === 'puppet') {
    const source = await readPuppetFile(file)
    return async ({settings}: ThemeRepositories) =>
      (await settings.addPuppet(asset.name, source)).id
  }
  const {kind} = asset
  if (!file.type.startsWith(kind === 'photo' ? 'image/' : 'video/')) {
    throw new Error('The theme has an invalid media type.')
  }
  return ({media}: ThemeRepositories) => media.importMedia(file, kind)
}

const localBackground = (
  background: WallpaperContent,
  resolveAsset: (id: string) => string,
): WallpaperContent => {
  switch (background.mode) {
    case 'album':
      return {...background, mediaIds: background.mediaIds.map(resolveAsset)}
    case 'puppet':
      return {
        ...background,
        assetId: background.assetId === null ? null : resolveAsset(background.assetId),
        tracking: background.tracking?.startsWith('camera') ? 'cursor' : background.tracking,
      }
    case 'website':
      return {mode: 'website', url: background.url}
  }
}

interface ApplyThemeOptions {
  /** Validated theme selected in the import preview. */
  readonly archive: ThemeArchive
  /** Display selected as the target for the theme. */
  readonly monitor: WallpaperMonitor
  /** Connected displays used to identify which existing widget rows to replace. */
  readonly monitors: readonly WallpaperMonitor[]
}

interface LayoutChanges {
  /** Before and after snapshots when the theme includes a background. */
  readonly background?: LayoutChange<MonitorWallpaper>
  /** Before and after rows when the theme includes widgets. */
  readonly widgets?: LayoutChange<readonly PoffoWidget[]>
}

interface LayoutChange<Value> {
  readonly after: Value
  readonly before: Value
}

const reverse = <Value>(change: LayoutChange<Value> | undefined): LayoutChange<Value> | undefined =>
  change === undefined ? undefined : {after: change.before, before: change.after}

const writeLayout = async (repositories: ThemeRepositories, options: LayoutChanges) => {
  const {background, widgets} = options
  if (background !== undefined) {
    await repositories.settings.save(background.after)
  }
  if (widgets === undefined) {
    return
  }
  try {
    await repositories.library.replaceWidgets(
      widgets.before.map((widget) => widget.id),
      widgets.after,
    )
  } catch (cause) {
    if (background !== undefined) {
      await repositories.settings.save(background.before)
    }
    throw cause
  }
}

const importWidget = (
  entry: NonNullable<ThemeArchive['manifest']['widgets']>[number],
  monitor: WallpaperMonitor,
  assetId: string,
): PoffoWidget => {
  const widget = {
    ...importPlacement(entry, monitor),
    assetId,
    id: crypto.randomUUID(),
    motionId: entry.motionId,
    size: entry.size,
  }
  const defaults = builtinConnectionProfile(assetId)?.connections ?? {}
  const connections = {...defaults, ...entry.connections}
  const tracking = connections.tracking?.startsWith('camera') ? 'cursor' : connections.tracking
  return mergeConnections({
    connections: {...connections, lipsync: undefined, tracking},
    mode: 'replace',
    widget,
  })
}

export const applyTheme = (options: ApplyThemeOptions) =>
  withThemeRepositories(async (repositories) => {
    const {archive, monitor, monitors} = options
    const prepared = await Promise.all(
      archive.manifest.assets.map((asset) => prepareAsset(asset, archive.assets[asset.id])),
    )
    const installed = new Map(
      await Promise.all(
        prepared.map(
          async (store, index) =>
            [archive.manifest.assets[index]!.id, await store(repositories)] as const,
        ),
      ),
    )
    const resolveAsset = (id: string) => {
      const asset = installed.get(id)
      if (asset === undefined) {
        throw new Error('Missing installed theme asset.')
      }
      return asset
    }
    const {background, widgets} = archive.manifest
    const [screenSettings, library] = await Promise.all([
      background === undefined ? undefined : repositories.settings.read(),
      widgets === undefined ? undefined : repositories.library.read(),
    ])
    const before =
      screenSettings?.find((entry) => entry.monitorId === monitor.id) ??
      createMonitorWallpaper(monitor.id)
    const previous = library?.widgets.filter(
      (widget) => findThemeWidgetMonitor(widget, monitors)?.id === monitor.id,
    )
    const changes: LayoutChanges = {
      background:
        background === undefined
          ? undefined
          : {after: {...before, content: localBackground(background, resolveAsset)}, before},
      widgets:
        widgets === undefined
          ? undefined
          : {
              after: widgets.map((entry) =>
                importWidget(entry, monitor, resolveAsset(entry.assetId)),
              ),
              before: previous ?? [],
            },
    }
    await writeLayout(repositories, changes)
    return () =>
      withThemeRepositories((restored) =>
        writeLayout(restored, {
          background: reverse(changes.background),
          widgets: reverse(changes.widgets),
        }),
      )
  })
