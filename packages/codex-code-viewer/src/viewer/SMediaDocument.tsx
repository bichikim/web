import {createSignal, Match, onCleanup, Show, Switch} from 'solid-js'
import type {CodeDocument} from '../shared/contracts'
import type {ViewerPort} from './types'
import {SImageDocument} from './SImageDocument'
import {useMediaUrl} from './use-media-url'
import {SPdfDocument} from './SPdfDocument'

interface SMediaDocumentProps {
  document: CodeDocument
  session: string
  port: ViewerPort
  onError?: (error: unknown) => void
}
export const SMediaDocument = (props: SMediaDocumentProps) => {
  const media = useMediaUrl({
    document: () => props.document,
    onError: (error) => props.onError?.(error),
    port: () => props.port,
    session: () => props.session,
  })
  const [audio, setAudio] = createSignal<HTMLAudioElement | null>(null)
  onCleanup(() => audio()?.pause())
  const [decodeError, setDecodeError] = createSignal<string>()
  const handleError = (): void => {
    const message =
      '이 파일을 표시할 수 없습니다. 파일 형식과 브라우저가 지원하는 코덱을 확인해 주세요.'
    setDecodeError(message)
    props.onError?.(new Error(message))
  }
  return (
    <div class="min-h-0 flex flex-1 flex-col overflow-auto">
      <Show
        when={media.error() ?? decodeError()}
        fallback={
          <Show
            when={media.url()}
            fallback={
              <p role="status" class="m-0 p-4 text-sm text-muted">
                미디어 불러오는 중… {media.progress()}%
              </p>
            }
          >
            {(url) => (
              <Switch>
                <Match when={props.document.media?.kind === 'pdf'}>
                  <Show when={media.blob()}>
                    {(blob) => (
                      <SPdfDocument
                        blob={blob()}
                        path={props.document.location.path}
                        onError={props.onError}
                      />
                    )}
                  </Show>
                </Match>
                <Match when={props.document.media?.kind === 'image'}>
                  <SImageDocument
                    path={props.document.location.path}
                    src={url()}
                    onError={handleError}
                  />
                </Match>
                <Match when={props.document.media?.kind === 'audio'}>
                  <div class="flex min-h-0 flex-1 items-center justify-center p-4">
                    <audio
                      aria-label={props.document.location.path}
                      class="w-full max-w-xl"
                      controls
                      preload="metadata"
                      ref={setAudio}
                      src={url()}
                      onError={handleError}
                    />
                  </div>
                </Match>
                <Match when={props.document.media?.kind === 'video'}>
                  <div class="flex min-h-0 flex-1 items-center justify-center p-4">
                    <video
                      aria-label={props.document.location.path}
                      class="max-h-full max-w-full"
                      controls
                      playsinline
                      preload="metadata"
                      src={url()}
                      onError={handleError}
                    />
                  </div>
                </Match>
              </Switch>
            )}
          </Show>
        }
      >
        {(error) => (
          <p role="status" class="m-0 p-4 text-sm text-muted">
            {error()}
          </p>
        )}
      </Show>
    </div>
  )
}
