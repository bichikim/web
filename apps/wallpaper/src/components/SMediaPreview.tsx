import {Match, Show, Switch} from 'solid-js'
import type {BackgroundMedia, MediaFit} from '@winter-love/wallpaper/model'
import {useMediaUrl} from '../features/settings/use-media-url'
import {SVideoPreview} from './SVideoPreview'

interface SMediaPreviewProps {
  /** Selected photo or video; omitted to show the empty selection prompt. */
  readonly item?: BackgroundMedia | null
  /** Loads the selected media from the caller-owned library. */
  readonly load: (id: string) => Promise<Blob>
  /** Preview sizing; omitted to show the whole media. */
  readonly fit?: MediaFit
}

export const SMediaPreview = (props: SMediaPreviewProps) => {
  const media = useMediaUrl({id: () => props.item?.id ?? null, load: (id) => props.load(id)})
  const contain = () => props.fit !== 'cover'
  return (
    <Show
      when={media.url()}
      fallback={
        <p class="m-0 px-5 text-center text-sm text-stone-600">
          {media.failed() ? '미리보기를 불러올 수 없어요.' : '사진·동영상을 추가해 주세요.'}
        </p>
      }
    >
      {(url) => (
        <Switch>
          <Match when={props.item?.kind === 'photo'}>
            <img
              src={url()}
              alt={props.item?.name ?? ''}
              class="absolute inset-0 h-full w-full"
              classList={{'object-contain': contain(), 'object-cover': !contain()}}
            />
          </Match>
          <Match when={props.item?.kind === 'video'}>
            <SVideoPreview src={url()} label={props.item?.name} autoplay contain={contain()} />
          </Match>
        </Switch>
      )}
    </Show>
  )
}
