import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import type {PreparedPuppetDocument} from '@winter-love/puppet/player'
import {SAMPLE_PUPPET_ID} from './constants'

interface UsePuppetDocumentProps {
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string | Blob>
  readonly onError: (cause: unknown) => void
}
interface PreparedAsset {
  readonly document: PreparedPuppetDocument
  readonly source: string | Blob | null
}
export interface PuppetDocumentSource {
  /** Latest prepared document, retained while a replacement loads. */
  readonly document: Accessor<PreparedPuppetDocument | null>
  /** Whether the requested asset has finished preparation; failed replacements stay false. */
  readonly ready: Accessor<boolean>
}
const CACHE_SIZE = 2

/** Retains the current document while preparing the latest asset and reuses identical sources. */
export const usePuppetDocument = (props: UsePuppetDocumentProps): PuppetDocumentSource => {
  const asset = createMemo(props.assetId)
  const [document, setDocument] = createSignal<PreparedPuppetDocument | null>(null)
  const [ready, setReady] = createSignal(false)
  const cache = new Map<string, PreparedAsset>()
  let current: PreparedAsset | null = null
  const commit = (id: string, value: PreparedAsset) => {
    cache.delete(id)
    cache.set(id, value)
    const oldest = cache.keys().next().value
    if (cache.size > CACHE_SIZE && oldest !== undefined) {
      cache.delete(oldest)
    }
    current = value
    setDocument(value.document)
    setReady(true)
  }
  createEffect(() => {
    const id = asset()
    setReady(false)
    if (id === null) {
      setDocument(null)
      return
    }
    const cached = cache.get(id)
    if (cached !== undefined) {
      commit(id, cached)
      return
    }
    const cancellation = new AbortController()
    onCleanup(() => cancellation.abort())
    const prepare = async () => {
      const {createDemoDocument, preparePuppetDocument} = await import('@winter-love/puppet/player')
      if (cancellation.signal.aborted) {
        return
      }
      const source = id === SAMPLE_PUPPET_ID ? null : await props.load(id)
      if (cancellation.signal.aborted) {
        return
      }
      if (source !== null && current?.source === source) {
        commit(id, current)
        return
      }
      const result = await preparePuppetDocument(
        source === null
          ? {document: createDemoDocument(), signal: cancellation.signal}
          : {signal: cancellation.signal, source},
      )
      if (cancellation.signal.aborted) {
        return
      }
      if (!result.ok) {
        throw new Error('Wallpaper Poffo document is invalid')
      }
      commit(id, {document: result.document, source})
    }
    prepare().catch((cause: unknown) => {
      if (!cancellation.signal.aborted) {
        props.onError(cause)
      }
    })
  })
  return {document, ready}
}
