import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {type CodeDocument, documentSchema} from '../shared/contracts'
import type {ViewerPort} from './types'
import {useMediaUrl} from './use-media-url'

interface SMarkdownImageProps {
  path: string
  alt: string
  port?: ViewerPort
  session?: string
}
export const SMarkdownImage = (props: SMarkdownImageProps) => {
  const [document, setDocument] = createSignal<CodeDocument>()
  const [failed, setFailed] = createSignal(false)
  createEffect(() => {
    const imagePath = props.path
    const currentSession = props.session
    const currentPort = props.port
    setDocument(undefined)
    setFailed(false)
    if (currentPort === undefined || currentSession === undefined) {
      return
    }
    let disposed = false
    onCleanup(() => {
      disposed = true
    })
    currentPort
      .call('code.read', {path: imagePath, session: currentSession})
      .then((result) => {
        if (disposed) {
          return
        }
        const parsed = documentSchema.safeParse(result.structuredContent?.document)
        if (result.isError || !parsed.success || parsed.data.media?.kind !== 'image') {
          setFailed(true)
          return
        }
        setDocument(parsed.data)
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true)
        }
      })
  })
  const media = useMediaUrl({document, port: () => props.port, session: () => props.session ?? ''})
  return (
    <Show
      when={!failed() && media?.url()}
      fallback={
        <span class="text-sm text-muted">
          {props.alt || props.path}
          {failed() || media?.error() ? ' (이미지를 표시할 수 없습니다)' : ' (이미지)'}
        </span>
      }
    >
      {(url) => (
        <img
          src={url()}
          alt={props.alt}
          class="my-2 block max-w-full rounded-lg"
          onError={() => setFailed(true)}
        />
      )}
    </Show>
  )
}
