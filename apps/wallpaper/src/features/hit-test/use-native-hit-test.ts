import {invoke, isTauri} from '@tauri-apps/api/core'
import {onCleanup} from 'solid-js'
import type {HitRegion} from './types'

interface UseNativeHitTestProps {
  readonly onError: (cause: unknown) => void
}
interface PublishRegion {
  readonly kind: 'publish'
  readonly region: HitRegion
}
interface ClearRegion {
  readonly kind: 'clear'
}
type RegionUpdate = PublishRegion | ClearRegion
const clear = (region?: HitRegion) =>
  region === undefined
    ? invoke('clear_widget_hit_region')
    : invoke('clear_widget_hit_region', {passthrough: region.ready === false})
/** Publishes the latest input region, coalescing pending frames and releasing it on disposal. */
export const useNativeHitTest = (props: UseNativeHitTestProps) => {
  const native = isTauri()
  let disposed = false
  let signature: string | null = null
  let pending: RegionUpdate | null = null
  let latest: HitRegion | null = null
  let running = false
  let failed = false
  const disable = async (cause: unknown) => {
    if (!native || disposed || failed) {
      return
    }
    failed = true
    signature = latest === null ? null : String(latest.ready !== false)
    pending = latest === null ? {kind: 'clear'} : {kind: 'publish', region: latest}
    props.onError(cause)
    await flush()
  }
  const flush = async (): Promise<void> => {
    if (pending === null || disposed || running) {
      return
    }
    const current = pending
    pending = null
    running = true
    try {
      if (current.kind === 'clear') {
        await clear()
      } else if (failed) {
        await clear(current.region)
      } else {
        await invoke('set_widget_hit_region', {region: current.region})
      }
    } catch (cause) {
      if (failed) {
        props.onError(cause)
      } else {
        await disable(cause)
      }
    } finally {
      running = false
      if (disposed) {
        await clear().catch(props.onError)
      }
    }
    if (!disposed) {
      await flush()
    }
  }
  const publish = (region: HitRegion) => {
    if (!native || disposed) {
      return
    }
    const encoded = failed ? String(region.ready !== false) : JSON.stringify(region)
    if (encoded !== signature) {
      signature = encoded
      latest = region
      pending = {kind: 'publish', region}
      flush()
    }
  }
  onCleanup(() => {
    disposed = true
    pending = null
    if (native && !running) {
      clear().catch(props.onError)
    }
  })
  return {disable, publish}
}
