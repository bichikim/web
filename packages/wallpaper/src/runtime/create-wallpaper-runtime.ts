import {completeSurfaceChanges} from './complete-surface-changes'
import type {MonitorWallpaper, WallpaperContent, WebsiteCustomization} from '../settings/model'

export type SurfaceInteraction = 'interactive' | 'passThrough'
export interface WallpaperSurfacePort {
  readonly open: (monitorId: string) => Promise<string>
  readonly close: (monitorId: string, label: string) => Promise<void>
  readonly setSurface: (label: string, interaction: SurfaceInteraction) => Promise<void>
  readonly setInteraction: (label: string, interaction: SurfaceInteraction) => Promise<void>
  readonly navigate: (
    label: string,
    url: string,
    customization?: WebsiteCustomization,
  ) => Promise<void>
  readonly restore: (label: string) => Promise<void>
}
export interface WallpaperRuntimeSnapshot {
  readonly connectedIds: readonly string[]
  readonly settings: readonly MonitorWallpaper[]
}
export interface WallpaperRuntime {
  readonly synchronize: (snapshot: WallpaperRuntimeSnapshot) => Promise<void>
  readonly dispose: () => Promise<void>
}
interface AppliedSurface {
  readonly label: string
  source: string | null
  interaction: SurfaceInteraction | null
}

/** Reports whether the selected content can be displayed without additional user input. */
export const hasWallpaperContent = (content: WallpaperContent): boolean => {
  switch (content.mode) {
    case 'website':
      return content.url !== null
    case 'puppet':
      return content.assetId !== null
    case 'album':
      return content.mediaIds.length > 0
    default: {
      const unsupported: never = content
      return unsupported
    }
  }
}

/** Owns native wallpaper windows and serializes source changes; disposal closes only its own surfaces. */
export const createWallpaperRuntime = (surfaces: WallpaperSurfacePort): WallpaperRuntime => {
  const applied = new Map<string, AppliedSurface>()
  let pending = Promise.resolve()
  let disposed = false
  const close = async (monitorId: string, surface: AppliedSurface) => {
    await surfaces.close(monitorId, surface.label)
    applied.delete(monitorId)
  }
  const apply = async (settings: MonitorWallpaper) => {
    let surface = applied.get(settings.monitorId)
    if (surface === undefined) {
      surface = {interaction: null, label: await surfaces.open(settings.monitorId), source: null}
      applied.set(settings.monitorId, surface)
    }
    const interaction = settings.interaction.activation === 'always' ? 'interactive' : 'passThrough'
    if (surface.interaction === null) {
      await surfaces.setSurface(surface.label, interaction)
      surface.interaction = interaction
    } else if (surface.interaction !== interaction) {
      await surfaces.setInteraction(surface.label, interaction)
      surface.interaction = interaction
    }
    const source =
      settings.content.mode === 'website'
        ? JSON.stringify([
            settings.content.url,
            settings.content.css ?? '',
            settings.content.script ?? '',
          ])
        : 'local'
    if (surface.source !== source) {
      if (settings.content.mode === 'website' && settings.content.url !== null) {
        await surfaces.navigate(surface.label, settings.content.url, {
          css: settings.content.css,
          script: settings.content.script,
        })
      } else if (surface.source !== null) {
        await surfaces.restore(surface.label)
      }
      surface.source = source
    }
  }
  const synchronize = (snapshot: WallpaperRuntimeSnapshot) => {
    const operation = pending.then(async () => {
      if (disposed) {
        return
      }
      const active = snapshot.settings.filter(
        (settings) =>
          snapshot.connectedIds.includes(settings.monitorId) &&
          hasWallpaperContent(settings.content),
      )
      const removed = Array.from(applied).filter(
        ([id]) => !active.some((settings) => settings.monitorId === id),
      )
      await completeSurfaceChanges(removed.map(([id, surface]) => close(id, surface)))
      await completeSurfaceChanges(active.map(apply))
    })
    pending = operation.catch(() => undefined)
    return operation
  }
  return {
    async dispose() {
      disposed = true
      await pending
      await completeSurfaceChanges(Array.from(applied).map(([id, surface]) => close(id, surface)))
    },
    synchronize,
  }
}
