import {completeSurfaceChanges} from '@winter-love/wallpaper/runtime/complete-surface-changes'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'

interface WidgetSurfacePort {
  readonly open: (widget: PoffoWidget) => Promise<void>
  readonly close: (id: string) => Promise<void>
  readonly configure?: (widget: PoffoWidget) => Promise<void>
}

/** Owns independent Poffo windows and serializes their creation and removal. */
export const createWidgetRuntime = (surfaces: WidgetSurfacePort) => {
  const applied = new Set<string>()
  const configured = new Map<string, string>()
  let pending = Promise.resolve()
  let disposed = false
  const close = async (id: string) => {
    await surfaces.close(id)
    applied.delete(id)
    configured.delete(id)
  }
  return {
    async dispose() {
      disposed = true
      await pending
      await Promise.all(Array.from(applied, close))
    },
    synchronize(widgets: readonly PoffoWidget[]) {
      const operation = pending.then(async () => {
        if (disposed) {
          return
        }
        await completeSurfaceChanges(
          Array.from(applied)
            .filter((id) => !widgets.some((widget) => widget.id === id))
            .map(close),
        )
        await completeSurfaceChanges(
          widgets
            .filter((widget) => !applied.has(widget.id))
            .map(async (widget) => {
              await surfaces.open(widget)
              applied.add(widget.id)
            }),
        )
        await completeSurfaceChanges(
          widgets
            .filter((widget) => configured.get(widget.id) !== JSON.stringify(widget.speech ?? null))
            .map(async (widget) => {
              await surfaces.configure?.(widget)
              configured.set(widget.id, JSON.stringify(widget.speech ?? null))
            }),
        )
      })
      pending = operation.catch(() => undefined)
      return operation
    },
  }
}
