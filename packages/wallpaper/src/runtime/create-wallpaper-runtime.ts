import {completeSurfaceChanges} from './complete-surface-changes'
import type {MonitorWallpaper, WallpaperContent, WebsiteCustomization} from '../settings/model'

export type SurfaceInteraction = 'interactive' | 'passThrough'
export interface WallpaperSurfacePort {
  readonly open: (monitorId: string, customization?: WebsiteCustomization) => Promise<string>
  readonly close: (monitorId: string, label: string) => Promise<void>
  readonly setSurface: (label: string, interaction: SurfaceInteraction) => Promise<void>
  readonly setInteraction: (label: string, interaction: SurfaceInteraction) => Promise<void>
  readonly navigate: (label: string, url: string) => Promise<void>
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
  readonly customization: string
  source: string | null
  interaction: SurfaceInteraction | null
}

const customizationKey = (code?: WebsiteCustomization): string =>
  JSON.stringify([
    code?.css ?? '',
    code?.script ?? '',
    code?.scriptStart ?? '',
    code?.scriptDom ?? '',
  ])

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
    const code =
      settings.content.mode === 'website'
        ? {
            css: settings.content.css,
            script: settings.content.script,
            scriptDom: settings.content.scriptDom,
            scriptStart: settings.content.scriptStart,
          }
        : undefined
    const customization = customizationKey(code)
    let surface = applied.get(settings.monitorId)
    if (surface !== undefined && surface.customization !== customization) {
      await close(settings.monitorId, surface)
      surface = undefined
    }
    if (surface === undefined) {
      surface = {
        customization,
        interaction: null,
        label: await surfaces.open(settings.monitorId, code),
        source: null,
      }
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
    const source = settings.content.mode === 'website' ? settings.content.url : 'local'
    if (surface.source !== source) {
      if (settings.content.mode === 'website' && settings.content.url !== null) {
        await surfaces.navigate(surface.label, settings.content.url)
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
