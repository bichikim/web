import {invoke, isTauri} from '@tauri-apps/api/core'
import {onCleanup} from 'solid-js'
import type {HitRegion} from './types'

interface UseNativeHitTestProps {
  readonly onError: (cause: unknown) => void
}
/** Publishes the latest input region, coalescing pending frames and releasing it on disposal. */
export const useNativeHitTest = (props: UseNativeHitTestProps) => {
  const native = isTauri()
  let disposed = false
  let signature: string | null = null
  let pending: HitRegion | null = null
  let running = false
  let failed = false
  const disable = async (cause: unknown) => {
    failed = true
    pending = null
    signature = null
    props.onError(cause)
    await invoke('clear_widget_hit_region').catch(props.onError)
  }
  const flush = async (): Promise<void> => {
    if (pending === null || disposed || running) {
      return
    }
    const current = pending
    pending = null
    running = true
    try {
      await invoke('set_widget_hit_region', {region: current})
    } catch (cause) {
      await disable(cause)
    } finally {
      running = false
      if (disposed) {
        await invoke('clear_widget_hit_region').catch(props.onError)
      }
    }
    if (!disposed && !failed) {
      await flush()
    }
  }
  const publish = (region: HitRegion) => {
    if (!native || disposed || failed) {
      return
    }
    const encoded = JSON.stringify(region)
    if (encoded !== signature) {
      signature = encoded
      pending = region
      flush()
    }
  }
  onCleanup(() => {
    disposed = true
    pending = null
    if (native && !running) {
      invoke('clear_widget_hit_region').catch(props.onError)
    }
  })
  return {disable, publish}
}
