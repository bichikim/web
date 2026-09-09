import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {BackgroundController, BackgroundMedia} from 'src/features/background'
import {PSettingsActionButton} from '../ActionButton'

export interface ContentProps {
  readonly item: BackgroundMedia
  readonly background: BackgroundController
}
export const Content = (props: ContentProps) => {
  const [source, setSource] = createSignal<string | null>(null)
  const [failed, setFailed] = createSignal(false)
  onMount(() => {
    let disposed = false
    let url: string | null = null
    props.background
      .load(props.item.id)
      .then((blob) => {
        if (!disposed) {
          url = URL.createObjectURL(blob)
          setSource(url)
        }
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true)
        }
      })
    onCleanup(() => {
      disposed = true
      if (url !== null) {
        URL.revokeObjectURL(url)
      }
    })
  })
  return (
    <div class="flex min-w-0 items-center gap-3 rounded-control bg-surface-overlay p-3">
      <div class="h-14 w-20 flex-none overflow-hidden rounded-control bg-background">
        <Show when={source()}>
          {(url) => (
            <Show
              when={props.item.kind === 'photo'}
              fallback={
                <video
                  class="h-full w-full object-contain"
                  src={url()}
                  muted
                  playsinline
                  preload="metadata"
                  aria-hidden="true"
                  onError={() => setFailed(true)}
                />
              }
            >
              <img
                class="h-full w-full object-contain"
                src={url()}
                alt=""
                onError={() => setFailed(true)}
              />
            </Show>
          )}
        </Show>
      </div>
      <div class="min-w-0 flex-1">
        <p class="m-0 truncate text-sm font-650" title={props.item.name}>
          {props.item.name}
        </p>
        <p class="m-0 text-xs leading-5 text-muted-foreground">
          {props.item.kind === 'photo' ? m.background_photo() : m.background_video()}
        </p>
        <Show when={failed() || props.background.failedIds().includes(props.item.id)}>
          <p class="m-0 text-xs text-danger">{m.background_media_error()}</p>
        </Show>
      </div>
      <PSettingsActionButton
        disabled={props.background.busy()}
        accessibleLabel={m.background_remove({name: props.item.name})}
        onPress={() => {
          props.background.remove(props.item.id)
        }}
        icon="i-tabler-trash"
      >
        {m.background_delete()}
      </PSettingsActionButton>
    </div>
  )
}
